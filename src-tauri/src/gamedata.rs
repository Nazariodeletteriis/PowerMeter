//! Game data archive: a read-only SQLite file the server builds (Global + events) and the app keeps on disk.
//!
//! `sync` (at startup, every 6 hours and from the `gamedata_sync` command) reads the server's signed manifest:
//! the Ed25519 signature is checked with the permit's public key before anything in it is used, an older
//! manifest than the last one accepted is refused, a newer archive is downloaded, checked against the signed
//! SHA-256 and swapped in with a rename. Groups the manifest does not list as active are deleted from the file
//! (removal is immediate and survives offline: the rows are gone). Offline, or with a bad manifest or
//! download, the last valid archive stays in use.

use std::io::Read;
use std::path::{Path, PathBuf};
use std::time::Duration;

use parking_lot::RwLock;
use rusqlite::{params_from_iter, Connection, OpenFlags, OptionalExtension, ToSql};
use serde_json::{json, Map, Value};
use sha2::{Digest, Sha256};

use crate::AppState;

const LAST_IAT_KEY: &str = "pm.gamedata.iat";
pub const SYNC_EVERY: Duration = Duration::from_secs(6 * 3600);
/// Upper bound for a download whatever the manifest says (the archive is ~16 MB gzipped).
const MAX_ARCHIVE_BYTES: u64 = 512 * 1024 * 1024;

pub struct Gamedata {
    dir: PathBuf,
    /// Readers hold it shared; the swap holds it exclusive (Windows can't rename over an open file).
    file: RwLock<()>,
    /// One sync at a time (startup, timer and the command can overlap).
    sync: tokio::sync::Mutex<()>,
}

#[derive(Debug, PartialEq)]
struct Archive {
    version: i64,
    sha256: String,
    bytes: u64,
    url: String,
}

#[derive(Debug)]
struct Manifest {
    iat: f64,
    /// Groups the app may show: `active: true`. Everything else in the local file is deleted.
    active: Vec<String>,
    archive: Option<Archive>,
}

/// Signature first, then content: an unsigned or foreign token (e.g. a permit) never gets parsed as a manifest.
fn verify_manifest(token: &str, last_iat: Option<f64>) -> Result<Manifest, String> {
    let p = crate::pm_account::permit_payload(token).ok_or("manifest signature not valid")?;
    if p["typ"] != "pm-gamedata-manifest" || p["v"] != 1 {
        return Err("not a game data manifest".into());
    }
    let iat = p["iat"].as_f64().ok_or("manifest without iat")?;
    if last_iat.is_some_and(|last| iat < last) {
        return Err("manifest older than the last one accepted".into());
    }
    let active = p["datasets"]
        .as_array()
        .ok_or("manifest without datasets")?
        .iter()
        .filter(|d| d["active"] == true)
        .filter_map(|d| d["id"].as_str().map(str::to_string))
        .collect();
    let archive = match &p["archive"] {
        Value::Null => None,
        a => {
            let sha256 = a["sha256"].as_str().filter(|s| s.len() == 64 && s.bytes().all(|b| b.is_ascii_hexdigit()));
            Some(Archive {
                version: a["version"].as_i64().ok_or("archive without version")?,
                sha256: sha256.ok_or("archive without sha256")?.to_ascii_lowercase(),
                bytes: a["bytes"].as_u64().filter(|&b| b <= MAX_ARCHIVE_BYTES).ok_or("archive size not valid")?,
                url: a["url"].as_str().ok_or("archive without url")?.to_string(),
            })
        }
    };
    Ok(Manifest { iat, active, archive })
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn meta(conn: &Connection, key: &str) -> rusqlite::Result<Option<String>> {
    conn.query_row("SELECT value FROM meta WHERE key = ?1", [key], |r| r.get(0)).optional()
}

/// Deletes every group not in `active` from all tables, overwriting the freed pages. Returns the groups removed.
fn keep_only(conn: &mut Connection, active: &[String]) -> Result<Vec<String>, String> {
    let e = |e: rusqlite::Error| e.to_string();
    let present: Vec<String> = serde_json::from_str(&meta(conn, "datasets").map_err(e)?.unwrap_or_default()).unwrap_or_default();
    let gone: Vec<String> = present.iter().filter(|d| !active.contains(d)).cloned().collect();
    if gone.is_empty() {
        return Ok(gone);
    }
    let tables: Vec<String> = conn
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name <> 'meta'")
        .map_err(e)?
        .query_map([], |r| r.get(0))
        .map_err(e)?
        .collect::<Result<_, _>>()
        .map_err(e)?;
    conn.pragma_update(None, "secure_delete", true).map_err(e)?;
    let tx = conn.transaction().map_err(e)?;
    for t in &tables {
        for d in &gone {
            tx.execute(&format!("DELETE FROM \"{}\" WHERE dataset_id = ?1", t.replace('"', "\"\"")), [d]).map_err(e)?;
        }
    }
    let left: Vec<&String> = present.iter().filter(|d| active.contains(d)).collect();
    tx.execute("UPDATE meta SET value = ?1 WHERE key = 'datasets'", [json!(left).to_string()]).map_err(e)?;
    tx.commit().map_err(e)?;
    conn.execute_batch("VACUUM").map_err(e)?;
    Ok(gone)
}

impl Gamedata {
    pub fn new(app_data_dir: &Path) -> Self {
        Self { dir: app_data_dir.join("gamedata"), file: RwLock::new(()), sync: tokio::sync::Mutex::new(()) }
    }

    fn path(&self) -> PathBuf {
        self.dir.join("gamedata.sqlite")
    }

    fn local_version(&self) -> Option<i64> {
        let _r = self.file.read();
        let conn = Connection::open_with_flags(self.path(), OpenFlags::SQLITE_OPEN_READ_ONLY).ok()?;
        meta(&conn, "version").ok()??.parse().ok()
    }

    /// Checks the downloaded bytes against the signed hash, unpacks them next to the live file, drops the groups
    /// that are no longer active and only then renames it over the live file. Any failure leaves the live file as it was.
    fn install(&self, gz: &[u8], archive: &Archive, active: &[String]) -> Result<Vec<String>, String> {
        if hex(&Sha256::digest(gz)) != archive.sha256 {
            return Err("archive SHA-256 does not match the manifest".into());
        }
        std::fs::create_dir_all(&self.dir).map_err(|e| e.to_string())?;
        let tmp = self.dir.join("gamedata.sqlite.tmp");
        let result = (|| {
            let mut raw = Vec::new();
            flate2::read::GzDecoder::new(gz).read_to_end(&mut raw).map_err(|e| format!("archive not valid gzip: {e}"))?;
            std::fs::write(&tmp, raw).map_err(|e| e.to_string())?;
            let mut conn = Connection::open(&tmp).map_err(|e| e.to_string())?;
            let version = meta(&conn, "version").map_err(|e| e.to_string())?;
            if version.as_deref() != Some(archive.version.to_string().as_str()) {
                return Err("archive version does not match the manifest".to_string());
            }
            let gone = keep_only(&mut conn, active)?;
            conn.close().map_err(|(_, e)| e.to_string())?;
            let _w = self.file.write();
            std::fs::rename(&tmp, self.path()).map_err(|e| e.to_string())?;
            Ok(gone)
        })();
        if result.is_err() {
            let _ = std::fs::remove_file(&tmp);
        }
        result
    }

    /// Applies the active list to the live file (no new archive).
    fn apply(&self, active: &[String]) -> Result<Vec<String>, String> {
        let _r = self.file.read(); // blocks a swap, not other readers
        if !self.path().exists() {
            return Ok(vec![]);
        }
        let mut conn = Connection::open(self.path()).map_err(|e| e.to_string())?;
        keep_only(&mut conn, active)
    }

    /// Rows of a read-only query as JSON objects; `*_json` columns come back parsed.
    fn query(&self, sql: &str, params: &[&dyn ToSql]) -> Result<Vec<Value>, String> {
        let e = |e: rusqlite::Error| e.to_string();
        let _r = self.file.read();
        if !self.path().exists() {
            return Err("game data not downloaded yet".into());
        }
        let conn = Connection::open_with_flags(self.path(), OpenFlags::SQLITE_OPEN_READ_ONLY).map_err(e)?;
        let mut stmt = conn.prepare(sql).map_err(e)?;
        let names: Vec<String> = stmt.column_names().into_iter().map(str::to_string).collect();
        let rows = stmt
            .query_map(params_from_iter(params.iter()), |r| {
                let mut o = Map::new();
                for (i, n) in names.iter().enumerate() {
                    let v = match r.get_ref(i)? {
                        rusqlite::types::ValueRef::Null => Value::Null,
                        rusqlite::types::ValueRef::Integer(x) => json!(x),
                        rusqlite::types::ValueRef::Real(x) => json!(x),
                        rusqlite::types::ValueRef::Text(t) => {
                            let s = String::from_utf8_lossy(t);
                            match n.strip_suffix("_json") {
                                Some(_) => serde_json::from_str(&s).unwrap_or(Value::Null),
                                None => Value::String(s.into_owned()),
                            }
                        }
                        rusqlite::types::ValueRef::Blob(_) => Value::Null,
                    };
                    o.insert(n.clone(), v);
                }
                Ok(Value::Object(o))
            })
            .map_err(e)?;
        rows.collect::<Result<_, _>>().map_err(e)
    }
}

async fn download(url: &str, archive: &Archive) -> Result<Vec<u8>, String> {
    let mut res = reqwest::get(url).await.map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("archive download: {}", res.status()));
    }
    let mut buf = Vec::with_capacity(archive.bytes as usize);
    while let Some(chunk) = res.chunk().await.map_err(|e| e.to_string())? {
        if (buf.len() + chunk.len()) as u64 > archive.bytes {
            return Err("archive larger than the manifest says".into());
        }
        buf.extend_from_slice(&chunk);
    }
    Ok(buf)
}

/// Reads the manifest and brings the local archive in line with it. Errors leave the last valid archive in place.
pub async fn sync(state: &AppState) -> Result<Value, String> {
    let gd = &state.gamedata;
    let _one = gd.sync.lock().await;
    let base = crate::pm_account::server_url(state);
    let text = reqwest::Client::new()
        .get(format!("{base}/api/gamedata/manifest"))
        .timeout(Duration::from_secs(20))
        .send()
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())?;
    let body: Value = serde_json::from_str(&text).map_err(|e| e.to_string())?;
    let last_iat = state.settings.get(LAST_IAT_KEY).and_then(|s| s.parse().ok());
    let m = verify_manifest(body["manifest"].as_str().ok_or("no manifest in server reply")?, last_iat)?;
    state.settings.set(LAST_IAT_KEY, &m.iat.to_string());

    let mut updated = false;
    let removed = match &m.archive {
        Some(a) if gd.local_version().is_none_or(|v| a.version > v) => {
            let url = reqwest::Url::parse(&format!("{base}/")).and_then(|b| b.join(&a.url)).map_err(|e| e.to_string())?;
            let gz = download(url.as_str(), a).await?;
            let gone = tokio::task::block_in_place(|| gd.install(&gz, a, &m.active))?;
            updated = true;
            gone
        }
        _ => tokio::task::block_in_place(|| gd.apply(&m.active))?,
    };
    if !removed.is_empty() {
        tracing::info!("game data: removed groups {removed:?}");
    }
    Ok(json!({ "version": gd.local_version(), "updated": updated, "removed": removed }))
}

/// Startup sync, then every 6 hours. Failures are logged; the app keeps the last valid archive.
pub fn start_sync(app: tauri::AppHandle) {
    use tauri::Manager;
    tauri::async_runtime::spawn(async move {
        loop {
            if let Err(e) = sync(&app.state::<AppState>()).await {
                tracing::warn!("game data sync: {e}");
            }
            tokio::time::sleep(SYNC_EVERY).await;
        }
    });
}

// ===== Commands =====

#[tauri::command]
pub async fn gamedata_sync(state: tauri::State<'_, AppState>) -> Result<Value, String> {
    sync(&state).await
}

/// One record (item, monster, quest, recipe, skill, map, dungeon, title, wing, creature, daevanion_board/node).
#[tauri::command]
pub fn gamedata_get(state: tauri::State<'_, AppState>, category: String, id: String) -> Result<Option<Value>, String> {
    let rows = state.gamedata.query(
        "SELECT category, id, name, in_game_values_verified, image_paths_json, data_json FROM records WHERE category = ?1 AND id = ?2",
        &[&category, &id],
    )?;
    Ok(rows.into_iter().next())
}

/// Records whose name (any language in the archive) contains `query`, optionally of one category. Max 200.
#[tauri::command]
pub fn gamedata_search(
    state: tauri::State<'_, AppState>,
    query: String,
    category: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<Value>, String> {
    let q = query.trim();
    if q.is_empty() {
        return Ok(vec![]);
    }
    let like = format!("%{}%", q.replace('\\', "\\\\").replace('%', "\\%").replace('_', "\\_"));
    let limit = limit.unwrap_or(50).min(200);
    state.gamedata.query(
        "SELECT r.category, r.id, r.name FROM records r
         WHERE (?2 IS NULL OR r.category = ?2)
           AND (r.name LIKE ?1 ESCAPE '\\' OR EXISTS (SELECT 1 FROM names n
                WHERE n.category = r.category AND n.game_id = r.id AND n.name LIKE ?1 ESCAPE '\\'))
         ORDER BY length(r.name), r.name LIMIT ?3",
        &[&like, &category, &limit],
    )
}

/// Drops of a monster (quantity/probability null = not published).
#[tauri::command]
pub fn gamedata_monster_drops(state: tauri::State<'_, AppState>, monster_id: String) -> Result<Vec<Value>, String> {
    state.gamedata.query(
        "SELECT item_code, name, quantity, probability, quantity_status, probability_status
         FROM monster_drops WHERE monster_id = ?1 ORDER BY row_index",
        &[&monster_id],
    )
}

/// Recipes that make an item (`crafted_by`, `splendent`) and those that use it (`used_in`).
#[tauri::command]
pub fn gamedata_item_recipes(state: tauri::State<'_, AppState>, item_code: String) -> Result<Value, String> {
    let gd = &state.gamedata;
    Ok(json!({
        "crafted_by": gd.query(
            "SELECT id, name, data_json FROM records
             WHERE category = 'recipe' AND json_extract(data_json, '$.recipe.output.code') = ?1",
            &[&item_code],
        )?,
        "used_in": gd.query(
            "SELECT recipe_id, quantity FROM recipe_components WHERE item_code = ?1 ORDER BY recipe_id",
            &[&item_code],
        )?,
        "splendent": gd.query(
            "SELECT * FROM splendent_recipes WHERE output_item_code = ?1 ORDER BY recipe_id",
            &[&item_code],
        )?,
    }))
}

/// Every recipe with its full JSON: the Crafting planner builds its chains and trees from the whole set (~1 MB).
#[tauri::command]
pub async fn gamedata_recipes(state: tauri::State<'_, AppState>) -> Result<Vec<Value>, String> {
    state.gamedata.query("SELECT id, data_json FROM records WHERE category = 'recipe' ORDER BY id", &[])
}

/// Daevanion boards and nodes of one class (`assassin`, `chanter`, ...).
#[tauri::command]
pub fn gamedata_planner(state: tauri::State<'_, AppState>, class: String) -> Result<Value, String> {
    if class.is_empty() || !class.bytes().all(|b| b.is_ascii_lowercase()) {
        return Err("invalid class".into());
    }
    let prefix = format!("{class}:%");
    let gd = &state.gamedata;
    let sql = |cat: &str| format!("SELECT id, name, data_json FROM records WHERE category = '{cat}' AND id LIKE ?1 ORDER BY id");
    Ok(json!({
        "boards": gd.query(&sql("daevanion_board"), &[&prefix])?,
        "nodes": gd.query(&sql("daevanion_node"), &[&prefix])?,
    }))
}

const EVENTS_SQL: &str = "SELECT event_id, category, name, timezone, duration_minutes, cadence_json, location, server_verified
     FROM events ORDER BY event_id";

/// Event timer rules (Asia/Seoul times; the page shows them in local time).
#[tauri::command]
pub fn gamedata_events(state: tauri::State<'_, AppState>) -> Result<Vec<Value>, String> {
    state.gamedata.query(EVENTS_SQL, &[])
}

/// How many records each category has.
#[tauri::command]
pub fn gamedata_counts(state: tauri::State<'_, AppState>) -> Result<Vec<Value>, String> {
    state.gamedata.query("SELECT category, count(*) AS n FROM records GROUP BY category", &[])
}

/// Every record of one category with the few fields a list row shows (null when the category has none).
const LIST_SQL: &str = "SELECT id, name,
       coalesce(json_extract(data_json, '$.item.grade'), json_extract(data_json, '$.recipe.output.grade')) AS grade,
       coalesce(json_extract(data_json, '$.item.level'), json_extract(data_json, '$.monster.level'),
                json_extract(data_json, '$.quest.level'), json_extract(data_json, '$.recipe.output.level')) AS level,
       coalesce(json_extract(data_json, '$.item.slot'), json_extract(data_json, '$.item.type'),
                json_extract(data_json, '$.monster.subType'), json_extract(data_json, '$.quest.category'),
                json_extract(data_json, '$.categoryLabel'), json_extract(data_json, '$.class_name'),
                json_extract(data_json, '$.creature.genus')) AS kind,
       coalesce(json_extract(data_json, '$.item.icon'), json_extract(data_json, '$.recipe.output.icon'),
                json_extract(data_json, '$.icon'), json_extract(data_json, '$.creature.icon')) AS icon,
       json_extract(data_json, '$.facts.exchange') AS exchange,
       json_extract(data_json, '$.item.race') AS race,
       (SELECT group_concat(DISTINCT json_extract(s.value, '$.type')) FROM json_each(data_json, '$.sources') s) AS sources
     FROM records WHERE category = ?1 ORDER BY name = '???', name, id"; // 117 quests the Global client names '???': last, not on top

#[tauri::command]
pub fn gamedata_list(state: tauri::State<'_, AppState>, category: String) -> Result<Vec<Value>, String> {
    state.gamedata.query(LIST_SQL, &[&category])
}

/// Child tables the pages read by one key. Names go into the SQL text, so only these pairs are allowed.
const ROWS: &[(&str, &str)] = &[
    ("item_stats", "item_code"),
    ("item_enhancement_groups", "item_code"),
    ("enhancement_values", "enchant_group"),
    ("monster_regions", "monster_id"),
    ("quest_item_rewards", "quest_id"),
    ("quest_currency_rewards", "quest_id"),
    ("splendent_recipes", "recipe_id"),
    ("skill_coefficients", "skill_id"),
    ("skill_effects", "skill_id"),
];

fn rows_sql(table: &str, column: &str) -> Option<String> {
    ROWS.iter()
        .any(|&(t, c)| t == table && c == column)
        .then(|| format!("SELECT * FROM {table} WHERE {column} = ?1 ORDER BY rowid"))
}

/// Rows of a child table for one key, in archive order (e.g. `item_stats` of `item_code`).
#[tauri::command]
pub fn gamedata_rows(state: tauri::State<'_, AppState>, table: String, column: String, value: String) -> Result<Vec<Value>, String> {
    let sql = rows_sql(&table, &column).ok_or("table not readable")?;
    state.gamedata.query(&sql, &[&value])
}

/// All dungeons with their bosses (the dungeon list shows every entry).
#[tauri::command]
pub fn gamedata_dungeons(state: tauri::State<'_, AppState>) -> Result<Value, String> {
    let gd = &state.gamedata;
    Ok(json!({
        "dungeons": gd.query("SELECT * FROM dungeons ORDER BY name, dungeon_id", &[])?,
        "bosses": gd.query("SELECT * FROM dungeon_bosses ORDER BY dungeon_id, boss_index", &[])?,
    }))
}

/// Equipment with its fixed (not rolled) stats and the highest published enhancement level.
#[tauri::command]
pub fn gamedata_gear(state: tauri::State<'_, AppState>) -> Result<Vec<Value>, String> {
    state.gamedata.query(
        "SELECT r.id, r.name,
                json_extract(r.data_json, '$.item.slot') AS slot, json_extract(r.data_json, '$.item.grade') AS grade,
                json_extract(r.data_json, '$.item.level') AS level, json_extract(r.data_json, '$.item.icon') AS icon,
                (SELECT max(g.max_published_level) FROM item_enhancement_groups g WHERE g.item_code = r.id) AS max_enh,
                (SELECT json_group_array(json_array(s.stat_key, s.label, s.fixed_display, s.unit))
                   FROM (SELECT * FROM item_stats WHERE item_code = r.id AND is_rolled = 0 ORDER BY stat_index) s) AS stats_json
         FROM records r
         WHERE r.category = 'item' AND json_extract(r.data_json, '$.item.type') = 'Equip'
         ORDER BY level DESC, r.name, r.id",
        &[],
    )
}

/// Equipment the game shows by numeric item id (what the packets carry), from the Taiwan item data: name, slot,
/// grade, level, icon (an asset id, see gamedata_icons), fixed stats as written (`key`, label, value text) and the enhancement bonus of each level.
#[tauri::command]
pub fn gamedata_tw_gear(state: tauri::State<'_, AppState>, ids: Vec<String>) -> Result<Vec<Value>, String> {
    let ids: Vec<String> = ids.into_iter().take(64).collect();
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    let marks = vec!["?"; ids.len()].join(",");
    let params: Vec<&dyn ToSql> = ids.iter().map(|i| i as &dyn ToSql).collect();
    state.gamedata.query(
        &format!(
            "SELECT m.item_id AS id, m.name, m.item_type AS slot, m.grade, m.item_level AS level,
                    'asset_' || substr(m.icon_local_path, 8, 64) AS icon,
                    (SELECT json_group_array(json_array(s.\"key\", s.label, s.value))
                       FROM (SELECT * FROM tw_item_stats WHERE category = 'item' AND id = m.item_id ORDER BY stat_index) s) AS stats_json,
                    (SELECT json_group_array(json_array(e.level, json(e.stats_json), json(e.additional_stats_json)))
                       FROM (SELECT * FROM tw_item_enchantments WHERE item_id = m.item_id ORDER BY level) e) AS enh_json
             FROM tw_items_metadata m WHERE m.item_id IN ({marks})"
        ),
        &params,
    )
}

/// Path of the CDN folder on the server (the manifest's `cdn` field).
const CDN_PATH: &str = "/cdn/";

/// Image URL for game icon names (`Icon_...`). The archive lists images per record, not per icon: an icon gets the
/// image of a record that shows that icon and has exactly one image (unambiguous). Icons without one are left out.
/// An asset id (`asset_<sha>`, the Taiwan items' icons) is looked up as is. Icons still without an image come from
/// `icon_files` (official icons added by the server; an older archive has no such table).
#[tauri::command]
pub fn gamedata_icons(state: tauri::State<'_, AppState>, icons: Vec<String>) -> Result<Value, String> {
    let icons: Vec<String> = icons.into_iter().filter(|i| !i.is_empty()).take(500).collect();
    if icons.is_empty() {
        return Ok(json!({}));
    }
    let marks = vec!["?"; icons.len()].join(",");
    let params: Vec<&dyn ToSql> = icons.iter().chain(&icons).map(|i| i as &dyn ToSql).collect();
    let rows = state.gamedata.query(
        &format!(
            "SELECT r.icon, min(a.file) AS file FROM (
               SELECT coalesce(json_extract(data_json, '$.item.icon'), json_extract(data_json, '$.icon'),
                               json_extract(data_json, '$.creature.icon')) AS icon,
                      'asset_' || substr(json_extract(image_paths_json, '$[0]'), 8, 64) AS asset_id
               FROM records WHERE json_array_length(image_paths_json) = 1) r
             JOIN asset_files a ON a.asset_id = r.asset_id
             WHERE r.icon IN ({marks}) GROUP BY r.icon
             UNION ALL SELECT asset_id, file FROM asset_files WHERE asset_id IN ({marks})"
        ),
        &params,
    )?;
    let base = format!("{}{CDN_PATH}", crate::pm_account::server_url(&state));
    let mut out = Map::new();
    for r in rows {
        if let (Some(icon), Some(file)) = (r["icon"].as_str(), r["file"].as_str()) {
            out.insert(icon.to_string(), json!(format!("{base}{file}")));
        }
    }
    let missing: Vec<&String> = icons.iter().filter(|i| !out.contains_key(*i)).collect();
    if !missing.is_empty() {
        let marks = vec!["?"; missing.len()].join(",");
        let params: Vec<&dyn ToSql> = missing.iter().map(|i| *i as &dyn ToSql).collect();
        let sql = format!("SELECT icon, file FROM icon_files WHERE icon IN ({marks})");
        for r in state.gamedata.query(&sql, &params).unwrap_or_default() {
            if let (Some(icon), Some(file)) = (r["icon"].as_str(), r["file"].as_str()) {
                out.insert(icon.to_string(), json!(format!("{base}{file}")));
            }
        }
    }
    Ok(Value::Object(out))
}

#[cfg(test)]
mod tests {
    use super::*;

    // Signed with the server's ENTITLEMENT_KEY (the private key never leaves the server's .env):
    // {typ:"pm-gamedata-manifest",v:1,iat:2000,version:5,datasets:[global_204 active, events active,
    //  tw_105 removed], datasets_disabled:["tw_105"], archive:{version:7,sha256:"ab"*32,bytes:100,url:"/api/gamedata/archive/7"}}
    const MANIFEST: &str = "eyJ0eXAiOiJwbS1nYW1lZGF0YS1tYW5pZmVzdCIsInYiOjEsImlhdCI6MjAwMCwidmVyc2lvbiI6NSwiZGF0YXNldHMiOlt7ImlkIjoiZXZlbnRzIiwicmVnaW9uIjpudWxsLCJidWlsZCI6bnVsbCwiYWN0aXZlIjp0cnVlLCJyZW1vdmVkIjpmYWxzZX0seyJpZCI6Imdsb2JhbF8yMDQiLCJyZWdpb24iOiJnbG9iYWwiLCJidWlsZCI6IjIuMC40IiwiYWN0aXZlIjp0cnVlLCJyZW1vdmVkIjpmYWxzZX0seyJpZCI6InR3XzEwNSIsInJlZ2lvbiI6InR3IiwiYnVpbGQiOiIxMDUiLCJhY3RpdmUiOmZhbHNlLCJyZW1vdmVkIjp0cnVlfV0sImRhdGFzZXRzX2Rpc2FibGVkIjpbInR3XzEwNSJdLCJhcmNoaXZlIjp7InZlcnNpb24iOjcsInNoYTI1NiI6ImFiYWJhYmFiYWJhYmFiYWJhYmFiYWJhYmFiYWJhYmFiYWJhYmFiYWJhYmFiYWJhYmFiYWJhYmFiYWJhYmFiYWIiLCJieXRlcyI6MTAwLCJ1cmwiOiIvYXBpL2dhbWVkYXRhL2FyY2hpdmUvNyJ9fQ.nhaILp-Ixy8aUFOeLqpYFpSeYkqg7ZMCF_jmizKsF_hV3gYQ17q-SGXCbERKwG0yT3O7iGDcz4us-dcrVFu4AA";

    fn tmp_dir(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("pm-gamedata-test-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&d);
        std::fs::create_dir_all(&d).unwrap();
        d
    }

    /// A tiny archive like the server's: two groups, every table with dataset_id, meta with version/datasets.
    fn archive_bytes(dir: &Path, version: i64) -> Vec<u8> {
        let f = dir.join(format!("src-{version}.sqlite"));
        let _ = std::fs::remove_file(&f);
        let c = Connection::open(&f).unwrap();
        c.execute_batch(&format!(
            "CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
             INSERT INTO meta VALUES ('version', '{version}'), ('datasets', '[\"global_204\",\"tw_105\"]'), ('schema', '1');
             CREATE TABLE records (dataset_id TEXT, category TEXT, id TEXT, name TEXT, in_game_values_verified INTEGER,
               image_paths_json TEXT, data_json TEXT);
             INSERT INTO records VALUES ('global_204', 'item', 'sword', 'Sword', 0, '[]', '{{\"kind\":\"item\"}}'),
                                        ('tw_105', 'item', 'sword', 'Sword TW', 0, '[]', '{{}}');
             CREATE TABLE monster_drops (dataset_id TEXT, monster_id TEXT, row_index INTEGER, item_code TEXT, name TEXT,
               quantity INTEGER, probability REAL, quantity_status TEXT, probability_status TEXT);
             INSERT INTO monster_drops VALUES ('global_204', '1', 0, 'sword', 'Sword', NULL, NULL, 'n', 'n'),
                                              ('tw_105', '1', 1, 'sword', 'Sword TW', NULL, NULL, 'n', 'n');"
        ))
        .unwrap();
        drop(c);
        let mut gz = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
        std::io::Write::write_all(&mut gz, &std::fs::read(&f).unwrap()).unwrap();
        gz.finish().unwrap()
    }

    fn signed_for(gz: &[u8], version: i64) -> Archive {
        Archive { version, sha256: hex(&Sha256::digest(gz)), bytes: gz.len() as u64, url: String::new() }
    }

    fn all(v: &[&str]) -> Vec<String> {
        v.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn manifest_signed_by_the_server() {
        let m = verify_manifest(MANIFEST, None).unwrap();
        assert_eq!(m.iat, 2000.0);
        assert_eq!(m.active, all(&["events", "global_204"]));
        assert_eq!(
            m.archive,
            Some(Archive { version: 7, sha256: "ab".repeat(32), bytes: 100, url: "/api/gamedata/archive/7".into() })
        );
    }

    #[test]
    fn tampered_or_foreign_manifest_rejected() {
        use base64::Engine;
        use base64::engine::general_purpose::URL_SAFE_NO_PAD;
        let (payload, sig) = MANIFEST.split_once('.').unwrap();
        let text = String::from_utf8(URL_SAFE_NO_PAD.decode(payload).unwrap()).unwrap();
        // Turning the removed group back on, or pointing to another file, breaks the signature.
        for forged in [text.replace("\"active\":false", "\"active\":true"), text.replace(&"ab".repeat(32), &"cd".repeat(32))] {
            assert_ne!(forged, text);
            let token = format!("{}.{sig}", URL_SAFE_NO_PAD.encode(forged));
            assert_eq!(verify_manifest(&token, None).unwrap_err(), "manifest signature not valid");
        }
        assert!(verify_manifest("garbage", None).is_err());
        // A real permit, signed by the same key, is not a manifest.
        let permit = "eyJ2IjoxLCJ1aWQiOiIwIiwidGllciI6ImRhZXZhIiwiYWRtaW4iOmZhbHNlLCJmZWF0dXJlcyI6W10sImZvdW5kZXIiOmZhbHNlLCJpYXQiOjAsImV4cCI6MTAwMH0.az8VVur51Vl5JnsbR_p6488Y-rhYlj_wbWH3Etf-1B0LzDvZYWtqWH88ejtrPU3udVvZQ4LRaPjVtIpbb8C1BQ";
        assert_eq!(verify_manifest(permit, None).unwrap_err(), "not a game data manifest");
        // Replay of an older manifest.
        assert!(verify_manifest(MANIFEST, Some(2000.0)).is_ok());
        assert_eq!(verify_manifest(MANIFEST, Some(2001.0)).unwrap_err(), "manifest older than the last one accepted");
    }

    #[test]
    fn install_checks_hash_swaps_and_drops_inactive_groups() {
        let dir = tmp_dir("install");
        let gd = Gamedata::new(&dir);
        let active = all(&["global_204", "tw_105"]);

        let v1 = archive_bytes(&dir, 1);
        assert_eq!(gd.install(&v1, &signed_for(&v1, 1), &active).unwrap(), Vec::<String>::new());
        assert_eq!(gd.local_version(), Some(1));

        // Wrong hash: refused before unpacking, live file untouched, no temp file left.
        let v2 = archive_bytes(&dir, 2);
        let mut wrong = signed_for(&v2, 2);
        wrong.sha256 = "00".repeat(32);
        assert_eq!(gd.install(&v2, &wrong, &active).unwrap_err(), "archive SHA-256 does not match the manifest");
        // Right hash but the file inside is another version than the manifest says.
        assert_eq!(gd.install(&v2, &signed_for(&v2, 3), &active).unwrap_err(), "archive version does not match the manifest");
        // Not gzip at all.
        assert!(gd.install(b"not gzip", &signed_for(b"not gzip", 2), &active).unwrap_err().starts_with("archive not valid gzip"));
        assert_eq!(gd.local_version(), Some(1));
        assert!(!dir.join("gamedata/gamedata.sqlite.tmp").exists());

        // A good v2 where tw_105 is no longer active: swapped in already without it.
        assert_eq!(gd.install(&v2, &signed_for(&v2, 2), &all(&["global_204"])).unwrap(), all(&["tw_105"]));
        assert_eq!(gd.local_version(), Some(2));
        let names = gd.query("SELECT name FROM records UNION ALL SELECT name FROM monster_drops", &[]).unwrap();
        assert_eq!(names, vec![json!({"name": "Sword"}), json!({"name": "Sword"})]);
        assert!(!dir.join("gamedata/gamedata.sqlite.tmp").exists());
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn removed_group_deleted_from_the_live_file() {
        let dir = tmp_dir("apply");
        let gd = Gamedata::new(&dir);
        assert_eq!(gd.apply(&all(&["global_204"])).unwrap(), Vec::<String>::new()); // nothing downloaded yet
        let v1 = archive_bytes(&dir, 1);
        gd.install(&v1, &signed_for(&v1, 1), &all(&["global_204", "tw_105"])).unwrap();

        assert_eq!(gd.apply(&all(&["global_204"])).unwrap(), all(&["tw_105"]));
        let left = gd.query("SELECT dataset_id FROM records UNION ALL SELECT dataset_id FROM monster_drops", &[]).unwrap();
        assert!(left.iter().all(|r| r["dataset_id"] == "global_204") && left.len() == 2);
        let datasets = gd.query("SELECT value FROM meta WHERE key = 'datasets'", &[]).unwrap();
        assert_eq!(datasets[0]["value"], "[\"global_204\"]");
        // Freed pages are overwritten: the removed text is not left in the file.
        let bytes = std::fs::read(dir.join("gamedata/gamedata.sqlite")).unwrap();
        assert!(!bytes.windows(8).any(|w| w == b"Sword TW"));
        // Re-running changes nothing; reads still work (JSON columns parsed).
        assert_eq!(gd.apply(&all(&["global_204"])).unwrap(), Vec::<String>::new());
        let r = gd.query("SELECT data_json FROM records WHERE id = ?1", &[&"sword"]).unwrap();
        assert_eq!(r[0]["data_json"], json!({"kind": "item"}));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn page_reads() {
        let dir = tmp_dir("reads");
        let gd = Gamedata::new(&dir);
        let v1 = archive_bytes(&dir, 1);
        gd.install(&v1, &signed_for(&v1, 1), &all(&["global_204"])).unwrap();
        {
            let c = Connection::open(gd.path()).unwrap();
            c.execute_batch(
                "CREATE TABLE events (dataset_id TEXT, event_id TEXT, category TEXT, name TEXT, timezone TEXT,
                   duration_minutes INTEGER, cadence_json TEXT, location TEXT, server_verified INTEGER);
                 INSERT INTO events VALUES ('events', 'e1', 'field', 'Rift', 'Asia/Seoul', 30, '{\"every\":\"day\"}', NULL, 0);
                 INSERT INTO records VALUES ('global_204', 'item', 'unnamed', '???', 0, '[]', '{}');
                 UPDATE records SET data_json = '{\"item\":{\"grade\":\"Rare\",\"slot\":\"Sword\",\"icon\":\"Icon_SW\"}}';",
            )
            .unwrap();
        }
        let ev = gd.query(EVENTS_SQL, &[]).unwrap();
        assert_eq!(ev[0]["name"], "Rift");
        assert_eq!(ev[0]["cadence_json"], json!({"every": "day"}));
        assert_eq!(ev[0]["duration_minutes"], 30);
        let list = gd.query(LIST_SQL, &[&"item"]).unwrap();
        assert_eq!(list[0], json!({"id": "sword", "name": "Sword", "grade": "Rare", "level": null, "kind": "Sword", "icon": "Icon_SW",
            "exchange": null, "race": null, "sources": null}));
        assert_eq!(list[1]["id"], "unnamed", "'???' sorts before letters: it goes last");
        // Only whitelisted table/column pairs reach the SQL text.
        assert!(rows_sql("monster_regions", "monster_id").is_some());
        assert!(rows_sql("meta", "key").is_none());
        assert!(rows_sql("item_stats", "item_code; DROP TABLE records").is_none());
        let _ = std::fs::remove_dir_all(&dir);
    }
}

const STAT_NAMES_SQL: &str = "SELECT stat_key, name, percent, json_extract(data_json, '$.group') AS grp FROM stat_dictionary ORDER BY name";
const BASE_STATS_SQL: &str = "SELECT level, stats_json FROM class_base_stats WHERE class = ?1 ORDER BY level";
const BUDGETS_SQL: &str = "SELECT budgets_json FROM class_board_budgets WHERE class = ?1";
const SKILL_DAMAGE_SQL: &str = "SELECT skill_id, name, attack_ratio_min_percent, attack_ratio_max_percent, flat_min, flat_max, hits, cooldown_ms
     FROM skill_coefficients WHERE class = ?1 ORDER BY name";

/// What the Character Builder and the Daevanion Planner compute with for one class (`assassin`, ...):
/// stat names, base stats per level, Daevanion budgets (null when the archive has none), skill damage coefficients.
#[tauri::command]
pub fn gamedata_builder(state: tauri::State<'_, AppState>, class: String) -> Result<Value, String> {
    if class.is_empty() || !class.bytes().all(|b| b.is_ascii_lowercase()) {
        return Err("invalid class".into());
    }
    let gd = &state.gamedata;
    let budgets = gd.query(BUDGETS_SQL, &[&class])?.into_iter().next().map_or(Value::Null, |r| r["budgets_json"].clone());
    Ok(json!({
        "stats": gd.query(STAT_NAMES_SQL, &[])?,
        "base": gd.query(BASE_STATS_SQL, &[&class])?,
        "budgets": budgets,
        "skills": gd.query(SKILL_DAMAGE_SQL, &[&class])?,
    }))
}

#[cfg(test)]
mod builder_tests {
    use super::*;

    #[test]
    fn builder_sql_matches_archive_tables() {
        let c = Connection::open_in_memory().unwrap();
        c.execute_batch(
            "CREATE TABLE stat_dictionary (dataset_id TEXT, stat_key TEXT, name TEXT, percent INTEGER, data_json TEXT);
             CREATE TABLE class_base_stats (dataset_id TEXT, class TEXT, level INTEGER, stats_json TEXT);
             CREATE TABLE class_board_budgets (dataset_id TEXT, class TEXT, budgets_json TEXT);
             CREATE TABLE skill_coefficients (dataset_id TEXT, skill_id TEXT, class TEXT, name TEXT, attack_ratio_min_raw INTEGER,
               attack_ratio_max_raw INTEGER, attack_ratio_min_percent REAL, attack_ratio_max_percent REAL, flat_min INTEGER, flat_max INTEGER,
               hits INTEGER, cooldown_ms INTEGER, mp_cost INTEGER, range_cm INTEGER, effect TEXT, has_unresolved_values INTEGER,
               damage_json TEXT, variants_json TEXT);
             INSERT INTO stat_dictionary VALUES ('g', 'HPMax', 'HP', 0, '{\"group\":\"BookMark\"}');
             INSERT INTO class_base_stats VALUES ('g', 'templar', 1, '{\"HPMax\":100}');
             INSERT INTO class_board_budgets VALUES ('g', 'templar', '{\"DaevanionCrystal\":840}');
             INSERT INTO skill_coefficients (skill_id, class, name, cooldown_ms) VALUES ('1', 'templar', 'Strike', 1000);",
        )
        .unwrap();
        let one = |sql: &str, p: &[&dyn ToSql]| c.prepare(sql).unwrap().query_map(params_from_iter(p.iter()), |_| Ok(())).unwrap().count();
        assert_eq!(one(STAT_NAMES_SQL, &[]), 1);
        assert_eq!(one(BASE_STATS_SQL, &[&"templar"]), 1);
        assert_eq!(one(BUDGETS_SQL, &[&"templar"]), 1);
        assert_eq!(one(SKILL_DAMAGE_SQL, &[&"templar"]), 1);
        assert_eq!(one(SKILL_DAMAGE_SQL, &[&"cleric"]), 0);
    }
}
