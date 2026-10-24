use std::collections::{HashMap, HashSet};
use std::sync::atomic::{AtomicBool, AtomicI64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

use parking_lot::RwLock;

use crate::entity::damage_packet::ParsedDamagePacket;
use crate::entity::dps_data::Stagger;
use crate::entity::job_class::JobClass;
use crate::entity::special_damage::SpecialDamage;
use crate::entity::summon_resolver;

/// Maximum idle gap before a fight is considered ended and a new one begins.
const IDLE_RESET_MS: i64 = 30_000;

/// A zone-change auto-reset is ignored if any damage was recorded within this
/// window, so an in-combat self-teleport (boss knockback/pull) can't wipe an
/// active fight. Real zone transitions always follow a travel/load lull.
const ZONE_RESET_LULL_MS: i64 = 1_500;
/// Minimum spacing between two zone-change resets (debounce).
const ZONE_RESET_DEBOUNCE_MS: i64 = 4_000;
/// A broken stagger gauge (groggy) lasts ~5 s in game (debuff duration 5000 ms);
/// the refill record normally closes it, this is the fallback if it is missed.
const STAGGER_BREAK_MS: i64 = 5_000;

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

// ───── Aggregate data structures ─────

/// Healing done, aggregated per (healer actor, skill, is_hot). Healing is keyed by
/// the HEALER (not the boss target), since the meter shows "healing done" per player.
#[derive(Debug, Clone, Default)]
pub struct HealSkillData {
    pub total_heal: i64,
    pub tick_count: i32,
}

#[derive(Debug, Clone)]
pub struct SkillCombatData {
    pub skill_code: i32,
    pub is_dot: bool,
    pub hit_count: i32,
    pub total_damage: i32,
    pub min_damage: i32,
    pub max_damage: i32,
    pub crit_count: i32,
    pub back_count: i32,
    pub frontal_count: i32,
    pub parry_count: i32,
    pub perfect_count: i32,
    pub double_count: i32,
    pub smite_count: i32,
    pub powershard_count: i32,
    pub multi_hit_count: i32,
    pub multi_hit_damage: i32,
    pub multi_hit_hits: i32,
    pub heal_amount: i32,
    pub hit_timestamps: Vec<i64>,
    /// Damage of each hit, parallel to `hit_timestamps` (same index, same length).
    pub hit_damages: Vec<i32>,
    pub spec_flags: [bool; 5],
}

impl SkillCombatData {
    /// Clone every aggregate field but leave `hit_timestamps`/`hit_damages` empty.
    /// The timestamp Vec grows by one entry per hit (unbounded over a long
    /// fight) and is only ever consumed by `get_target_details` (the details
    /// panel chart). Every other consumer clones it for nothing, so the hot
    /// 500ms paths use this to keep per-tick clone cost flat over fight time.
    /// Spelled out manually rather than `Vec::new(), ..self.clone()` because
    /// the latter would copy `hit_timestamps` only to throw it away.
    fn clone_light(&self) -> Self {
        Self {
            skill_code: self.skill_code,
            is_dot: self.is_dot,
            hit_count: self.hit_count,
            total_damage: self.total_damage,
            min_damage: self.min_damage,
            max_damage: self.max_damage,
            crit_count: self.crit_count,
            back_count: self.back_count,
            frontal_count: self.frontal_count,
            parry_count: self.parry_count,
            perfect_count: self.perfect_count,
            double_count: self.double_count,
            smite_count: self.smite_count,
            powershard_count: self.powershard_count,
            multi_hit_count: self.multi_hit_count,
            multi_hit_damage: self.multi_hit_damage,
            multi_hit_hits: self.multi_hit_hits,
            heal_amount: self.heal_amount,
            hit_timestamps: Vec::new(),
            hit_damages: Vec::new(),
            spec_flags: self.spec_flags,
        }
    }

    fn new(skill_code: i32, is_dot: bool) -> Self {
        Self {
            skill_code,
            is_dot,
            hit_count: 0,
            total_damage: 0,
            min_damage: i32::MAX,
            max_damage: 0,
            crit_count: 0,
            back_count: 0,
            frontal_count: 0,
            parry_count: 0,
            perfect_count: 0,
            double_count: 0,
            smite_count: 0,
            powershard_count: 0,
            multi_hit_count: 0,
            multi_hit_damage: 0,
            multi_hit_hits: 0,
            heal_amount: 0,
            hit_timestamps: Vec::new(),
            hit_damages: Vec::new(),
            spec_flags: [false; 5],
        }
    }
}

/// One entry of the party roster packet (`0x9702`). Keyed by character name,
/// because the roster carries the account-level `dbid` rather than the
/// session-scoped entity id — the name is the only field that joins it to the
/// in-world entities the meter tracks.
#[derive(Debug, Clone, Default)]
pub struct PartyMember {
    /// 1-based party slot.
    pub slot: u8,
    pub level: i32,
    /// Equipment item level ("gear score").
    pub gear_score: i32,
    /// Combat power — the number the game shows on the character sheet.
    pub combat_power: i64,
    /// World/server id (the bracket tag next to a cross-server player's name).
    pub server_id: u16,
}

#[derive(Debug, Clone)]
pub struct ActorCombatData {
    pub total_damage: i64,
    pub party_heal: i64,
    pub regen: i64,
    pub damage_received: i64,
    pub hits_received: i32,
    pub last_damage_time: i64,
    pub job: Option<JobClass>,
    /// Skills keyed by (raw_skill_code, is_dot)
    pub skills: HashMap<(i32, bool), SkillCombatData>,
}

impl ActorCombatData {
    fn new() -> Self {
        Self {
            total_damage: 0,
            party_heal: 0,
            regen: 0,
            damage_received: 0,
            hits_received: 0,
            last_damage_time: 0,
            job: None,
            skills: HashMap::new(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct TargetCombatData {
    pub target_id: i32,
    pub total_damage: i64,
    pub first_damage_time: i64,
    pub last_damage_time: i64,
    pub last_packet_id: i64,
    /// Per raw-actor aggregated combat data
    pub actors: HashMap<i32, ActorCombatData>,
}

impl TargetCombatData {
    fn new(target_id: i32, timestamp: i64) -> Self {
        Self {
            target_id,
            total_damage: 0,
            first_damage_time: timestamp,
            last_damage_time: timestamp,
            last_packet_id: -1,
            actors: HashMap::new(),
        }
    }
}

// ───── Main storage ─────

pub struct DataStorage {
    inner: RwLock<Inner>,
    damage_generation: AtomicI64,
    /// Wall-clock ms of the last damage record — gates the zone-change lull check.
    last_damage_ms: AtomicI64,
    /// Wall-clock ms of the last honored zone-change reset — debounce.
    last_zone_reset_ms: AtomicI64,
    /// Set when a zone change clears combat; the dps calculator consumes it to
    /// drop its cached snapshot / saved-target state on the next cycle.
    combat_reset_requested: AtomicBool,
}

struct Inner {
    /// Aggregated combat data per target (replaces raw packet storage)
    target_combat: HashMap<i32, TargetCombatData>,
    /// Job class detected per actor (across all targets, for summon matching)
    actor_jobs: HashMap<i32, JobClass>,

    nickname_storage: HashMap<i32, String>,
    pending_nicknames: HashMap<i32, String>,
    permanent_nicknames: HashMap<i32, String>,
    summon_storage: HashMap<i32, i32>,
    mob_storage: HashMap<i32, i32>,
    /// Healing done per (healer actor) -> (skill_code, is_hot) -> aggregate.
    heal_storage: HashMap<i32, HashMap<(i32, bool), HealSkillData>>,
    /// Spawn-time / observed-peak MAX HP per entity (denominator for the HP bar).
    mob_hp_data: HashMap<i32, i32>,
    /// Live CURRENT HP per entity, from the in-place `8D <id> 02 01 00 <u32>` feed.
    mob_current_hp: HashMap<i32, i32>,
    /// Stagger gauge per entity: (cur, max, broken_until ms; 0 = not broken).
    stagger: HashMap<i32, (i32, i32, i64)>,
    known_player_ids: HashSet<i32>,
    /// Ids whose nickname came from an authoritative source (a 45/44 36 player
    /// spawn or the account char-list). Lower-confidence parsers may not steal
    /// such a name onto a different id. Lives parallel to `nickname_storage`:
    /// survives a combat flush, cleared by `reset_nicknames`, evicted alongside.
    authoritative_name_ids: HashSet<i32>,
    confirmed_summon_ids: HashSet<i32>,
    /// Ids that spawned via a `40/41 36` mob/summon spawn (as opposed to a
    /// `44/45 36` player spawn). A real player never spawns this way, so an
    /// entity here that deals class-band damage is a summon / spell-effect
    /// entity — it must not be flagged as a known player, and is a candidate for
    /// attribution to the same-class player.
    summon_spawn_ids: HashSet<i32>,
    /// Entity ids below the usual `>= 100` sanity floor that a spawn or identity
    /// record has proven real. The damage parser uses `>= 100` as a resync gate
    /// while walking varints, which silently discarded every hit from players
    /// whose session entity id happened to be tiny (observed live: an
    /// Elementalist at id 48 lost 939 hits plus all 114 of their pets). Ids
    /// confirmed here are allowed through that gate; unconfirmed low values are
    /// still rejected, so the gate keeps its resync value.
    low_id_entities: HashSet<i32>,
    /// Party roster from the `0x9702` packet, keyed by character name.
    party_members: HashMap<String, PartyMember>,
    /// Power-scalar values observed per actor in its damage records. A summon
    /// inherits its owner's, so this links the two when no spawn packet (and
    /// therefore no `parent_key`) ever arrives — the case for a Cleric's Divine
    /// Aura, which the server creates without announcing. A set rather than one
    /// value because the scalar shifts as buffs come and go, and owner and summon
    /// are not always in the same buff state at the same instant.
    actor_power_scalars: HashMap<i32, HashSet<i32>>,
    hostile_target_ids: HashSet<i32>,
    /// Targets hit by the local player or a party member while being another
    /// player (see `is_pvp_hit`). Only the PvP target mode reads these; the
    /// other modes skip them, so PvE numbers are unchanged.
    pvp_target_ids: HashSet<i32>,
    dead_entity_ids: HashSet<i32>,
    /// Boss entity IDs identified from NPC DB boss flags
    boss_entity_ids: HashSet<i32>,
    /// Healing received per player (summons resolved to their owner):
    /// (from self incl. life steal, from other players).
    heal_received: HashMap<i32, (i64, i64)>,
    /// Hits each mob landed on each player: mob -> player -> (damage, hits).
    /// A mob attacks whoever holds its aggro, so this is the real aggro signal.
    mob_hits: HashMap<i32, HashMap<i32, (i64, i32)>>,
    current_target: i32,

    // Local player
    local_player_id: Option<i64>,
    local_character_name: Option<String>,
    /// Where the local player last was (x, y, z): teleports and their own casts, for the minimap.
    player_position: Option<[f32; 3]>,
    /// The map they are on (TW map id: 1010 Elyos world, 1110 Asmodian world, 20 Abyss), from each zone load.
    player_map: Option<u32>,
}

impl DataStorage {
    pub fn new() -> Self {
        Self {
            inner: RwLock::new(Inner {
                target_combat: HashMap::new(),
                actor_jobs: HashMap::new(),
                nickname_storage: HashMap::new(),
                pending_nicknames: HashMap::new(),
                permanent_nicknames: HashMap::new(),
                summon_storage: HashMap::new(),
                mob_storage: HashMap::new(),
                heal_storage: HashMap::new(),
                mob_hp_data: HashMap::new(),
                mob_current_hp: HashMap::new(),
                stagger: HashMap::new(),
                known_player_ids: HashSet::new(),
                authoritative_name_ids: HashSet::new(),
                confirmed_summon_ids: HashSet::new(),
                summon_spawn_ids: HashSet::new(),
                low_id_entities: HashSet::new(),
                party_members: HashMap::new(),
                actor_power_scalars: HashMap::new(),
                hostile_target_ids: HashSet::new(),
                pvp_target_ids: HashSet::new(),
                dead_entity_ids: HashSet::new(),
                boss_entity_ids: HashSet::new(),
                heal_received: HashMap::new(),
                mob_hits: HashMap::new(),
                current_target: 0,
                local_player_id: None,
                local_character_name: None,
                player_position: None,
                player_map: None,
            }),
            damage_generation: AtomicI64::new(0),
            last_damage_ms: AtomicI64::new(0),
            last_zone_reset_ms: AtomicI64::new(0),
            combat_reset_requested: AtomicBool::new(false),
        }
    }

    /// Called when a self/world teleport (zone-change opcode) is seen. Resets
    /// combat data only if not in active combat (lull) and not recently reset
    /// (debounce), so the meter starts clean on entering a dungeon/instance
    /// without ever wiping an in-progress fight. Returns true if it reset.
    pub fn note_zone_change(&self) -> bool {
        let now = now_ms();
        if now - self.last_damage_ms.load(Ordering::Relaxed) < ZONE_RESET_LULL_MS {
            return false; // mid-combat teleport — ignore
        }
        if now - self.last_zone_reset_ms.load(Ordering::Relaxed) < ZONE_RESET_DEBOUNCE_MS {
            return false; // already reset moments ago
        }
        {
            let inner = self.inner.read();
            // Heals count too: strangers healing in town otherwise rode into the
            // instance as an extra 0-DPS row.
            if inner.target_combat.is_empty() && inner.heal_storage.is_empty() {
                return false; // nothing to clear
            }
        }
        self.last_zone_reset_ms.store(now, Ordering::Relaxed);
        // Ids are reissued with the zone: a name still waiting for its id's first hit is stale.
        self.inner.write().pending_nicknames.clear();
        // Preserve identity across the reset: a teleport within the same instance
        // keeps everyone's entity ids, so wiping nicknames/known-players/summons
        // would drop your party (and you) to raw ids until they happen to be
        // re-broadcast. Clear only the per-segment damage aggregates.
        self.flush_combat_only();
        self.combat_reset_requested.store(true, Ordering::Relaxed);
        tracing::info!("Zone change detected — combat data reset (identity preserved)");
        true
    }

    /// Consumed by the dps calculator to drop its cached snapshot/saved-target
    /// state after a zone-change combat reset.
    pub fn take_combat_reset_requested(&self) -> bool {
        self.combat_reset_requested.swap(false, Ordering::Relaxed)
    }


    pub fn damage_generation(&self) -> i64 {
        self.damage_generation.load(Ordering::Relaxed)
    }

    pub fn set_local_character_name(&self, name: Option<String>) {
        self.inner.write().local_character_name = name;
    }

    pub fn local_character_name(&self) -> Option<String> {
        self.inner.read().local_character_name.clone()
    }

    pub fn set_local_player_id(&self, id: Option<i64>) {
        self.inner.write().local_player_id = id;
    }

    pub fn local_player_id(&self) -> Option<i64> {
        self.inner.read().local_player_id
    }

    pub fn set_player_position(&self, pos: [f32; 3]) {
        self.inner.write().player_position = Some(pos);
    }

    pub fn player_position(&self) -> Option<[f32; 3]> {
        self.inner.read().player_position
    }

    pub fn set_player_map(&self, map: u32) {
        self.inner.write().player_map = Some(map);
    }

    pub fn player_map(&self) -> Option<u32> {
        self.inner.read().player_map
    }

    /// Fallback for the local player when the game's self record was missed. `33 36` comes
    /// once per zone entry: a meter started after you zoned in never learns who you are, and
    /// when it is lost your new entity id (ids are reissued with every zone) fights unnamed
    /// while the local id stays on the old one, so after the reset between two bosses your
    /// row read `#id`. Run every tick: you are the local id while it fights, else the one
    /// unnamed player of your class fighting (none, or several: nothing changes). That id
    /// gets your name if it has none.
    /// Your name and class: the game's (or the one on your id), else `fallback`, the
    /// dashboard's active character.
    pub fn guess_local_player(&self, fallback: Option<(&str, JobClass)>) {
        let mut inner = self.inner.write();
        let local = inner.local_player_id.map(|id| id as i32);
        let name = inner
            .local_character_name
            .clone()
            .or_else(|| local.and_then(|id| inner.nickname_storage.get(&id).cloned()))
            .map(|n| n.trim().to_string())
            .filter(|n| !n.is_empty())
            .or_else(|| fallback.map(|(n, _)| n.trim().to_string()).filter(|n| !n.is_empty()));
        let job = local.and_then(|id| inner.actor_jobs.get(&id).copied()).or(fallback.map(|(_, j)| j));
        // Damage (summons count for their owner) or heals since the last reset.
        let fighting = |inner: &Inner, id: i32| {
            inner.heal_storage.contains_key(&id)
                || inner.target_combat.values().any(|t| {
                    t.actors.keys().any(|&a| summon_resolver::resolve(a, &inner.summon_storage) == id)
                })
        };
        let me = if let Some(l) = local.filter(|&l| fighting(&inner, l)) {
            l
        } else {
            let Some(job) = job else { return };
            let mut found = None;
            for td in inner.target_combat.values() {
                for (&id, a) in &td.actors {
                    // A summon (Divine Aura) or a same-class teammate's first hit is no rotation:
                    // you need three distinct skills before your name moves.
                    if id <= 0
                        || a.job != Some(job)
                        || inner.nickname_storage.contains_key(&id)
                        || inner.summon_storage.contains_key(&id)
                        || inner.summon_spawn_ids.contains(&id)
                        || inner.confirmed_summon_ids.contains(&id)
                        || distinct_skills(a) < 3
                    {
                        continue;
                    }
                    if found.is_some_and(|f| f != id) {
                        return;
                    }
                    found = Some(id);
                }
            }
            match found {
                Some(id) => id,
                None => return,
            }
        };
        if local != Some(me) {
            tracing::info!("local player {:?} -> entity {} ({:?})", local, me, name);
            inner.local_player_id = Some(me as i64);
        }
        if let Some(name) = name {
            if !inner.nickname_storage.contains_key(&me) {
                append_nickname_inner(&mut inner, me, &name);
            }
            // The widget shows this name on your row whenever your id has none yet.
            if inner.local_character_name.as_deref().is_none_or(|n| n.trim().is_empty()) {
                inner.local_character_name = Some(name);
            }
        }
    }

    /// The game sends a party member's name once per zone; when it is missed (or their id
    /// changed: death, reconnect) they fight as `#id` while the name sits on a dead id.
    /// The party roster has every name: if exactly one unnamed player is fighting and
    /// exactly one party name is not on anyone fighting, that name is theirs.
    pub fn name_unnamed_from_party(&self) {
        let mut inner = self.inner.write();
        if inner.party_members.is_empty() {
            return;
        }
        let in_combat: HashSet<i32> = inner
            .target_combat
            .values()
            .flat_map(|t| t.actors.keys().map(|&a| summon_resolver::resolve(a, &inner.summon_storage)))
            .collect();
        let mut unnamed = HashSet::new();
        for td in inner.target_combat.values() {
            for (&id, a) in &td.actors {
                if id > 0
                    && inner.known_player_ids.contains(&id)
                    && !inner.nickname_storage.contains_key(&id)
                    && !inner.summon_storage.contains_key(&id)
                    && !inner.summon_spawn_ids.contains(&id)
                    && !inner.confirmed_summon_ids.contains(&id)
                    && distinct_skills(a) >= 3
                {
                    unnamed.insert(id);
                }
            }
        }
        // More players fighting than the party holds: open world, the unnamed one may be a stranger.
        let players_fighting = in_combat.iter().filter(|id| inner.known_player_ids.contains(id)).count();
        if unnamed.len() != 1 || players_fighting > inner.party_members.len() {
            return;
        }
        // Everyone else fighting must be a named party member (or you): an open-world stranger then
        // can't take an absent member's name.
        let local = inner.local_character_name.as_deref().map(str::trim).unwrap_or("");
        let others_in_party = in_combat.iter().filter(|&&id| inner.known_player_ids.contains(&id) && !unnamed.contains(&id)).all(|id| {
            inner.nickname_storage.get(id).is_some_and(|n| inner.party_members.contains_key(n) || n.trim() == local)
        });
        if !others_in_party {
            return;
        }
        let free: Vec<String> = inner
            .party_members
            .keys()
            .filter(|n| n.trim() != local)
            .filter(|n| !inner.nickname_storage.iter().any(|(id, nn)| nn == *n && in_combat.contains(id)))
            .cloned()
            .collect();
        if free.len() != 1 {
            return;
        }
        let id = *unnamed.iter().next().unwrap();
        tracing::info!("party roster: entity {} named '{}'", id, free[0]);
        append_nickname_inner(&mut inner, id, &free[0]);
    }

    pub fn append_damage(&self, pdp: ParsedDamagePacket) {
        let mut inner = self.inner.write();
        let skill_code = pdp.skill_code();
        let actor_id = pdp.actor_id();
        let target_id = pdp.target_id();

        // NPC actors using NPC skills: track damage received on the player target, then skip
        let uses_npc_skill = (1_000_000..=9_999_999).contains(&skill_code);
        if inner.mob_storage.contains_key(&actor_id)
            && !inner.summon_storage.contains_key(&actor_id)
            && uses_npc_skill
        {
            // Track damage received on the player target
            let resolved_target = summon_resolver::resolve(target_id, &inner.summon_storage);
            if inner.known_player_ids.contains(&resolved_target) {
                let dmg = pdp.total_damage().max(0) as i64;
                let e = inner
                    .mob_hits
                    .entry(actor_id)
                    .or_default()
                    .entry(resolved_target)
                    .or_default();
                e.0 += dmg;
                e.1 += 1;
                self.damage_generation.fetch_add(1, Ordering::Relaxed);
                for target_data in inner.target_combat.values_mut() {
                    if let Some(actor_data) = target_data.actors.get_mut(&resolved_target) {
                        actor_data.damage_received += dmg;
                        actor_data.hits_received += 1;
                        break;
                    }
                }
            }
            return;
        }

        // Track player skill usage. Exclude anything that spawned via a mob/summon
        // spawn (40/41 36): a real player never does, so such an entity dealing
        // class-band damage is a summon / spell-effect, not a player.
        if is_player_skill(skill_code)
            && !inner.confirmed_summon_ids.contains(&actor_id)
            && !inner.summon_spawn_ids.contains(&actor_id)
        {
            let is_new = inner.known_player_ids.insert(actor_id);
            if is_new {
                inner.summon_storage.remove(&actor_id);
                purge_friendly_damage(&mut inner, actor_id);
            }
        }

        // Party healing: player-on-player damage is actually healing/buffs
        if is_friendly_action(&inner, actor_id, target_id) {
            let pvp = is_pvp_hit(&inner, actor_id, target_id);
            let heal_amount = pdp.total_damage();
            if heal_amount > 0 {
                // Record party heal on the actor's data in all targets they appear in
                for target_data in inner.target_combat.values_mut() {
                    if let Some(actor_data) = target_data.actors.get_mut(&actor_id) {
                        actor_data.party_heal += heal_amount as i64;
                        break;
                    }
                }
                // Also record per-skill so ally heals show in the HEAL view (the
                // self-heal path does this via append_heal; mirror it for ally heals).
                let e = inner
                    .heal_storage
                    .entry(actor_id)
                    .or_default()
                    .entry((pdp.skill_code(), false))
                    .or_default();
                e.total_heal += heal_amount as i64;
                e.tick_count += 1;
                if !pvp {
                    note_heal_received(&mut inner, actor_id, target_id, heal_amount as i64);
                }
            }
            if !pvp {
                self.damage_generation.fetch_add(1, Ordering::Relaxed);
                return;
            }
            // Us/party hitting a non-party player: also book it as damage so the
            // PvP target mode has something to show. Heal bookkeeping above is
            // deliberately left as it was.
            inner.pvp_target_ids.insert(target_id);
        }

        // Track hostile targets
        let resolved = summon_resolver::resolve(actor_id, &inner.summon_storage);
        if inner.known_player_ids.contains(&resolved) {
            inner.hostile_target_ids.insert(target_id);
        }

        // Track actor job
        if let Some(job) = JobClass::convert_from_skill(skill_code) {
            inner.actor_jobs.entry(actor_id).or_insert(job);
        }

        // No boss auto-reset here any more: the meter modes are exclusive (a boss
        // view never includes trash), and clearing on the first boss hit wiped
        // the PVE session that keeps counting in the background.

        let timestamp = pdp.timestamp();
        let packet_id = pdp.id();

        // Get or create target combat data
        let target_data = inner.target_combat.entry(target_id).or_insert_with(|| {
            TargetCombatData::new(target_id, timestamp)
        });

        // Idle reset check (30s gap)
        if target_data.last_damage_time > 0
            && timestamp - target_data.last_damage_time > IDLE_RESET_MS
        {
            tracing::info!("Idle reset: target {} — gap {}ms", target_id,
                timestamp - target_data.last_damage_time);
            *target_data = TargetCombatData::new(target_id, timestamp);
        }

        // Update target timing
        if timestamp < target_data.first_damage_time {
            target_data.first_damage_time = timestamp;
        }
        if timestamp > target_data.last_damage_time {
            target_data.last_damage_time = timestamp;
        }
        // A misread varint can still come out negative: never let it subtract.
        let total_dmg = pdp.total_damage().max(0);
        target_data.total_damage += total_dmg as i64;
        target_data.last_packet_id = packet_id;

        // Update actor data within target
        let actor_data = target_data.actors.entry(actor_id).or_insert_with(ActorCombatData::new);
        actor_data.total_damage += total_dmg as i64;
        if timestamp > actor_data.last_damage_time {
            actor_data.last_damage_time = timestamp;
        }
        if actor_data.job.is_none() {
            actor_data.job = JobClass::convert_from_skill(skill_code);
        }

        // Update skill data
        let skill_key = (skill_code, pdp.is_dot());
        let skill_data = actor_data.skills.entry(skill_key).or_insert_with(|| {
            SkillCombatData::new(skill_code, pdp.is_dot())
        });
        skill_data.hit_count += 1;
        // saturating_add: per-skill totals are i32 and a long boss fight can
        // exceed i32::MAX — overflow panics in debug and wraps to negative in
        // release. Cap instead of crashing/wrapping.
        skill_data.total_damage = skill_data.total_damage.saturating_add(total_dmg);
        let hit_dmg = pdp.damage();
        if hit_dmg < skill_data.min_damage { skill_data.min_damage = hit_dmg; }
        if hit_dmg > skill_data.max_damage { skill_data.max_damage = hit_dmg; }
        if pdp.is_crit() { skill_data.crit_count += 1; }
        if pdp.specials().contains(&SpecialDamage::Back) { skill_data.back_count += 1; }
        if pdp.specials().contains(&SpecialDamage::Frontal) { skill_data.frontal_count += 1; }
        if pdp.specials().contains(&SpecialDamage::Parry) { skill_data.parry_count += 1; }
        if pdp.specials().contains(&SpecialDamage::Perfect) { skill_data.perfect_count += 1; }
        if pdp.specials().contains(&SpecialDamage::Double) { skill_data.double_count += 1; }
        if pdp.specials().contains(&SpecialDamage::Smite) { skill_data.smite_count += 1; }
        if pdp.specials().contains(&SpecialDamage::PowerShard) { skill_data.powershard_count += 1; }
        if pdp.multi_hit_count() > 0 {
            skill_data.multi_hit_count += 1;
            skill_data.multi_hit_damage = skill_data.multi_hit_damage.saturating_add(pdp.multi_hit_damage());
            skill_data.multi_hit_hits += pdp.multi_hit_count();
        }
        skill_data.heal_amount = skill_data.heal_amount.saturating_add(pdp.heal_amount());
        // Track regen (life-steal) on the actor aggregate
        let life_steal = pdp.heal_amount() as i64;
        if life_steal > 0 {
            actor_data.regen += life_steal;
        }
        skill_data.hit_timestamps.push(timestamp);
        skill_data.hit_damages.push(total_dmg);
        for (i, &flag) in pdp.spec_flags().iter().enumerate() {
            if flag { skill_data.spec_flags[i] = true; }
        }

        self.damage_generation.fetch_add(1, Ordering::Relaxed);
        self.last_damage_ms.store(now_ms(), Ordering::Relaxed);

        if life_steal > 0 {
            note_heal_received(&mut inner, actor_id, actor_id, life_steal);
        }

        // Apply pending nickname
        apply_pending_nickname(&mut inner, actor_id);
    }

    pub fn append_mob(&self, mid: i32, code: i32) {
        let mut inner = self.inner.write();
        // The embedded-spawn scan can land on a player's id: a protocol-named player
        // fighting right now is never a mob, and filing them as one deleted their damage
        // and pinned them at 0. (An id from an earlier zone may be a mob now: that one passes.)
        if named_player_in_combat(&inner, mid) {
            return;
        }
        inner.mob_storage.insert(mid, code);

        // NPC unclassification: if this entity was previously classified as a player
        // (damage with player-band skills arrived before the 0x3640 spawn packet),
        // undo the classification and scrub ghost player damage from aggregates.
        if inner.known_player_ids.remove(&mid) {
            tracing::debug!("NPC unclassification: entity {} reclassified as mob (code {})", mid, code);
            // Subtract ghost player damage from target totals
            for target_data in inner.target_combat.values_mut() {
                if let Some(actor_data) = target_data.actors.remove(&mid) {
                    target_data.total_damage -= actor_data.total_damage;
                }
            }
        }
    }

    pub fn append_mob_hp(&self, mid: i32, hp: i32) {
        if hp > 0 {
            self.inner.write().mob_hp_data.insert(mid, hp);
        }
    }

    pub fn mark_entity_dead(&self, entity_id: i32) {
        self.inner.write().dead_entity_ids.insert(entity_id);
    }

    pub fn is_entity_dead(&self, entity_id: i32) -> bool {
        self.inner.read().dead_entity_ids.contains(&entity_id)
    }

    pub fn get_dead_entities(&self) -> HashSet<i32> {
        self.inner.read().dead_entity_ids.clone()
    }

    pub fn register_boss(&self, entity_id: i32) {
        self.inner.write().boss_entity_ids.insert(entity_id);
    }

    pub fn is_boss(&self, entity_id: i32) -> bool {
        self.inner.read().boss_entity_ids.contains(&entity_id)
    }

    pub fn is_mob(&self, id: i32) -> bool {
        self.inner.read().mob_storage.contains_key(&id)
    }

    pub fn is_damage_target(&self, id: i32) -> bool {
        self.inner.read().target_combat.contains_key(&id)
    }

    pub fn is_summon(&self, id: i32) -> bool {
        self.inner.read().summon_storage.contains_key(&id)
    }

    pub fn is_confirmed_summon(&self, id: i32) -> bool {
        self.inner.read().confirmed_summon_ids.contains(&id)
    }

    /// Record that `id` appeared in a `40/41 36` mob/summon spawn (never a player
    /// spawn). Used to keep summon / spell-effect entities out of the known-player
    /// set and make them attributable to their same-class player.
    pub fn note_summon_spawn(&self, id: i32) {
        let mut inner = self.inner.write();
        if !named_player_in_combat(&inner, id) {
            inner.summon_spawn_ids.insert(id);
        }
    }

    pub fn get_summon_spawn_ids(&self) -> HashSet<i32> {
        self.inner.read().summon_spawn_ids.clone()
    }

    /// Confirm that a sub-100 entity id is a real entity (seen in a spawn or an
    /// identity record), so the damage parser's `>= 100` resync gate lets it
    /// through. See `Inner::low_id_entities`.
    pub fn note_low_id_entity(&self, id: i32) {
        if (1..100).contains(&id) {
            self.inner.write().low_id_entities.insert(id);
        }
    }

    /// True when `id` passes the entity-id sanity gate used while walking damage
    /// records: anything at or above the usual floor, plus tiny ids the game has
    /// explicitly announced.
    pub fn is_plausible_entity_id(&self, id: i32) -> bool {
        if id >= 100 {
            return true;
        }
        id >= 1 && self.inner.read().low_id_entities.contains(&id)
    }

    /// Take a party roster from a `0x9702` packet.
    ///
    /// `complete` says whether every member the packet declared was decoded. A
    /// complete roster replaces what we had, so a member who left the party
    /// disappears; a partial one only updates the members it did decode, so a
    /// record this parser trips over costs that member a refresh rather than
    /// costing the whole party their combat power.
    pub fn set_party_roster(&self, members: Vec<(String, PartyMember)>, complete: bool) {
        if members.is_empty() {
            return;
        }
        let mut inner = self.inner.write();
        if complete {
            inner.party_members.clear();
        }
        for (name, member) in members {
            inner.party_members.insert(name, member);
        }
    }

    pub fn get_party_members(&self) -> HashMap<String, PartyMember> {
        self.inner.read().party_members.clone()
    }

    /// Record a power-scalar reading for an actor. See `Inner::actor_power_scalars`.
    pub fn note_power_scalar(&self, actor_id: i32, scalar: i32) {
        if actor_id <= 0 || scalar <= 0 {
            return;
        }
        let mut inner = self.inner.write();
        let set = inner.actor_power_scalars.entry(actor_id).or_default();
        // Bounded: buff churn produces a handful of distinct values, not many.
        if set.len() < 16 {
            set.insert(scalar);
        }
    }

    pub fn get_power_scalars(&self) -> HashMap<i32, HashSet<i32>> {
        self.inner.read().actor_power_scalars.clone()
    }

    pub fn register_confirmed_summon_by_id(&self, summon_id: i32, owner_id: i32) {
        tracing::trace!("Summon confirmed (5F 00): {} owned by {}", summon_id, owner_id);
        let mut inner = self.inner.write();
        inner.confirmed_summon_ids.insert(summon_id);
        inner.known_player_ids.remove(&summon_id);
        inner.summon_storage.insert(summon_id, owner_id);
        purge_friendly_damage(&mut inner, summon_id);
    }

    pub fn append_summon(&self, summoner: i32, summon: i32) {
        let mut inner = self.inner.write();

        // Guards from Kotlin
        if inner.nickname_storage.contains_key(&summon) { return; }
        if inner.known_player_ids.contains(&summon) { return; }
        if inner.hostile_target_ids.contains(&summon) { return; }
        if inner.summon_storage.contains_key(&summoner) { return; }
        if inner.mob_storage.contains_key(&summoner) && !inner.summon_storage.contains_key(&summoner) { return; }

        // Job compatibility check
        let summon_job = inner.actor_jobs.get(&summon).copied();
        let owner_job = inner.actor_jobs.get(&summoner).copied();
        if let (Some(sj), Some(oj)) = (summon_job, owner_job) {
            if sj != oj { return; }
        }

        tracing::debug!("Summon linked: {} owned by {}", summon, summoner);
        inner.summon_storage.insert(summon, summoner);
    }

    /// Bind a nickname from a LOWER-CONFIDENCE source (fuzzy actor-name rules,
    /// loot attribution, nickname scan). Gated so it can't corrupt naming:
    ///  1. It may only name an id that is already a real entity — seen in combat,
    ///     a known player, spawn-authoritative, a summon, or already named. This
    ///     rejects names being bound to counter/terminator-derived junk ids (e.g.
    ///     the sequence counter in a `0E 00 36 <counter>` record), which would
    ///     otherwise evict a correct spawn name via the name-eviction rule.
    ///  2. It may not steal a name that an authoritative source already bound to a
    ///     different id.
    pub fn append_nickname(&self, uid: i32, nickname: &str) {
        let mut inner = self.inner.write();
        // A name that arrives before the id's first hit waits for it (applied by
        // `append_damage`, gated again then) instead of leaving the row as `#id`.
        if uid > 0 && !is_real_entity(&inner, uid) {
            if inner.pending_nicknames.len() >= 512 {
                inner.pending_nicknames.clear();
            }
            inner.pending_nicknames.insert(uid, nickname.to_string());
            return;
        }
        if !fuzzy_bind_allowed(&inner, uid, nickname) {
            return;
        }
        append_nickname_inner(&mut inner, uid, nickname);
    }

    /// Bind a nickname from an AUTHORITATIVE source (a masked identity record, a
    /// 45/44 36 player spawn, or the account char-list). Not gated — the id↔name
    /// pairing is stated by the protocol — and marks the id so fuzzy parsers
    /// can't later steal the name. A stale/junk prior binding of this name is
    /// evicted, reclaiming the name to the real id.
    ///
    /// Applied with `force`, so the length/script heuristics that protect against
    /// bad fuzzy scan results cannot reject a real name. Those heuristics cost a
    /// live capture its Ranger: a fuzzy parser had bound the LEGION name
    /// "BaroqueWorks" to that player, and the "don't replace a longer name with a
    /// short ASCII one" rule then refused their actual name, "M7".
    pub fn append_nickname_authoritative(&self, uid: i32, nickname: &str) {
        let mut inner = self.inner.write();
        inner.authoritative_name_ids.insert(uid);
        append_nickname_inner_with_force(&mut inner, uid, nickname, true);
    }

    pub fn set_permanent_nickname(&self, uid: i32, nickname: &str) {
        let mut inner = self.inner.write();
        inner.permanent_nicknames.insert(uid, nickname.to_string());
        // User explicitly set this in settings: authoritative, and force-apply to
        // bypass length/CJK heuristics that protect against bad packet scan results.
        inner.authoritative_name_ids.insert(uid);
        append_nickname_inner_with_force(&mut inner, uid, nickname, true);
    }

    pub fn cache_pending_nickname(&self, uid: i32, nickname: &str) {
        let mut inner = self.inner.write();
        if inner.nickname_storage.contains_key(&uid) { return; }
        inner.pending_nicknames.insert(uid, nickname.to_string());
    }

    pub fn has_nickname(&self, uid: i32) -> bool {
        self.inner.read().nickname_storage.contains_key(&uid)
    }

    pub fn get_nickname(&self, uid: i32) -> Option<String> {
        self.inner.read().nickname_storage.get(&uid).cloned()
    }

    /// Reverse lookup: find entity ID by nickname (for summon owner resolution).
    pub fn find_id_by_nickname(&self, name: &str) -> Option<i32> {
        let inner = self.inner.read();
        for (&id, nick) in &inner.nickname_storage {
            if nick == name {
                return Some(id);
            }
        }
        None
    }

    pub fn actor_appears_in_combat(&self, actor_id: i32) -> bool {
        let inner = self.inner.read();
        // Check if actor appears as an attacker in any target
        for target_data in inner.target_combat.values() {
            if target_data.actors.contains_key(&actor_id) {
                return true;
            }
        }
        // Check if actor is a target
        if inner.target_combat.contains_key(&actor_id) {
            return true;
        }
        inner.summon_storage.contains_key(&actor_id)
    }

    pub fn get_nicknames(&self) -> HashMap<i32, String> {
        self.inner.read().nickname_storage.clone()
    }

    pub fn get_summon_data(&self) -> HashMap<i32, i32> {
        self.inner.read().summon_storage.clone()
    }

    pub fn get_known_player_ids(&self) -> HashSet<i32> {
        self.inner.read().known_player_ids.clone()
    }

    pub fn is_known_player(&self, id: i32) -> bool {
        self.inner.read().known_player_ids.contains(&id)
    }

    pub fn get_pvp_target_ids(&self) -> HashSet<i32> {
        self.inner.read().pvp_target_ids.clone()
    }

    pub fn get_mob_hp_data(&self) -> HashMap<i32, i32> {
        self.inner.read().mob_hp_data.clone()
    }

    pub fn get_mob_hp(&self, id: i32) -> Option<i32> {
        self.inner.read().mob_hp_data.get(&id).copied()
    }

    /// Record a live current-HP reading for an entity (from the `8D ... 02 01 00`
    /// feed). Also seeds/raises the entity's MAX HP from the observed peak, so a
    /// boss whose spawn packet was missed still gets a usable denominator (current
    /// HP never exceeds max in-game, so taking the max never overstates it).
    pub fn set_mob_current_hp(&self, id: i32, hp: i32) {
        if hp < 0 {
            return;
        }
        let mut inner = self.inner.write();
        inner.mob_current_hp.insert(id, hp);
        let max = inner.mob_hp_data.entry(id).or_insert(0);
        if hp > *max {
            *max = hp;
        }
    }

    pub fn get_mob_current_hp(&self, id: i32) -> Option<i32> {
        self.inner.read().mob_current_hp.get(&id).copied()
    }

    /// Stagger gauge reading (`05 E0` long record). Any reading ends a break:
    /// the one after a break is the refill (state 00).
    pub fn set_stagger(&self, id: i32, cur: i32, max: i32) {
        self.inner.write().stagger.insert(id, (cur, max, 0));
    }

    /// Stagger gauge broken (`05 E0` short record): empty, groggy for ~5 s.
    pub fn break_stagger(&self, id: i32) {
        let mut inner = self.inner.write();
        let g = inner.stagger.entry(id).or_insert((0, 0, 0));
        g.0 = 0;
        g.2 = now_ms() + STAGGER_BREAK_MS;
    }

    pub fn get_stagger(&self, id: i32) -> Option<Stagger> {
        self.stagger_at(id, now_ms())
    }

    fn stagger_at(&self, id: i32, now: i64) -> Option<Stagger> {
        let (cur, max, until) = *self.inner.read().stagger.get(&id)?;
        if max <= 0 {
            return None;
        }
        let broken = until > now;
        // Missed refill record: the game refills the gauge when the groggy ends.
        let cur = if until != 0 && !broken { max } else { cur };
        Some(Stagger { cur, max, broken })
    }

    /// Record a heal tick done by `actor_id` with `skill_code` (is_hot marks a HoT).
    /// Keyed by the healer so "healing done" can be shown per player. Self-heals count.
    pub fn append_heal(&self, actor_id: i32, target_id: i32, skill_code: i32, amount: i64, is_hot: bool) {
        if amount <= 0 || !self.is_plausible_entity_id(actor_id) {
            return;
        }
        let receiver_ok = target_id == actor_id || self.is_plausible_entity_id(target_id);
        let mut inner = self.inner.write();
        let e = inner
            .heal_storage
            .entry(actor_id)
            .or_default()
            .entry((skill_code, is_hot))
            .or_default();
        e.total_heal += amount;
        e.tick_count += 1;
        if receiver_ok {
            note_heal_received(&mut inner, actor_id, target_id, amount);
        }
        self.damage_generation.fetch_add(1, Ordering::Relaxed);
    }

    /// Healing received per player: (from self incl. life steal, from others).
    pub fn get_heals_received(&self) -> HashMap<i32, (i64, i64)> {
        self.inner.read().heal_received.clone()
    }

    /// Hits landed by each mob on each player: mob -> player -> (damage, hits).
    pub fn get_mob_hits(&self) -> HashMap<i32, HashMap<i32, (i64, i32)>> {
        self.inner.read().mob_hits.clone()
    }

    pub fn get_heal_snapshot(&self) -> HashMap<i32, HashMap<(i32, bool), HealSkillData>> {
        self.inner.read().heal_storage.clone()
    }

    pub fn get_mob_data(&self) -> HashMap<i32, i32> {
        self.inner.read().mob_storage.clone()
    }

    pub fn set_current_target(&self, target: i32) {
        self.inner.write().current_target = target;
    }

    pub fn current_target(&self) -> i32 {
        self.inner.read().current_target
    }

    /// Get a snapshot of all target combat aggregates.
    /// This is cheap: clones a small map of aggregates, not raw packets.
    pub fn get_combat_snapshot(&self) -> HashMap<i32, TargetCombatData> {
        self.inner.read().target_combat.clone()
    }

    /// Like `get_combat_snapshot` but without per-skill `hit_timestamps`.
    /// `hit_timestamps` grows unbounded over a fight and is only needed by
    /// `get_target_details`. The 500ms hot paths (`get_dps`,
    /// `get_details_context`, boss auto-save) never read it, so this keeps
    /// their per-tick clone cost flat over fight duration instead of growing
    /// linearly — the root cause of the long-fight FPS drops.
    pub fn get_combat_snapshot_light(&self) -> HashMap<i32, TargetCombatData> {
        let inner = self.inner.read();
        inner
            .target_combat
            .iter()
            .map(|(&tid, td)| {
                let actors = td
                    .actors
                    .iter()
                    .map(|(&aid, ad)| {
                        let skills = ad
                            .skills
                            .iter()
                            .map(|(&k, sd)| (k, sd.clone_light()))
                            .collect();
                        (
                            aid,
                            ActorCombatData {
                                total_damage: ad.total_damage,
                                party_heal: ad.party_heal,
                                regen: ad.regen,
                                damage_received: ad.damage_received,
                                hits_received: ad.hits_received,
                                last_damage_time: ad.last_damage_time,
                                job: ad.job,
                                skills,
                            },
                        )
                    })
                    .collect();
                (
                    tid,
                    TargetCombatData {
                        target_id: td.target_id,
                        total_damage: td.total_damage,
                        first_damage_time: td.first_damage_time,
                        last_damage_time: td.last_damage_time,
                        last_packet_id: td.last_packet_id,
                        actors,
                    },
                )
            })
            .collect()
    }

    pub fn flush(&self) {
        let mut inner = self.inner.write();
        inner.target_combat.clear();
        inner.actor_jobs.clear();
        inner.summon_storage.clear();
        inner.known_player_ids.clear();
        inner.confirmed_summon_ids.clear();
        inner.summon_spawn_ids.clear();
        inner.actor_power_scalars.clear();
        inner.hostile_target_ids.clear();
        inner.pvp_target_ids.clear();
        inner.dead_entity_ids.clear();
        inner.mob_hp_data.clear();
        inner.mob_current_hp.clear();
        inner.stagger.clear();
        inner.heal_storage.clear();
        inner.heal_received.clear();
        inner.mob_hits.clear();
        inner.current_target = 0;
    }

    /// Clear only the per-segment combat/damage aggregates, preserving player
    /// identity: nicknames, known-player ids, summon ownership, and job classes.
    /// Used on a zone-change / in-instance-teleport reset so the meter starts on
    /// clean numbers without dropping who your party and you are.
    pub fn flush_combat_only(&self) {
        let mut inner = self.inner.write();
        inner.target_combat.clear();
        inner.hostile_target_ids.clear();
        inner.pvp_target_ids.clear();
        inner.dead_entity_ids.clear();
        inner.mob_hp_data.clear();
        inner.mob_current_hp.clear();
        inner.stagger.clear();
        inner.heal_storage.clear();
        inner.heal_received.clear();
        inner.mob_hits.clear();
        inner.current_target = 0;
    }

    /// Your self record came with a new id: the game reissued every entity id (packets_20261011_183820: 5214
    /// was a stranger, "Cama", before it was you). Names, players, summons and mobs kept under the old ids label
    /// whoever gets them next, so all of it goes, the old zone's numbers too; the new zone's records fill it again.
    pub fn forget_old_zone(&self) {
        self.flush();
        self.reset_nicknames();
        {
            let mut inner = self.inner.write();
            inner.mob_storage.clear();
            inner.boss_entity_ids.clear();
            inner.low_id_entities.clear();
        }
        self.combat_reset_requested.store(true, Ordering::Relaxed);
    }

    pub fn reset_nicknames(&self) {
        let mut inner = self.inner.write();
        inner.nickname_storage.clear();
        inner.pending_nicknames.clear();
        inner.authoritative_name_ids.clear();
        let permanent: Vec<(i32, String)> = inner.permanent_nicknames.iter().map(|(&k, v)| (k, v.clone())).collect();
        for (uid, nick) in permanent {
            inner.nickname_storage.insert(uid, nick);
        }
    }
}

/// A rotation, not a summon's one or two abilities: distinct skill codes, DoT or not.
fn distinct_skills(a: &ActorCombatData) -> usize {
    a.skills.keys().map(|&(c, _)| c).collect::<HashSet<_>>().len()
}

fn named_player_in_combat(inner: &Inner, id: i32) -> bool {
    inner.authoritative_name_ids.contains(&id)
        && inner.known_player_ids.contains(&id)
        && inner.target_combat.values().any(|t| t.actors.contains_key(&id))
}

/// A counter/terminator-derived junk id (e.g. `0E 00 36 <counter>`) never appears
/// in combat, is never a known player/summon, was never spawned, and has no name yet.
fn is_real_entity(inner: &Inner, uid: i32) -> bool {
    inner.nickname_storage.contains_key(&uid)
        || inner.known_player_ids.contains(&uid)
        || inner.authoritative_name_ids.contains(&uid)
        || inner.summon_storage.contains_key(&uid)
        || inner.target_combat.contains_key(&uid)
        || inner
            .target_combat
            .values()
            .any(|t| t.actors.contains_key(&uid))
}

/// Gate for lower-confidence nickname bindings (see `append_nickname`).
fn fuzzy_bind_allowed(inner: &Inner, uid: i32, nickname: &str) -> bool {
    // (1) The id must already be a real entity, so a junk id can no longer evict
    // a correct spawn name.
    if !is_real_entity(inner, uid) {
        return false;
    }
    // (1b) Never name a mob. An entity that spawned as an NPC (`41 36` with a
    // type code) is not a player, but a mob's position updates (`23 36 <id>
    // <coordinates>`) are exactly the `36 <id> … 07 <len> <text>` shape the loose
    // scanners anchor on; coordinate bytes spelling a "name" turned the mob into
    // a player, and our hits on it moved out of the PVE/boss views (Taiwan
    // report: the meter stopped counting when a mob moved). Summons are named
    // through their owner, never via this path.
    if inner.mob_storage.contains_key(&uid) && !inner.summon_storage.contains_key(&uid) {
        return false;
    }
    // (2) Don't let a fuzzy source steal a name an authoritative source already
    // bound to a different id.
    for (&id, name) in &inner.nickname_storage {
        if id != uid && name == nickname && inner.authoritative_name_ids.contains(&id) {
            return false;
        }
    }
    // (3) Don't let a fuzzy source rename an id the protocol already named. The
    // spawn packets carry the owner's LEGION name a few fields past their
    // character name, and the loose scanners happily bind that to the player —
    // which is how a live capture ended up showing a legion ("BaroqueWorks")
    // where a Ranger's name should have been.
    if inner.authoritative_name_ids.contains(&uid)
        && inner.nickname_storage.get(&uid).is_some_and(|n| n != nickname)
    {
        return false;
    }
    true
}

fn has_cjk(s: &str) -> bool {
    s.chars().any(|ch| {
        let cp = ch as u32;
        (0x4E00..=0x9FFF).contains(&cp) || (0xAC00..=0xD7AF).contains(&cp)
        || (0x3400..=0x4DBF).contains(&cp) || (0x20000..=0x2A6DF).contains(&cp)
        || (0x1100..=0x11FF).contains(&cp)
    })
}

fn append_nickname_inner(inner: &mut Inner, uid: i32, nickname: &str) {
    append_nickname_inner_with_force(inner, uid, nickname, false);
}

fn append_nickname_inner_with_force(inner: &mut Inner, uid: i32, nickname: &str, force: bool) {
    let existing = inner.nickname_storage.get(&uid);
    if let Some(existing) = existing {
        if existing == nickname {
            if let Some(ref local_name) = inner.local_character_name {
                if local_name.trim() == nickname.trim() {
                    inner.local_player_id = Some(uid as i64);
                }
            }
            return;
        }
        if !force {
            // Don't replace a CJK name with a shorter ASCII-only name (likely false positive)
            let existing_cjk = has_cjk(existing);
            let new_cjk = has_cjk(nickname);
            if existing_cjk && !new_cjk && nickname.len() < existing.len() {
                tracing::debug!("Nickname: keeping CJK '{}' for {}, rejecting ASCII '{}'", existing, uid, nickname);
                return;
            }
            // Don't replace a longer name with a short ASCII-only name (2-byte rule generalized)
            if !new_cjk && nickname.as_bytes().len() <= 5 && existing.as_bytes().len() > nickname.as_bytes().len() {
                tracing::debug!("Nickname: keeping '{}' for {}, rejecting shorter '{}'", existing, uid, nickname);
                return;
            }
        }
        tracing::trace!("Nickname: replacing '{}' with '{}' for {}{}",
            existing, nickname, uid, if force { " (forced)" } else { "" });
    } else {
        tracing::trace!("Nickname: setting '{}' for {}{}",
            nickname, uid, if force { " (forced)" } else { "" });
    }

    // Name eviction: character names are unique per server, so if this name
    // already belongs to a different entity ID, that old ID is stale (zone change).
    // Evict the old entity's name, player status, and summon mappings regardless
    // of whether the old entity was ever classified as a player.
    let evicted_ids: Vec<i32> = inner.nickname_storage.iter()
        .filter(|&(&old_id, old_name)| old_name == nickname && old_id != uid)
        .map(|(&old_id, _)| old_id)
        .collect();
    for old_id in evicted_ids {
        tracing::debug!("Name eviction: '{}' moved from entity {} to {}", nickname, old_id, uid);
        inner.nickname_storage.remove(&old_id);
        inner.known_player_ids.remove(&old_id);
        inner.authoritative_name_ids.remove(&old_id);
        inner.pending_nicknames.remove(&old_id);
        if !force {
            // A fuzzy source can be wrong: never hand someone else's numbers to it.
            inner.summon_storage.retain(|_, &mut owner| owner != old_id);
            for target_data in inner.target_combat.values_mut() {
                if let Some(actor_data) = target_data.actors.remove(&old_id) {
                    target_data.total_damage -= actor_data.total_damage;
                }
            }
            continue;
        }
        // The protocol says it is the same person on a new id: carry what they did (and
        // their summons) onto it. Deleting it restarted them from 0 mid-boss, and left a
        // name-only row behind for the healing.
        for owner in inner.summon_storage.values_mut() {
            if *owner == old_id {
                *owner = uid;
            }
        }
        for target_data in inner.target_combat.values_mut() {
            if let Some(old) = target_data.actors.remove(&old_id) {
                match target_data.actors.get_mut(&uid) {
                    Some(cur) => merge_actor(cur, old),
                    None => {
                        target_data.actors.insert(uid, old);
                    }
                }
            }
        }
        if let Some(old) = inner.heal_storage.remove(&old_id) {
            let cur = inner.heal_storage.entry(uid).or_default();
            for (k, h) in old {
                let e = cur.entry(k).or_default();
                e.total_heal += h.total_heal;
                e.tick_count += h.tick_count;
            }
        }
        if let Some(old) = inner.heal_received.remove(&old_id) {
            let e = inner.heal_received.entry(uid).or_default();
            e.0 += old.0;
            e.1 += old.1;
        }
        if inner.local_player_id == Some(old_id as i64) {
            inner.local_player_id = Some(uid as i64);
        }
    }

    inner.nickname_storage.insert(uid, nickname.to_string());

    if !inner.confirmed_summon_ids.contains(&uid) {
        inner.summon_storage.remove(&uid);
    }

    if !inner.confirmed_summon_ids.contains(&uid) {
        let is_new = inner.known_player_ids.insert(uid);
        if is_new {
            purge_friendly_damage(inner, uid);
        }
    }

    if let Some(ref local_name) = inner.local_character_name {
        if local_name.trim() == nickname.trim() {
            inner.local_player_id = Some(uid as i64);
        }
    }
}

/// Book `amount` of healing on the receiver (summons resolve to their owner).
fn note_heal_received(inner: &mut Inner, healer: i32, receiver: i32, amount: i64) {
    let healer = summon_resolver::resolve(healer, &inner.summon_storage);
    let receiver = summon_resolver::resolve(receiver, &inner.summon_storage);
    let e = inner.heal_received.entry(receiver).or_default();
    if healer == receiver {
        e.0 += amount;
    } else {
        e.1 += amount;
    }
}

fn apply_pending_nickname(inner: &mut Inner, uid: i32) {
    if inner.nickname_storage.contains_key(&uid) { return; }
    if let Some(pending) = inner.pending_nicknames.remove(&uid) {
        if fuzzy_bind_allowed(inner, uid, &pending) {
            append_nickname_inner(inner, uid, &pending);
        }
    }
}

fn is_friendly_action(inner: &Inner, actor_id: i32, target_id: i32) -> bool {
    let resolved_actor = summon_resolver::resolve(actor_id, &inner.summon_storage);
    let resolved_target = summon_resolver::resolve(target_id, &inner.summon_storage);
    // A named, non-mob target is a player even before it casts its first skill:
    // otherwise a heal on it at the pull is booked as PvE damage and then lost.
    let target_is_player = inner.known_player_ids.contains(&resolved_target)
        || (inner.nickname_storage.contains_key(&resolved_target)
            && !inner.mob_storage.contains_key(&resolved_target));
    inner.known_player_ids.contains(&resolved_actor) && target_is_player
}

/// The local player or a party member (by roster name). Party membership is the
/// only friend/foe signal the packets are known to carry — there is no faction
/// field decoded — so any other player counts as a potential PvP target.
fn is_ally(inner: &Inner, id: i32) -> bool {
    inner.local_player_id == Some(id as i64)
        || inner
            .nickname_storage
            .get(&id)
            .is_some_and(|name| inner.party_members.contains_key(name))
}

/// Player-on-player record from us/our party onto a player outside the party.
/// The `04 38` record carries no heal/damage flag, so a heal cast on a
/// non-party ally also matches this; that is why it only feeds the PvP mode.
fn is_pvp_hit(inner: &Inner, actor_id: i32, target_id: i32) -> bool {
    let actor = summon_resolver::resolve(actor_id, &inner.summon_storage);
    let target = summon_resolver::resolve(target_id, &inner.summon_storage);
    is_ally(inner, actor) && !is_ally(inner, target)
}

/// Remove friendly-fire damage from aggregates when a new player is identified.
fn merge_actor(dst: &mut ActorCombatData, src: ActorCombatData) {
    dst.total_damage += src.total_damage;
    dst.party_heal += src.party_heal;
    dst.regen += src.regen;
    dst.damage_received += src.damage_received;
    dst.hits_received += src.hits_received;
    dst.last_damage_time = dst.last_damage_time.max(src.last_damage_time);
    dst.job = dst.job.or(src.job);
    for (key, s) in src.skills {
        let Some(d) = dst.skills.get_mut(&key) else {
            dst.skills.insert(key, s);
            continue;
        };
        d.hit_count += s.hit_count;
        d.total_damage = d.total_damage.saturating_add(s.total_damage);
        d.min_damage = d.min_damage.min(s.min_damage);
        d.max_damage = d.max_damage.max(s.max_damage);
        d.crit_count += s.crit_count;
        d.back_count += s.back_count;
        d.frontal_count += s.frontal_count;
        d.parry_count += s.parry_count;
        d.perfect_count += s.perfect_count;
        d.double_count += s.double_count;
        d.smite_count += s.smite_count;
        d.powershard_count += s.powershard_count;
        d.multi_hit_count += s.multi_hit_count;
        d.multi_hit_damage = d.multi_hit_damage.saturating_add(s.multi_hit_damage);
        d.multi_hit_hits += s.multi_hit_hits;
        d.heal_amount = d.heal_amount.saturating_add(s.heal_amount);
        d.hit_timestamps.extend(s.hit_timestamps);
        d.hit_damages.extend(s.hit_damages);
        for (i, f) in s.spec_flags.into_iter().enumerate() {
            d.spec_flags[i] |= f;
        }
    }
}

fn purge_friendly_damage(inner: &mut Inner, _uid: i32) {
    let mut to_remove: Vec<(i32, Vec<i32>)> = Vec::new();
    let mut pvp_targets = Vec::new();

    for (&target_id, target_data) in &inner.target_combat {
        let mut actors_to_remove = Vec::new();
        for &actor_id in target_data.actors.keys() {
            if is_friendly_action(inner, actor_id, target_id) {
                if is_pvp_hit(inner, actor_id, target_id) {
                    pvp_targets.push(target_id);
                    continue;
                }
                actors_to_remove.push(actor_id);
            }
        }
        if !actors_to_remove.is_empty() {
            to_remove.push((target_id, actors_to_remove));
        }
    }
    inner.pvp_target_ids.extend(pvp_targets);

    for (target_id, actor_ids) in to_remove {
        if let Some(target_data) = inner.target_combat.get_mut(&target_id) {
            for actor_id in actor_ids {
                if let Some(actor_data) = target_data.actors.remove(&actor_id) {
                    target_data.total_damage -= actor_data.total_damage;
                }
            }
            if target_data.actors.is_empty() {
                inner.target_combat.remove(&target_id);
            }
        }
    }
}

pub fn is_player_skill(skill_code: i32) -> bool {
    // Class skills: 11M-19M (post-divide 110K-190K, encodes class in first 2 digits)
    // Alternate band: 3M-3.99M (post-divide 30K-39.9K)
    // Basic/special attacks: 100K-199K (post-divide 1K-1.9K)
    (11_000_000..=19_999_999).contains(&skill_code)
        || (3_000_000..=3_999_999).contains(&skill_code)
        || (100_000..=199_999).contains(&skill_code)
}

#[cfg(test)]
mod pvp_tests {
    use super::*;

    const ME: i32 = 100;
    const MATE: i32 = 300;
    const FOE: i32 = 200;
    const OTHER: i32 = 400;
    const MOB: i32 = 900;
    const SKILL: i32 = 11_020_000; // player class band

    fn hit(s: &DataStorage, actor: i32, target: i32, dmg: i32) {
        let mut p = ParsedDamagePacket::new();
        p.set_actor_id(actor);
        p.set_target_id(target);
        p.set_skill_code(SKILL);
        p.set_damage(dmg);
        s.append_damage(p);
    }

    /// Local player 100, party mate 300 ("Mate"); 200 and 400 are strangers.
    /// Every player hits a mob first so all four are known players.
    fn setup() -> DataStorage {
        let s = DataStorage::new();
        s.set_local_player_id(Some(ME as i64));
        s.append_nickname_authoritative(MATE, "Mate");
        s.set_party_roster(vec![("Mate".to_string(), PartyMember::default())], true);
        for id in [ME, MATE, FOE, OTHER] {
            hit(&s, id, MOB, 10);
        }
        s
    }

    #[test]
    fn my_hit_on_stranger_is_pvp_damage_and_heal_book_unchanged() {
        let s = setup();
        hit(&s, ME, FOE, 500);
        hit(&s, MATE, FOE, 300);
        assert!(s.get_pvp_target_ids().contains(&FOE));
        let combat = s.get_combat_snapshot_light();
        let foe = combat.get(&FOE).expect("PvP target recorded");
        assert_eq!(foe.total_damage, 800);
        assert_eq!(foe.actors[&ME].total_damage, 500);
        assert_eq!(foe.actors[&MATE].total_damage, 300);
        // Heal bookkeeping is exactly what it was before PvP existed.
        assert_eq!(s.get_heal_snapshot()[&ME][&(SKILL, false)].total_heal, 500);
    }

    #[test]
    fn hits_between_allies_or_strangers_stay_out_of_combat() {
        let s = setup();
        hit(&s, ME, MATE, 500); // heal/buff on party mate
        hit(&s, MATE, ME, 500);
        hit(&s, FOE, OTHER, 500); // two strangers fighting
        hit(&s, FOE, ME, 500); // stranger on me: not booked as our damage
        assert!(s.get_pvp_target_ids().is_empty());
        let combat = s.get_combat_snapshot_light();
        assert_eq!(combat.keys().copied().collect::<Vec<_>>(), vec![MOB]);
    }

    #[test]
    fn early_hit_on_unknown_player_survives_purge_as_pvp() {
        let s = DataStorage::new();
        s.set_local_player_id(Some(ME as i64));
        hit(&s, ME, MOB, 10);
        hit(&s, ME, FOE, 700); // FOE not yet known as a player
        assert!(s.get_pvp_target_ids().is_empty());
        hit(&s, FOE, MOB, 10); // FOE identified -> purge runs
        assert!(s.get_pvp_target_ids().contains(&FOE));
        assert_eq!(s.get_combat_snapshot_light()[&FOE].total_damage, 700);
    }

    #[test]
    fn heal_on_named_mate_before_its_first_skill_is_a_heal() {
        let s = DataStorage::new();
        s.set_local_player_id(Some(ME as i64));
        s.append_nickname_authoritative(MATE, "Mate");
        s.set_party_roster(vec![("Mate".to_string(), PartyMember::default())], true);
        hit(&s, ME, MOB, 10);
        hit(&s, ME, MATE, 900); // MATE has a name but has not cast yet
        assert!(!s.get_combat_snapshot_light().contains_key(&MATE));
        assert_eq!(s.get_heal_snapshot()[&ME][&(SKILL, false)].total_heal, 900);
    }

    #[test]
    fn flush_clears_pvp_targets() {
        let s = setup();
        hit(&s, ME, FOE, 500);
        s.flush_combat_only();
        assert!(s.get_pvp_target_ids().is_empty());
    }
}

#[cfg(test)]
mod stagger_tests {
    use super::*;

    #[test]
    fn missed_refill_closes_the_break_after_the_timeout() {
        let s = DataStorage::new();
        s.set_stagger(7, 3, 40);
        s.break_stagger(7);
        let now = now_ms();
        assert_eq!(s.stagger_at(7, now), Some(Stagger { cur: 0, max: 40, broken: true }));
        assert_eq!(s.stagger_at(7, now + STAGGER_BREAK_MS + 1), Some(Stagger { cur: 40, max: 40, broken: false }));
    }
}

#[cfg(test)]
mod guess_local_tests {
    use super::*;

    const MOB: i32 = 900;

    /// A rotation: three distinct Gladiator skills (one skill alone looks like a summon).
    fn hit(s: &DataStorage, actor: i32) {
        for code in [11_020_000, 11_030_000, 11_040_000] {
            let mut p = ParsedDamagePacket::new();
            p.set_actor_id(actor);
            p.set_target_id(MOB);
            p.set_skill_code(code);
            p.set_damage(10);
            s.append_damage(p);
        }
    }

    #[test]
    fn a_single_skill_entity_does_not_take_my_name() {
        let s = DataStorage::new();
        let mut p = ParsedDamagePacket::new();
        p.set_actor_id(100);
        p.set_target_id(MOB);
        p.set_skill_code(11_020_000);
        p.set_damage(10);
        s.append_damage(p);
        s.guess_local_player(Some(("Me", JobClass::Gladiator)));
        assert_eq!(s.local_player_id(), None);
    }

    #[test]
    fn binds_the_one_unnamed_player_of_my_class() {
        let s = DataStorage::new();
        s.append_nickname_authoritative(300, "Mate");
        hit(&s, 100);
        hit(&s, 300);
        s.guess_local_player(Some(("Me", JobClass::Gladiator)));
        assert_eq!(s.local_player_id(), Some(100));
        assert_eq!(s.get_nickname(100).as_deref(), Some("Me"));
        // The widget reads it to name your row while your id has no name yet.
        assert_eq!(s.local_character_name().as_deref(), Some("Me"));
    }

    #[test]
    fn keeps_me_while_i_fight_next_to_an_unnamed_player_of_my_class() {
        let s = DataStorage::new();
        s.set_local_character_name(Some("Me".to_string()));
        s.append_nickname_authoritative(100, "Me");
        hit(&s, 100);
        hit(&s, 200);
        s.guess_local_player(None);
        assert_eq!(s.local_player_id(), Some(100));
        assert_eq!(s.get_nickname(200), None);
    }

    /// Entity ids are reissued with every zone and `33 36` (your name on your new id) is
    /// sent once: when it is lost, after the reset between two bosses your new id hit
    /// unnamed while the local id stayed on the old one, and your row read `#6653`.
    #[test]
    fn follows_my_new_id_after_the_reset_between_two_bosses() {
        let s = DataStorage::new();
        s.set_local_character_name(Some("Me".to_string()));
        s.append_nickname_authoritative(100, "Me"); // self record on zone entry
        s.append_nickname_authoritative(300, "Mate");
        hit(&s, 100);
        hit(&s, 300);
        assert_eq!(s.local_player_id(), Some(100));
        s.flush_combat_only(); // automatic reset after the boss
        s.append_nickname_authoritative(301, "Mate"); // the mate's spawn names his new id
        hit(&s, 6653); // you, new id, self record missed
        hit(&s, 301);
        s.guess_local_player(None);
        assert_eq!(s.local_player_id(), Some(6653));
        assert_eq!(s.get_nickname(6653).as_deref(), Some("Me"));
    }

    #[test]
    fn a_name_moving_to_a_new_id_keeps_the_damage() {
        let s = DataStorage::new();
        s.append_nickname_authoritative(300, "Mate");
        hit(&s, 300);
        s.append_nickname_authoritative(301, "Mate"); // died, came back on a new id
        let t = s.get_combat_snapshot();
        let actors = &t[&MOB].actors;
        assert!(!actors.contains_key(&300));
        assert_eq!(actors[&301].total_damage, 30);
    }

    #[test]
    fn a_name_before_the_first_hit_waits_for_it() {
        let s = DataStorage::new();
        s.append_nickname(500, "Early");
        assert_eq!(s.get_nickname(500), None);
        hit(&s, 500);
        assert_eq!(s.get_nickname(500).as_deref(), Some("Early"));
    }

    #[test]
    fn the_party_roster_names_the_one_unnamed_fighter() {
        let s = DataStorage::new();
        s.set_local_character_name(Some("Me".to_string()));
        s.append_nickname_authoritative(100, "Me");
        hit(&s, 100);
        hit(&s, 400);
        s.set_party_roster(
            vec![("Me".to_string(), PartyMember::default()), ("Mate".to_string(), PartyMember::default())],
            true,
        );
        s.name_unnamed_from_party();
        assert_eq!(s.get_nickname(400).as_deref(), Some("Mate"));
    }

    #[test]
    fn binds_nobody_when_two_unnamed_players_share_my_class() {
        let s = DataStorage::new();
        hit(&s, 100);
        hit(&s, 200);
        s.guess_local_player(Some(("Me", JobClass::Gladiator)));
        assert_eq!(s.local_player_id(), None);
    }
}
