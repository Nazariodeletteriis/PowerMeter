use serde::{Deserialize, Serialize};

use super::details_context::{DetailsActorSummary, TargetDetailsResponse};

pub const APP_VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FightRecord {
    pub id: String,
    /// Display name (for backward compat). New files also have mob_code for i18n resolution.
    pub boss_name: String,
    pub target_id: i32,
    pub start_time_ms: i64,
    pub duration_ms: i64,
    pub total_damage: i32,
    /// Job class prefix IDs (e.g. [11, 14, 17]) for language-independent storage.
    pub jobs: Vec<String>,
    /// Job class prefix IDs for i18n resolution (new field).
    #[serde(default)]
    pub job_ids: Vec<i32>,
    pub details: TargetDetailsResponse,
    pub actors: Vec<DetailsActorSummary>,
    #[serde(default)]
    pub is_train: bool,
    #[serde(default)]
    pub app_version: String,
    /// NPC mob type code for i18n boss name resolution (new field).
    #[serde(default)]
    pub mob_code: i32,
    /// Meter mode the fight belongs to: "boss" / "train" / "pve" / "pvp".
    /// Empty on records saved before modes existed (boss, or train if is_train).
    #[serde(default)]
    pub mode: String,
    /// Boss fights: whether the game reported the boss's death (kill vs wipe, for the rankings).
    /// None on other modes and on records saved before it existed: never written as false, so the
    /// server can still judge those by boss HP.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub killed: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FightSummary {
    pub id: String,
    pub boss_name: String,
    pub target_id: i32,
    pub start_time_ms: i64,
    pub duration_ms: i64,
    pub total_damage: i32,
    pub jobs: Vec<String>,
    #[serde(default)]
    pub job_ids: Vec<i32>,
    #[serde(default)]
    pub is_train: bool,
    #[serde(default)]
    pub is_live: bool,
    #[serde(default)]
    pub app_version: String,
    #[serde(default)]
    pub mob_code: i32,
    /// Meter mode the fight belongs to: "boss" / "train" / "pve" / "pvp".
    /// Empty on records saved before modes existed (boss, or train if is_train).
    #[serde(default)]
    pub mode: String,
    /// Boss fights: the game reported the boss's death (see FightRecord). Feeds the field boss respawns.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub killed: Option<bool>,
}
