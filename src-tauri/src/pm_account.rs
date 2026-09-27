//! PowerMeter account: Discord login and combat log upload (R2 server).
//!
//! The webview never talks to the server: every request goes through these
//! commands, so no HTTP capability is needed and the server URL stays a setting.
//!
//! Login follows the loopback pattern for desktop apps (RFC 8252): we listen on
//! 127.0.0.1, the browser does the Discord OAuth on the server, and the server
//! redirects back to our port with a one-time code that we trade for a token.
//! A code sent to someone else's machine is useless to whoever started the login.

use std::time::Duration;

use serde_json::{json, Value};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

use crate::AppState;

const SERVER_URL_KEY: &str = "pm.serverUrl";
const TOKEN_KEY: &str = "pm.token";
const USER_KEY: &str = "pm.user";
const DEFAULT_SERVER_URL: &str = "https://powermeter.letrionlabs.it";
const LOGIN_TIMEOUT: Duration = Duration::from_secs(300);

fn server_url(state: &AppState) -> String {
    state
        .settings
        .get(SERVER_URL_KEY)
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| DEFAULT_SERVER_URL.to_string())
        .trim_end_matches('/')
        .to_string()
}

/// Reads the server's JSON reply, turning `{error}` bodies into the error text.
async fn read_json(res: reqwest::Response) -> Result<Value, String> {
    let status = res.status();
    let body: Value = serde_json::from_str(&res.text().await.map_err(|e| e.to_string())?)
        .unwrap_or(Value::Null);
    if status.is_success() {
        return Ok(body);
    }
    let msg = body["error"].as_str().map(str::to_string).unwrap_or_else(|| status.to_string());
    Err(if status == reqwest::StatusCode::UNAUTHORIZED { "unauthorized".into() } else { msg })
}

async fn call(method: reqwest::Method, url: &str, token: Option<&str>, body: Option<&Value>) -> Result<Value, String> {
    let mut req = reqwest::Client::new().request(method, url);
    if let Some(body) = body {
        req = req.header("Content-Type", "application/json").body(body.to_string());
    }
    if let Some(token) = token {
        req = req.bearer_auth(token);
    }
    read_json(req.send().await.map_err(|e| e.to_string())?).await
}

async fn post_json(url: &str, token: Option<&str>, body: &Value) -> Result<Value, String> {
    call(reqwest::Method::POST, url, token, Some(body)).await
}

/// A request with the saved session. A revoked session is dropped so the UI offers login again.
async fn authed(state: &AppState, method: reqwest::Method, path: &str, body: Option<&Value>) -> Result<Value, String> {
    let token = state.settings.get(TOKEN_KEY).ok_or("not signed in")?;
    let res = call(method, &format!("{}{path}", server_url(state)), Some(&token), body).await;
    if matches!(&res, Err(e) if e == "unauthorized") {
        state.settings.remove(TOKEN_KEY);
        state.settings.remove(USER_KEY);
    }
    res
}

/// Log ids are 10 base62 characters; checked here so an id can never change the request path.
fn log_path(id: &str) -> Result<String, String> {
    if id.len() == 10 && id.chars().all(|c| c.is_ascii_alphanumeric()) {
        Ok(format!("/api/logs/{id}"))
    } else {
        Err("invalid log id".into())
    }
}

/// Waits for the browser to hit `/callback?code=…` (or `?error=…`) and answers
/// with a page telling the user to go back to PowerMeter.
async fn wait_for_code(listener: TcpListener) -> Result<String, String> {
    loop {
        let (mut stream, _) = listener.accept().await.map_err(|e| e.to_string())?;
        let mut buf = vec![0u8; 4096];
        let n = stream.read(&mut buf).await.unwrap_or(0);
        let head = String::from_utf8_lossy(&buf[..n]);
        let path = head.split_whitespace().nth(1).unwrap_or("");
        let Some(query) = path.strip_prefix("/callback?") else {
            // Favicon and friends: not ours.
            let _ = stream.write_all(b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n").await;
            continue;
        };
        let param = |name: &str| {
            query.split('&').find_map(|kv| {
                let (k, v) = kv.split_once('=')?;
                (k == name).then(|| urlencoding::decode(v).map(|s| s.into_owned()).unwrap_or_default())
            })
        };
        let result = match (param("code"), param("error")) {
            (Some(code), _) if !code.is_empty() => Ok(code),
            (_, Some(err)) => Err(err),
            _ => Err("missing code".to_string()),
        };
        let page = if result.is_ok() {
            "PowerMeter: login complete. You can close this tab."
        } else {
            "PowerMeter: login failed. Close this tab and try again."
        };
        let html = format!(
            "<!doctype html><meta charset=utf-8><title>PowerMeter</title>\
             <body style=\"background:#0b0b0d;color:#eee;font:16px system-ui;display:grid;place-items:center;height:90vh\">{page}"
        );
        let _ = stream
            .write_all(format!(
                "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{html}",
                html.len()
            ).as_bytes())
            .await;
        return result;
    }
}

/// The signed-in Discord user (`{id, name, avatarUrl}`), or null.
#[tauri::command]
pub fn pm_account(state: tauri::State<'_, AppState>) -> Option<Value> {
    state.settings.get(USER_KEY).and_then(|s| serde_json::from_str(&s).ok())
}

/// Opens Discord login in the browser and resolves with the user once the
/// browser comes back. Times out after 5 minutes.
#[tauri::command]
pub async fn pm_login(state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let base = server_url(&state);
    let listener = TcpListener::bind("127.0.0.1:0").await.map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    tauri_plugin_opener::open_url(format!("{base}/auth/discord/start?port={port}"), None::<&str>)
        .map_err(|e| e.to_string())?;

    let code = tokio::time::timeout(LOGIN_TIMEOUT, wait_for_code(listener))
        .await
        .map_err(|_| "login timed out".to_string())??;
    let res = post_json(&format!("{base}/api/auth/exchange"), None, &json!({ "code": code })).await?;
    let token = res["token"].as_str().ok_or("no token in server reply")?;
    state.settings.set(TOKEN_KEY, token);
    state.settings.set(USER_KEY, &res["user"].to_string());
    Ok(res["user"].clone())
}

/// Signs out here and on the server (best effort: the local token goes anyway).
#[tauri::command]
pub async fn pm_logout(state: tauri::State<'_, AppState>) -> Result<(), String> {
    if let Some(token) = state.settings.get(TOKEN_KEY) {
        let _ = post_json(&format!("{}/api/auth/logout", server_url(&state)), Some(&token), &json!({})).await;
    }
    state.settings.remove(TOKEN_KEY);
    state.settings.remove(USER_KEY);
    Ok(())
}

/// Uploads a saved fight (the latest one when `id` is omitted) and returns
/// `{id, url}` for sharing. Other players' names are already masked on save.
#[tauri::command]
pub async fn upload_combat_log(
    state: tauri::State<'_, AppState>,
    id: Option<String>,
    visibility: Option<String>,
    // A fight record from a file exported by Fight history, uploaded as is.
    fight: Option<Value>,
) -> Result<Value, String> {
    // Checked first: no point saving or loading a fight for a signed-out user.
    state.settings.get(TOKEN_KEY).ok_or("not signed in")?;
    let fight = match (fight, id) {
        (Some(fight), _) => fight,
        (None, Some(id)) => serde_json::to_value(state.fight_history.load_fight(&id)?).map_err(|e| e.to_string())?,
        (None, None) => {
            // The meter's "fight over" card: the fight that just ended reaches disk only with
            // the 30 s auto-save, so save it now (same id: the auto-save later overwrites it).
            let records = state.dps_calculator.lock().snapshot_boss_fights_force();
            for record in &records {
                state.fight_history.save_fight(record)?;
            }
            let last = state
                .fight_history
                .list_fights()
                .into_iter()
                // The card is for boss/train fights; PVE and PvP sessions are saved too.
                .filter(|f| !f.is_live && (f.mode == "boss" || f.mode == "train"))
                .max_by_key(|f| f.start_time_ms)
                .ok_or("no saved fight to upload")?;
            // Not an older fight in its place: the one that ended is what the user means.
            if last.is_train {
                return Err("training fights are not uploaded".into());
            }
            serde_json::to_value(state.fight_history.load_fight(&last.id)?).map_err(|e| e.to_string())?
        }
    };
    // Local history id, so the UI can mark the fight uploaded (pm.uploadedFights).
    let fight_id = fight["id"].clone();
    // Onboarding's region (pm.region) feeds the class stats' region filter.
    let region = match state.settings.get("pm.region").as_deref() {
        Some("global-eu") => json!("EU"),
        Some("us-na") => json!("NA"),
        _ => Value::Null,
    };
    let body = json!({ "fight": fight, "visibility": visibility.unwrap_or_else(|| "unlisted".into()), "region": region });
    authed(&state, reqwest::Method::POST, "/api/logs", Some(&body)).await.map(|mut v| {
        v["fightId"] = fight_id;
        v
    })
}

/// The signed-in user's uploaded logs (`{logs:[…]}`, newest first).
#[tauri::command]
pub async fn pm_my_logs(state: tauri::State<'_, AppState>) -> Result<Value, String> {
    authed(&state, reqwest::Method::GET, "/api/logs/mine", None).await
}

/// Changes one of the user's logs to public / unlisted / private.
#[tauri::command]
pub async fn pm_set_log_visibility(state: tauri::State<'_, AppState>, id: String, visibility: String) -> Result<Value, String> {
    authed(&state, reqwest::Method::PATCH, &log_path(&id)?, Some(&json!({ "visibility": visibility }))).await
}

/// Deletes one of the user's logs from the server.
#[tauri::command]
pub async fn pm_delete_log(state: tauri::State<'_, AppState>, id: String) -> Result<(), String> {
    authed(&state, reqwest::Method::DELETE, &log_path(&id)?, None).await.map(|_| ())
}

/// Class stats over the community's public logs; no account needed.
#[tauri::command]
pub async fn pm_class_stats(
    state: tauri::State<'_, AppState>,
    boss: Option<i64>,
    region: Option<String>,
    period: Option<String>,
) -> Result<Value, String> {
    let mut url = reqwest::Url::parse(&format!("{}/api/stats/classes", server_url(&state))).map_err(|e| e.to_string())?;
    {
        let mut qs = url.query_pairs_mut();
        if let Some(boss) = boss {
            qs.append_pair("boss", &boss.to_string());
        }
        if let Some(region) = region.filter(|r| !r.is_empty()) {
            qs.append_pair("region", &region);
        }
        if let Some(period) = period {
            qs.append_pair("period", &period);
        }
    }
    call(reqwest::Method::GET, url.as_str(), None, None).await
}
