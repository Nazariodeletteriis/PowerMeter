use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use super::personal_data::PersonalData;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DpsData {
    pub map: HashMap<i32, PersonalData>,
    pub target_name: String,
    pub target_mode: String,
    pub target_id: i32,
    pub battle_time: i64,
    pub local_player_id: Option<i64>,
    /// Max HP of the current single boss target (0 = unknown / multi-target).
    pub target_max_hp: i64,
    /// Cumulative tracked damage dealt to the current target — the fallback HP-bar
    /// source (max_hp - dealt) when no live current-HP reading is available.
    pub target_total_damage: i64,
    /// Live current HP of the current target from the in-place HP feed, or -1 if
    /// none has been observed. When >= 0 the bar uses this real value directly.
    pub target_current_hp: i64,
    /// Kind of the target hit most recently by anyone ("boss" / "train" / "pve" /
    /// "pvp", "" before the first hit) — what the engine is recording right now,
    /// whatever mode is being viewed.
    pub recording_kind: String,
    pub recording_name: String,
    /// Healing received per player since the last reset (any healer, any class).
    pub heals: Vec<HealTaken>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HealTaken {
    pub id: i32,
    pub nickname: String,
    pub job: String,
    /// Own heals and life steal.
    pub from_self: i64,
    /// Heals cast by other players (or their summons).
    pub from_others: i64,
}

impl DpsData {
    pub fn new() -> Self {
        Self {
            map: HashMap::new(),
            target_name: String::new(),
            target_mode: "bossTargets".to_string(),
            target_id: 0,
            battle_time: 0,
            local_player_id: None,
            target_max_hp: 0,
            target_total_damage: 0,
            target_current_hp: -1,
            recording_kind: String::new(),
            recording_name: String::new(),
            heals: Vec::new(),
        }
    }
}
