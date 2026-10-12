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

use base64::Engine;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde_json::{json, Value};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

use tauri::{Emitter, Manager};

use crate::entity::fight_record::FightRecord;
use crate::AppState;

const SERVER_URL_KEY: &str = "pm.serverUrl";
const TOKEN_KEY: &str = "pm.token";
const USER_KEY: &str = "pm.user";
const DEFAULT_SERVER_URL: &str = "https://powermeter.letrionlabs.it";
const LOGIN_TIMEOUT: Duration = Duration::from_secs(300);
const PERMIT_KEY: &str = "pm.permit";
const ENTITLEMENT_KEY: &str = "pm.entitlement";
/// "false" turns off the automatic upload of boss kills (on by default).
const AUTO_UPLOAD_KEY: &str = "pm.autoUpload";
/// Fights uploaded automatically, `{fightId: url}` as JSON: the same shape as the UI's localStorage
/// `pm.uploadedFights`, so the UI merges the two to mark them uploaded.
const AUTO_UPLOADED_KEY: &str = "pm.autoUploaded";
/// Only the newest fights stay in the registry (by the start time in their id): settings.json stays small.
const AUTO_UPLOADED_MAX: usize = 500;
/// A boss fight is over after this long without damage (the meter's own rule, dps_calculator.rs).
const FIGHT_OVER_MS: i64 = 10_000;
/// Wait before each upload attempt: the first right away, then a simple back-off.
const AUTO_UPLOAD_WAITS_SECS: [u64; 4] = [0, 60, 300, 900];
/// Public half of the server's ENTITLEMENT_KEY: only the server can sign a permit this accepts.
const PERMIT_PUBLIC_KEY: &str = "d6ebo/vZAEGGK9R5qx+QSe6j5T/FAp67lRO3XshEzTE=";

pub(crate) fn server_url(state: &AppState) -> String {
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
    // The server keeps each account's app version for the admin panel.
    let mut req = reqwest::Client::new()
        .request(method, url)
        .header("X-PM-Version", crate::entity::fight_record::APP_VERSION);
    if let Some(body) = body {
        req = req.header("Content-Type", "application/json").body(body.to_string());
    }
    if let Some(token) = token {
        req = req.bearer_auth(token);
    }
    if let Some(device) = device_id() {
        req = req.header("X-PM-Device", device);
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

/// Payload of a permit (`base64url(json).base64url(ed25519)`) if the server signed it, expired or not.
/// The game data manifest uses the same key and format (gamedata.rs tells the two apart by `typ`).
pub(crate) fn permit_payload(permit: &str) -> Option<Value> {
    let (payload, sig) = permit.split_once('.')?;
    let payload = URL_SAFE_NO_PAD.decode(payload).ok()?;
    let sig = Signature::from_slice(&URL_SAFE_NO_PAD.decode(sig).ok()?).ok()?;
    let key: [u8; 32] = base64::engine::general_purpose::STANDARD.decode(PERMIT_PUBLIC_KEY).ok()?.try_into().ok()?;
    VerifyingKey::from_bytes(&key).ok()?.verify(&payload, &sig).ok()?;
    serde_json::from_slice(&payload).ok()
}

/// This PC's id for the server: hex SHA-256 of Windows' MachineGuid (it survives reinstalling the
/// app), salted so it cannot be matched with other software. None if the registry can't be read.
fn device_id() -> Option<&'static str> {
    use sha2::{Digest, Sha256};
    static ID: std::sync::OnceLock<Option<String>> = std::sync::OnceLock::new();
    ID.get_or_init(|| {
        let guid = machine_guid()?;
        let hash = Sha256::digest(format!("PowerMeter device:{guid}"));
        Some(hash.iter().map(|b| format!("{b:02x}")).collect())
    })
    .as_deref()
}

#[cfg(windows)]
fn machine_guid() -> Option<String> {
    use windows::Win32::System::Registry::{HKEY_LOCAL_MACHINE, RRF_RT_REG_SZ, RRF_SUBKEY_WOW6464KEY, RegGetValueW};
    use windows::core::w;
    let mut buf = [0u16; 64];
    let mut len = (buf.len() * 2) as u32;
    unsafe {
        RegGetValueW(
            HKEY_LOCAL_MACHINE,
            w!("SOFTWARE\\Microsoft\\Cryptography"),
            w!("MachineGuid"),
            RRF_RT_REG_SZ | RRF_SUBKEY_WOW6464KEY,
            None,
            Some(buf.as_mut_ptr().cast()),
            Some(&mut len),
        )
    }
    .ok()
    .ok()?;
    // len is in bytes and counts the terminating NUL.
    let guid = String::from_utf16_lossy(&buf[..(len as usize / 2).saturating_sub(1)]);
    (!guid.is_empty()).then_some(guid)
}

#[cfg(not(windows))]
fn machine_guid() -> Option<String> {
    std::fs::read_to_string("/etc/machine-id").ok().map(|s| s.trim().to_string())
}

/// The permit is only good on the PC it was issued to: a settings folder copied to another PC stays free.
fn permit_for_this_pc(permit: &str) -> Option<Value> {
    permit_payload(permit).filter(|p| p["dev"].as_str() == device_id())
}

fn now_ms() -> f64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_or(0.0, |d| d.as_millis() as f64)
}

/// Log ids are 10 base62 characters; checked here so an id can never change the request path.
fn log_path(id: &str) -> Result<String, String> {
    if id.len() == 10 && id.chars().all(|c| c.is_ascii_alphanumeric()) {
        Ok(format!("/api/logs/{id}"))
    } else {
        Err("invalid log id".into())
    }
}

/// The dashboard's `account.suspended` text in the meter's language (en when unset).
fn suspended_text(state: &AppState) -> Option<String> {
    let dict = match state.settings.get("dpsMeter.language").as_deref() {
        Some("de") => include_str!("../../src/data/i18n/pm/de.json"),
        Some("es") => include_str!("../../src/data/i18n/pm/es.json"),
        Some("fr") => include_str!("../../src/data/i18n/pm/fr.json"),
        Some("it") => include_str!("../../src/data/i18n/pm/it.json"),
        Some("ja") => include_str!("../../src/data/i18n/pm/ja.json"),
        Some("ko") => include_str!("../../src/data/i18n/pm/ko.json"),
        Some("pt") => include_str!("../../src/data/i18n/pm/pt.json"),
        Some("ru") => include_str!("../../src/data/i18n/pm/ru.json"),
        Some("zh-Hans") => include_str!("../../src/data/i18n/pm/zh-Hans.json"),
        Some("zh-Hant") => include_str!("../../src/data/i18n/pm/zh-Hant.json"),
        _ => include_str!("../../src/data/i18n/pm/en.json"),
    };
    serde_json::from_str::<Value>(dict).ok()?["account.suspended"].as_str().map(str::to_string)
}

/// Waits for the browser to hit `/callback?code=…` (or `?error=…`) and answers
/// with a page telling the user to go back to PowerMeter (`suspended`: the text for a suspended account).
async fn wait_for_code(listener: TcpListener, suspended: Option<String>) -> Result<String, String> {
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
        let page = match (&result, &suspended) {
            (Ok(_), _) => "PowerMeter: login complete. You can close this tab.",
            (Err(e), Some(text)) if e == "account_suspended" => text,
            (Err(_), _) => "PowerMeter: login failed. Close this tab and try again.",
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

    let code = tokio::time::timeout(LOGIN_TIMEOUT, wait_for_code(listener, suspended_text(&state)))
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
/// `{id, url}` for sharing. Fights saved up to 0.4.3 have other players' names masked.
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
    let body = log_body(&state, fight, &visibility.unwrap_or_else(|| "unlisted".into()));
    authed(&state, reqwest::Method::POST, "/api/logs", Some(&body)).await.map(|mut v| {
        v["fightId"] = fight_id;
        v
    })
}

/// Body of POST /api/logs. Onboarding's region (pm.region) feeds the class stats' region filter.
fn log_body(state: &AppState, fight: Value, visibility: &str) -> Value {
    let region = match state.settings.get("pm.region").as_deref() {
        Some("global-eu") => json!("EU"),
        Some("us-na") => json!("NA"),
        _ => Value::Null,
    };
    let uploader = uploader_name(state, &fight);
    json!({ "fight": fight, "visibility": visibility, "region": region, "uploader": uploader })
}

/// The uploader's character in the fight (the local player's in-game name), shown on the log
/// page in place of the Discord account. None when the local player is not among its actors.
fn uploader_name(state: &AppState, fight: &Value) -> Option<String> {
    let local = state.data_storage.local_player_id()? as i32;
    let name = state.data_storage.get_nicknames().get(&local)?.trim().to_string();
    let in_fight = fight["actors"].as_array()?.iter().any(|a| a["nickname"].as_str() == Some(name.as_str()));
    (in_fight && !name.is_empty()).then_some(name)
}

/// Fights being uploaded automatically right now; its lock also guards the registry's read-modify-write.
static AUTO_UPLOADING: std::sync::Mutex<Vec<String>> = std::sync::Mutex::new(Vec::new());

/// A boss kill whose fight is over: what the auto-save loop uploads. Periodic snapshots of a fight
/// still going (or of a dead boss still inside the idle window) wait for the final one.
fn is_finished_kill(record: &FightRecord, now_ms: i64) -> bool {
    record.mode == "boss" && !record.is_train && record.killed == Some(true)
        && now_ms - (record.start_time_ms + record.duration_ms) >= FIGHT_OVER_MS
}

fn auto_uploaded(state: &AppState) -> serde_json::Map<String, Value> {
    state.settings.get(AUTO_UPLOADED_KEY).and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default()
}

/// Start time in a fight id (`auto_<target>_<start ms>`), for pruning the registry; 0 if it has none.
fn id_start(id: &str) -> i64 {
    id.rsplit('_').next().and_then(|t| t.parse().ok()).unwrap_or(0)
}

/// Called by the auto-save loop for each fight it saved: a finished boss kill is uploaded as a public
/// log (class stats and rankings count public logs only), once per fight, if the user is signed in
/// and has not turned it off. Runs in its own task, so the loop never waits on the network.
pub(crate) fn auto_upload(app: &tauri::AppHandle, record: &FightRecord) {
    let Some(state) = app.try_state::<AppState>() else { return };
    if !is_finished_kill(record, now_ms() as i64)
        || state.settings.get(AUTO_UPLOAD_KEY).as_deref() == Some("false")
        || state.settings.get(TOKEN_KEY).is_none()
    {
        return;
    }
    {
        let Ok(mut busy) = AUTO_UPLOADING.lock() else { return };
        if busy.contains(&record.id) || auto_uploaded(&state).contains_key(&record.id) {
            return;
        }
        busy.push(record.id.clone());
    }
    let app = app.clone();
    let record = record.clone();
    tauri::async_runtime::spawn(async move {
        upload_with_retry(&app, &record).await;
        if let Ok(mut busy) = AUTO_UPLOADING.lock() {
            busy.retain(|id| *id != record.id);
        }
    });
}

async fn upload_with_retry(app: &tauri::AppHandle, record: &FightRecord) {
    let Ok(fight) = serde_json::to_value(record) else { return };
    for wait in AUTO_UPLOAD_WAITS_SECS {
        tokio::time::sleep(Duration::from_secs(wait)).await;
        let Some(state) = app.try_state::<AppState>() else { return };
        // Checked again on every try: the user may sign out or turn it off meanwhile.
        if state.settings.get(AUTO_UPLOAD_KEY).as_deref() == Some("false") || state.settings.get(TOKEN_KEY).is_none() {
            return;
        }
        let body = log_body(&state, fight.clone(), "public");
        match authed(&state, reqwest::Method::POST, "/api/logs", Some(&body)).await {
            Ok(res) => {
                let url = res["url"].as_str().unwrap_or_default();
                tracing::info!("Auto-uploaded fight {} as {url}", record.id);
                remember_upload(app, &state, &record.id, url);
                return;
            }
            // The session is gone (authed already dropped it): nothing to retry until the next login.
            Err(e) if e == "unauthorized" => return,
            Err(e) => tracing::warn!("Auto-upload of fight {} failed: {e}", record.id),
        }
    }
}

/// Adds the fight to the registry and tells the windows, like a setting changed from the UI.
fn remember_upload(app: &tauri::AppHandle, state: &AppState, id: &str, url: &str) {
    let Ok(_guard) = AUTO_UPLOADING.lock() else { return };
    let mut map = auto_uploaded(state);
    map.insert(id.to_string(), json!(url));
    if map.len() > AUTO_UPLOADED_MAX {
        let mut ids: Vec<String> = map.keys().cloned().collect();
        ids.sort_by_key(|k| std::cmp::Reverse(id_start(k)));
        for old in &ids[AUTO_UPLOADED_MAX..] {
            map.remove(old);
        }
    }
    let value = Value::Object(map).to_string();
    if state.settings.set(AUTO_UPLOADED_KEY, &value) {
        let _ = app.emit("setting-changed", json!({ "key": AUTO_UPLOADED_KEY, "value": value }));
    }
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

const DEBUG_LOG_KEY: &str = "dpsMeter.debugLoggingEnabled";
const PACKET_LOG_KEY: &str = "dpsMeter.saveRawPackets";

/// A permit that lets this PC write packet and debug logs: not expired, and the Admin or Debugger role.
fn permit_allows_logs(permit: &Value, now: f64) -> bool {
    permit["exp"].as_f64().is_some_and(|exp| exp > now) && (permit["admin"] == true || permit["debugger"] == true)
}

/// Packet and debug logs are for the Debugger and Admin roles only, read from the cached signed permit
/// (whatever the settings say): the startup, the two switches and every entitlement refresh check it.
pub(crate) fn may_log(settings: &crate::config::settings::Settings) -> bool {
    cfg!(debug_assertions)
        || settings.get(PERMIT_KEY).and_then(|p| permit_for_this_pc(&p)).is_some_and(|p| permit_allows_logs(&p, now_ms()))
}

/// For the widget's diagnostics switches (disabled when false).
#[tauri::command]
pub fn pm_may_log(state: tauri::State<'_, AppState>) -> bool {
    may_log(&state.settings)
}

/// Turns packet or debug logging on or off; on is refused (and the setting saved off) without the role.
pub(crate) fn set_log(state: &AppState, packets: bool, enabled: bool) -> Result<(), String> {
    let on = enabled && may_log(&state.settings);
    if packets {
        crate::logging::logger::set_packet_log_enabled(on, &state.app_data_dir);
    } else {
        crate::logging::logger::set_debug_enabled(on, &state.app_data_dir);
    }
    state.settings.set(if packets { PACKET_LOG_KEY } else { DEBUG_LOG_KEY }, if on { "true" } else { "false" });
    if enabled && !on {
        return Err("packet and debug logs need the Debugger or Admin role".into());
    }
    Ok(())
}

/// What the user may open: `{tier, admin, debugger, features, …}` (tier: free/trial/recluta/daeva/empyrean).
/// Tier, admin, debugger and features always come from the signed permit, never from the unsigned fields;
/// offline, the last permit counts until it expires (7 days at most). A lost Debugger role stops the logs.
#[tauri::command]
pub async fn pm_entitlement(state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let res = entitlement(&state).await;
    if !may_log(&state.settings) {
        let _ = set_log(&state, true, false);
        let _ = set_log(&state, false, false);
    }
    res
}

async fn entitlement(state: &AppState) -> Result<Value, String> {
    // The developer's own builds are always unlocked.
    if cfg!(debug_assertions) {
        return Ok(json!({ "tier": "empyrean", "admin": true, "features": [], "source": "dev" }));
    }
    let free = json!({ "tier": "free", "admin": false, "features": [], "source": "free" });
    if state.settings.get(TOKEN_KEY).is_none() {
        state.settings.remove(PERMIT_KEY);
        return Ok(free);
    }
    let signed = |info: &mut Value, permit: &Value| {
        for k in ["tier", "admin", "debugger", "features"] {
            info[k] = permit[k].clone();
        }
    };
    match authed(&state, reqwest::Method::GET, "/api/me/entitlements", None).await {
        Ok(mut info) => {
            let permit = info["permit"].as_str().map(str::to_string).ok_or("no permit in server reply")?;
            let payload = permit_for_this_pc(&permit).ok_or("permit not valid for this PC")?;
            info.as_object_mut().map(|o| o.remove("permit"));
            signed(&mut info, &payload);
            state.settings.set(PERMIT_KEY, &permit);
            state.settings.set(ENTITLEMENT_KEY, &info.to_string());
            Ok(info)
        }
        Err(e) if e == "unauthorized" => {
            state.settings.remove(PERMIT_KEY);
            Ok(free)
        }
        // Offline or server down: the cached permit, while valid.
        Err(_) => {
            let payload = state.settings.get(PERMIT_KEY).and_then(|p| permit_for_this_pc(&p));
            match payload.filter(|p| p["exp"].as_f64().is_some_and(|exp| exp > now_ms())) {
                Some(payload) => {
                    let mut info: Value = state.settings.get(ENTITLEMENT_KEY).and_then(|s| serde_json::from_str(&s).ok()).unwrap_or(json!({}));
                    signed(&mut info, &payload);
                    info["offline"] = json!(true);
                    Ok(info)
                }
                None => Ok(free),
            }
        }
    }
}

/// Opens Patreon in the browser to link it to this account; the app re-reads the entitlement after.
/// `waiver`: the user asked for immediate access and waived the 14-day withdrawal (the server requires it).
#[tauri::command]
pub async fn pm_patreon_link(state: tauri::State<'_, AppState>, waiver: bool) -> Result<(), String> {
    let res = authed(&state, reqwest::Method::POST, "/api/patreon/link", Some(&json!({ "waiver": waiver }))).await?;
    let url = res["url"].as_str().filter(|u| u.starts_with("https://www.patreon.com/")).ok_or("invalid link url")?;
    tauri_plugin_opener::open_url(url, None::<&str>).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pm_patreon_unlink(state: tauri::State<'_, AppState>) -> Result<(), String> {
    authed(&state, reqwest::Method::DELETE, "/api/patreon/link", None).await.map(|_| ())
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

/// Rankings over the community's public boss logs (`kind`: hit / time / party); no account needed.
/// The server validates every parameter; empty strings are left out so "all" needs no special value.
#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn pm_rankings(
    state: tauri::State<'_, AppState>,
    kind: String,
    period: Option<String>,
    region: Option<String>,
    cls: Option<String>,
    boss: Option<i64>,
    limit: Option<u32>,
    offset: Option<u32>,
) -> Result<Value, String> {
    let mut url = reqwest::Url::parse(&format!("{}/api/rankings", server_url(&state))).map_err(|e| e.to_string())?;
    {
        let mut qs = url.query_pairs_mut();
        qs.append_pair("kind", &kind);
        for (k, v) in [("period", period), ("region", region), ("cls", cls)] {
            if let Some(v) = v.filter(|v| !v.is_empty()) {
                qs.append_pair(k, &v);
            }
        }
        for (k, v) in [("boss", boss), ("limit", limit.map(i64::from)), ("offset", offset.map(i64::from))] {
            if let Some(v) = v {
                qs.append_pair(k, &v.to_string());
            }
        }
    }
    call(reqwest::Method::GET, url.as_str(), None, None).await
}

#[cfg(test)]
mod tests {
    use super::*;

    // Signed by the server's key: {"v":1,"uid":"0","tier":"daeva",…,"exp":1000}.
    const PERMIT: &str = "eyJ2IjoxLCJ1aWQiOiIwIiwidGllciI6ImRhZXZhIiwiYWRtaW4iOmZhbHNlLCJmZWF0dXJlcyI6W10sImZvdW5kZXIiOmZhbHNlLCJpYXQiOjAsImV4cCI6MTAwMH0.az8VVur51Vl5JnsbR_p6488Y-rhYlj_wbWH3Etf-1B0LzDvZYWtqWH88ejtrPU3udVvZQ4LRaPjVtIpbb8C1BQ";

    #[test]
    fn permit_signed_by_the_server() {
        assert_eq!(permit_payload(PERMIT).unwrap()["tier"], "daeva");
    }

    #[test]
    fn logs_only_for_debugger_and_admin() {
        let p = |role: &str, exp: f64| {
            let mut v = json!({ "tier": "empyrean", "exp": exp });
            v[role] = json!(true);
            v
        };
        assert!(permit_allows_logs(&p("debugger", 2_000.0), 1_000.0));
        assert!(permit_allows_logs(&p("admin", 2_000.0), 1_000.0));
        assert!(!permit_allows_logs(&p("debugger", 500.0), 1_000.0), "expired");
        assert!(!permit_allows_logs(&p("founder", 2_000.0), 1_000.0), "a plan alone");
        assert!(!permit_allows_logs(&json!({ "debugger": "true", "exp": 2_000.0 }), 1_000.0), "not a boolean");
        assert!(!permit_allows_logs(&json!({ "debugger": true }), 1_000.0), "no expiry");
    }

    #[test]
    fn tampered_permit_rejected() {
        let (payload, sig) = PERMIT.split_once('.').unwrap();
        let forged = URL_SAFE_NO_PAD.encode(
            String::from_utf8(URL_SAFE_NO_PAD.decode(payload).unwrap()).unwrap().replace("daeva", "empyr"),
        );
        assert!(permit_payload(&format!("{forged}.{sig}")).is_none());
        assert!(permit_payload("garbage").is_none());
    }

    fn record(mode: &str, killed: Option<bool>) -> FightRecord {
        serde_json::from_value(json!({
            "id": "auto_7_1000", "bossName": "B", "targetId": 7, "startTimeMs": 1_000, "durationMs": 60_000,
            "totalDamage": 1, "jobs": [], "actors": [], "mode": mode, "killed": killed,
            "details": { "targetId": 7, "totalTargetDamage": 1, "battleTime": 60_000, "skills": [] },
        }))
        .unwrap()
    }

    #[test]
    fn only_finished_boss_kills_go_online() {
        let over = 1_000 + 60_000 + FIGHT_OVER_MS;
        assert!(is_finished_kill(&record("boss", Some(true)), over));
        assert!(!is_finished_kill(&record("boss", Some(true)), over - 1), "still inside the idle window");
        assert!(!is_finished_kill(&record("boss", Some(false)), over), "a wipe");
        assert!(!is_finished_kill(&record("boss", None), over), "unknown");
        assert!(!is_finished_kill(&record("train", Some(true)), over));
        assert!(!is_finished_kill(&record("pve", None), over));
    }

    #[test]
    fn registry_prunes_by_fight_start() {
        assert_eq!(id_start("auto_123_1790000000000"), 1_790_000_000_000);
        assert_eq!(id_start("imported"), 0);
    }
}
