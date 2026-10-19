//! Local character capture: worn equipment and skill bar, read from the game packets.
//!
//! Layouts found in a capture recorded while putting on pants, cape and weapon and moving
//! a skill on the bar (packets_20261011_121052). Offsets start right after
//! `<len varint><opcode 2 bytes>`; integers are little-endian.
//!
//! `8D E2` worn equipment, the whole list, sent again on every equip change:
//!   `01 01 01 <count u8> { <item uid u64> <slot u8> } × count`
//!   e.g. `01 01 01 11 | e12b110000ca0000 01 | e8e60e0000cb0000 02 | 027e150000a90000 03 | ...`
//!   Slots proven by the items moved: 1 weapon, 3 helmet, 6 pants, 0x13 cape.
//! `1B 56` one inventory item, sent when it moves (bag ↔ worn):
//!   `<3 bytes> <item uid u64> <item id u32> <u32> <u32> <container u8> <slot u8> ...`
//!   container 0x0B = worn (slot as in `8D E2`), 0x01 = bag.
//!   e.g. `01 01 01 | 4da51b00003f0000 | 1802880c | 01000000 00000000 | 0b 06` = pants 210240024 worn in slot 6.
//!   Item ids are NCSoft's numeric item ids (210240024), not the archive's string codes.
//! `11 56` the whole inventory, sent once on entering the world (packets_20261011_144836, Gladiator
//!   with 20 worn pieces). Records vary in length; a worn one ends like the `1B 56` body:
//!   `<item uid u64> <item id u32> 01000000 00000000 0B <slot u8>`
//!   e.g. `056c1900004b0000 83739006 01000000 00000000 0b 01` = Enraged Kromede Claymore (110130051), weapon.
//!   Slots: 1 weapon, 2 off-hand, 3 helmet, 4 pauldrons, 5 top, 6 pants, 7 gloves, 8 boots, 0x0A necklace,
//!   0x0B-0x0C earrings, 0x0D-0x0E rings, 0x0F-0x10 bracelets, 0x11 belt, 0x13 cape, 0x16 amulet,
//!   0x17-0x18 runes; 0x29-0x2D hold 810xxxxxx ids missing from the item data.
//!   Enhancement (+N, both packets): 12 zero bytes after the slot, then the level as one byte; some records carry
//!   one more zero there, so it is the byte at +12 or else +13 (packets_20261011_183820: Cleric mace 110730048 +10
//!   and top 210130038 +10 at 18:48:04, Gladiator +10..+14 pieces and +4 runes at 18:40:29). ~14 bytes later a
//!   u32 holds the item level with the enhancement added (mace 45 + 10 = 0x37).
//! `93 E2` skill bar, the whole bar, sent again on every change:
//!   `01 <count u8> { <kind u8> <bar u8> <slot u8> [kind 3: <skill id u32>] 04 <4 × u32> } × count`
//!   kind 3 = the slot holds a skill, 2 = empty; slots 0-7 and 20-23. The 4 u32 are the slot's column in the
//!   game's bar window, rows 0-3 bottom to top (0 = empty): row 0 is the skill itself, rows 1-3 the skills
//!   chained to it, Stigmas among them. A game screenshot of the Gladiator's bar matches its set 1 of 18:48:56
//!   (7 skills, chains of 4, 4, 3): `03 01 01 30ccad00 04 30ccad00 e008ad00 801eac00 d0ffa700` = Rage Burst
//!   in slot 1 with Lifestealing Blade (Stigma), Sword Aura Rampage, Rending Blow above it, as in game.
//!   e.g. `03 01 07 d0c50401 04 d0c50401 f0f50901 b0770401 70bd0801` = Light of Regeneration (17090000) in
//!   slot 7, Prayer of Amplification (Stigma), Chain of Torment, Condemnation above it.
//!   Window columns left to right, from that screenshot: slots 2 3 4 5 | 20 21 22 23 | 6 7 | 0 | 1 (2, 20, 22,
//!   6, 7, 0, 1 seen there, the rest by their group); slot 0 has no chain rows.
//! `8C E2` at login (packets_20261011_183820): the worn sets, then the bar list as in `93 E2` for the 3 bars
//!   (the window's set 1-3, the entry's second byte): `01 24 { <kind> <bar> <slot> ... }` = 3 bars × 12 slots.
//! `26 E2` Daevanion nodes taken, all of them, sent once on entering the world (packets_20261011_183820, 4 logins):
//!   `<boards u8> { <board key u32> <count u8> <node id u32> × count } × boards`; the board key is class digit × 10
//!   + board (11-16 Gladiator, 71-76 Cleric), the node ids are the archive's (`gladiator:110113`), the Start node
//!   of each board included. e.g. `05 0b000000 59 21ae0100 d1ad0100 ...` = board 11, 89 nodes, first 110113.
//! `28 E2` one node taken in game: `00 00 <node id u32>` (18:42:03, 120067 and one more).
//! `45 36` another player's spawn, `33 36` your own (same layout, packets_20261011_183820): after
//!   `<entity id varint> <mask1 u32> <mask2 u8> [mask2 & 1: <len u8><name>]` and ~600-700 bytes of stats and
//!   looks comes the worn list, one ~33-byte record per slot (the weapon's a few bytes longer, and some lists have
//!   up to ~100 bytes of other data between two records):
//!   `<tag u8> <item id u32> <enhancement u8> <slot u8> <8 × 00> <u32> 00 03 <~11 × 00>`
//!   e.g. DrBlacK (entity 8761): `0f c3809306 0c 01 0000000000000000 …` = dagger 110330051 +12 in slot 1,
//!   `0e c461890c 0a 02 0000000000000000 a71bcb01 0003 …` = helmet 210330052 +10 in slot 2.
//!   The tag varies (0f, 0e, 0a, bb 0e …), so the records are found by `<id> <enh> <slot> <8 × 00>` with the
//!   slot counting 1, 2, 3 … Slots: 1 weapon, 2 helmet, 3 pauldrons, 4 top, 5 pants, 6 gloves, 7 boots, 8 cape,
//!   9 necklace, 10-11 earrings; 12-15 always id 0. An empty slot has id 0 and is left out.
//! Gear score and combat power, your own only (proven against the party roster `02 97`, packets_20261011_032131:
//!   Allalon item level 836, combat power 49900; packets_20261011_183820: 912 and 52553 in all three):
//! `1D 56` gear score `<now u32> <best u32>`, `56 36` combat power `<now u64> <best u64>`, sent at login and on every
//!   gear change. "now" drops while a piece is off or the gear is still loading (Gladiator logins: 82141 of 110579),
//!   "best" stays on the full set, so "best" is the one kept. e.g. `0e1d56 66030000 8c030000` = 870 of 908.
//! `33 36` your own record also carries both: after the name `<world u16> <u32> <u8> <level u32> <gs u32> <gs u32>
//!   <level u32>`, and near its end `02 17 05`, 32 bytes, `<cp u64> <cp u64>` (e.g. `2d000000 44030000 44030000
//!   2d000000` = level 45, item level 836). It comes on every zone change, so it covers a capture started in game.
//! Item options, own items only (`11 56` worn records and `1B 56`, packets_20261013_031645 Allalon login and
//!   packets_20261011_183820 Gladiator logins). After the enhancement, ~13 zero bytes (one fewer in some `11 56`
//!   records, as before the enhancement) and then:
//!   `<level u32> <worn slot u8> <n u8> { <manastone item id u32> <stat u16> <tier u8> } × n <9 bytes> 03 <13 bytes>
//!    <n u8> { <stat u16> <value u32> } × n ...` (the 13 bytes are 12 in some records, like the zeros above).
//!   level: the item level the game shows, enhancement and manastones in (Spiritforged Mace 45 +10 = 55 with empty
//!   sockets on 10/11, 63 with 4 stones of tier 1+3+2+2 on 10/13; the Global archive's level is the base 45, the
//!   Taiwan one says 57). Manastone: the stone (531360001 = 下級魔石) and its rolled stat; the record carries no
//!   value, only the tier (1-3). The second list holds the bonus stats as raw values (percent ×100), on an Arcana its
//!   main stat with the enhancement in (810130001 Grail of Vigor +2: `0b00 16000000` = Time 22, 20 at +0).
//!   e.g. Judicator Greaves `26000000 06 03 <3 × 7 zeros> 690804000000ff0801 03 <13 × 00> 03 8000 14000000
//!   3e01 19000000 c800 10000000` = level 38, 3 empty sockets, Critical 20, Accuracy 25, MP Regen 16.
//! `00 90` the pet collection, sent once on entering the world (packets_20261013_031645, Allalon login 03:17):
//!   `<u32> <count varint> { <pet id u32> <pet id u32> <level u32> } × count <count varint> { <pet id u32> <exp u32> }
//!   × count`. Pet ids are the TW archive's (1001-1325, its icon names the creature code); level 1-3; exp is the
//!   progress of the level (0-75, missing = 0), the second list also holds unowned pets (their unlock progress).
//!   e.g. `52040000 a501 | ea030000 ea030000 01000000 | ...` = 165 pets, 1002 at level 1; 163 of the game's 200
//!   without the 2 Special ones.

use std::collections::{BTreeMap, VecDeque};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};

use super::stream_processor::read_varint;

#[derive(Serialize, Deserialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WornItem {
    pub slot: u8,
    pub item_id: u32,
    pub enchant: u8,
}

/// A stat of an own item: the game's stat id, its stat key when certain (see item_stat), the raw value.
#[derive(Serialize, Clone, PartialEq, Debug)]
pub struct ItemStat {
    pub id: u16,
    pub stat: Option<&'static str>,
    pub value: u32,
}

/// A manastone set in an own item: the stone's item id, its stat (id, key when certain) and tier 1-3.
#[derive(Serialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Manastone {
    pub item_id: u32,
    pub id: u16,
    pub stat: Option<&'static str>,
    pub tier: u8,
}

/// What the game sends only for your own items (layout in the header). Default: a record out of shape.
#[derive(Serialize, Clone, PartialEq, Debug, Default)]
pub struct ItemExtras {
    pub level: Option<u32>,
    pub bonus: Vec<ItemStat>,
    pub manastones: Vec<Manastone>,
}

/// One of your worn items: the item and its options.
#[derive(Serialize, Clone, PartialEq, Debug)]
pub struct OwnItem {
    #[serde(flatten)]
    pub item: WornItem,
    #[serde(flatten)]
    pub extras: ItemExtras,
}

#[derive(Serialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BarSkill {
    /// Set 1-3 of the bar window.
    pub bar: u8,
    pub slot: u8,
    /// Row 0.
    pub skill_id: u32,
    /// Rows 1-3, chained to it; 0 = empty.
    pub chain: [u32; 3],
}

/// What `get_captured_character` returns. Worn slots whose item was never seen in a `1B 56` are left out.
#[derive(Serialize, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CapturedCharacter {
    /// Who wears `equipment`: the self record's name after the last login inventory. None until the game says it
    /// (on a character switch the inventory comes ~7 s before the self record, packets_20261011_183820).
    pub owner: Option<String>,
    pub equipment: Vec<OwnItem>,
    pub skillbar: Vec<BarSkill>,
    /// Daevanion node ids taken, as in the archive without the class (`110113` of `gladiator:110113`).
    pub daevanion: Vec<u32>,
    /// Item level and combat power of the character being played; None until the game sends them after a login.
    pub gear_score: Option<u32>,
    pub combat_power: Option<u64>,
    /// Pet collection (`00 90`): empty until the game sends it after a login.
    pub pets: Vec<CapturedPet>,
    /// The collection's owned effects (genus insight, tail of `00 90`), raw stat values.
    pub pet_effects: Vec<CapturedPetEffect>,
}

#[derive(Serialize, Clone, PartialEq, Debug)]
pub struct CapturedPetEffect {
    pub stat: &'static str,
    pub value: u32,
}

#[derive(Serialize, Clone, PartialEq, Debug)]
pub struct CapturedPet {
    pub id: u32,
    pub lvl: u8,
    pub exp: u8,
}

struct State {
    /// Last `8D E2` list: (slot, item uid).
    worn: Vec<(u8, u64)>,
    /// Item uid → (item id, enhancement, options), from `1B 56` and `11 56`.
    items: BTreeMap<u64, (u32, u8, ItemExtras)>,
    skillbar: Vec<BarSkill>,
    owner: Option<String>,
    daevanion: Vec<u32>,
    gear_score: Option<u32>,
    combat_power: Option<u64>,
    pets: Vec<CapturedPet>,
    pet_effects: Vec<CapturedPetEffect>,
}

static STATE: Mutex<State> = Mutex::new(State {
    worn: Vec::new(),
    items: BTreeMap::new(),
    skillbar: Vec::new(),
    owner: None,
    daevanion: Vec::new(),
    gear_score: None,
    combat_power: None,
    pets: Vec::new(),
    pet_effects: Vec::new(),
});

/// Your own item level and combat power: a `now`/`best` pair whose best is kept. Out of range or now above best:
/// not a pair of these, leave the last good values. Ranges as for the party roster (stream_processor).
fn set_gear_score(now: u32, best: u32) {
    if (1..=1_000_000).contains(&best) && now <= best {
        STATE.lock().unwrap_or_else(|e| e.into_inner()).gear_score = Some(best);
    }
}

fn set_combat_power(now: u64, best: u64) {
    if (1..=100_000_000).contains(&best) && now <= best {
        STATE.lock().unwrap_or_else(|e| e.into_inner()).combat_power = Some(best);
    }
}

/// Your own entry of the party roster (stream_processor), the same figures the game shows there.
pub fn set_power(gear_score: i32, combat_power: i64) {
    set_gear_score(gear_score as u32, gear_score as u32);
    set_combat_power(combat_power as u64, combat_power as u64);
}

/// The self record named the character being played (stream_processor).
pub fn set_owner(name: &str) {
    STATE.lock().unwrap_or_else(|e| e.into_inner()).owner = Some(name.to_string());
}

pub fn snapshot() -> CapturedCharacter {
    let s = STATE.lock().unwrap_or_else(|e| e.into_inner());
    CapturedCharacter {
        owner: s.owner.clone(),
        equipment: s
            .worn
            .iter()
            .filter_map(|&(slot, uid)| {
                s.items.get(&uid).map(|(item_id, enchant, extras)| OwnItem { item: WornItem { slot, item_id: *item_id, enchant: *enchant }, extras: extras.clone() })
            })
            .collect(),
        skillbar: s.skillbar.clone(),
        daevanion: s.daevanion.clone(),
        gear_score: s.gear_score,
        combat_power: s.combat_power,
        pets: s.pets.clone(),
        pet_effects: s.pet_effects.clone(),
    }
}

/// Worn lists from player spawns, newest last: entity id → items (slots as in `45 36`).
/// Entity ids are reissued on every zone change, so only the newest record of an id counts.
static PLAYER_GEAR: Mutex<VecDeque<(i32, Vec<WornItem>)>> = Mutex::new(VecDeque::new());
const PLAYER_GEAR_CAP: usize = 2000;

/// Gear last seen on the player with this entity id; empty when their spawn was never read.
pub fn player_gear(entity_id: i32) -> Vec<WornItem> {
    let g = PLAYER_GEAR.lock().unwrap_or_else(|e| e.into_inner());
    g.iter().rev().find(|(id, _)| *id == entity_id).map(|(_, items)| items.clone()).unwrap_or_default()
}

fn u32_at(p: &[u8], i: usize) -> Option<u32> {
    p.get(i..i + 4).map(|b| u32::from_le_bytes(b.try_into().unwrap()))
}

fn u64_at(p: &[u8], i: usize) -> Option<u64> {
    p.get(i..i + 8).map(|b| u64::from_le_bytes(b.try_into().unwrap()))
}

/// Hook for every framed packet.
pub fn parse(packet: &[u8]) {
    let len = read_varint(packet, 0);
    if len.length <= 0 {
        return;
    }
    let op = len.length as usize;
    let body = match packet.get(op + 2..) {
        Some(b) => b,
        None => return,
    };
    match (packet[op], packet[op + 1]) {
        (0x8D, 0xE2) => parse_worn(body),
        (0x1B, 0x56) => parse_item(body),
        (0x11, 0x56) => parse_inventory(body),
        (0x93, 0xE2) => parse_skillbar(body),
        (0x8C, 0xE2) => parse_login_bars(body),
        (0x26, 0xE2) => parse_daevanion(body),
        (0x00, 0x90) => parse_pets(body),
        (0x0D, 0x90) => parse_pet_progress(body),
        (0x45, 0x36) => parse_spawn_gear(body),
        (0x33, 0x36) => {
            parse_spawn_gear(body);
            parse_self_power(body);
        }
        (0x1D, 0x56) if body.len() == 8 => set_gear_score(u32_at(body, 0).unwrap_or(0), u32_at(body, 4).unwrap_or(0)),
        (0x56, 0x36) if body.len() == 16 => set_combat_power(u64_at(body, 0).unwrap_or(0), u64_at(body, 8).unwrap_or(0)),
        (0x28, 0xE2) => {
            if let (Some([0, 0]), Some(node)) = (body.get(..2), u32_at(body, 2)) {
                let mut s = STATE.lock().unwrap_or_else(|e| e.into_inner());
                if !s.daevanion.contains(&node) {
                    s.daevanion.push(node);
                }
            }
        }
        _ => {}
    }
}

/// Enhancement level of the record whose slot byte is at `slot_at`.
fn enchant_at(b: &[u8], slot_at: usize) -> u8 {
    match b.get(slot_at + 13) {
        Some(0) => b.get(slot_at + 14).copied().unwrap_or(0),
        Some(&e) => e,
        None => 0,
    }
}

fn parse_worn(b: &[u8]) {
    if b.len() < 4 || b[..3] != [1, 1, 1] {
        return;
    }
    let mut worn = Vec::new();
    for i in 0..b[3] as usize {
        let e = 4 + i * 9;
        // The slot byte of the last entry can be cut off by the framing: skip that entry then.
        match (u64_at(b, e), b.get(e + 8)) {
            (Some(uid), Some(&slot)) => worn.push((slot, uid)),
            _ => break,
        }
    }
    STATE.lock().unwrap_or_else(|e| e.into_inner()).worn = worn;
}

/// Options of the worn record whose slot byte is at `slot_at` (layout in the header); default when out of shape.
fn item_extras(b: &[u8], slot_at: usize) -> ItemExtras {
    let slot = b.get(slot_at).copied().unwrap_or(0);
    let level = |e: usize| u32_at(b, e - 4).filter(|&l| l > 0).or_else(|| u32_at(b, e - 5).filter(|&l| l > 0));
    // The worn slot again, then the socket count: the level is the u32 before it (one byte earlier in some records).
    let Some(e) = (slot_at + 29..slot_at + 36).find(|&e| b.get(e) == Some(&slot) && b.get(e + 1).is_some_and(|&n| n <= 6) && level(e).is_some()) else {
        return ItemExtras::default();
    };
    let mut out = ItemExtras { level: level(e), ..Default::default() };
    let n = b[e + 1] as usize;
    for k in 0..n {
        let o = e + 2 + 7 * k;
        let (Some(item_id), Some(id), Some(&tier)) = (u32_at(b, o), b.get(o + 4..o + 6), b.get(o + 6)) else { return out };
        let id = u16::from_le_bytes([id[0], id[1]]);
        if item_id != 0 {
            out.manastones.push(Manastone { item_id, id, stat: item_stat(id), tier });
        }
    }
    let q = e + 2 + 7 * n + 10;
    if b.get(q - 1) != Some(&3) {
        return out;
    }
    let q = if b.get(q + 12).is_some_and(|&c| c > 0) { q + 12 } else { q + 13 };
    let count = b.get(q).copied().unwrap_or(0) as usize;
    let mut bonus = Vec::new();
    for k in 0..count.min(8) {
        let o = q + 1 + 6 * k;
        let (Some(id), Some(value)) = (b.get(o..o + 2), u32_at(b, o + 2)) else { return out };
        let id = u16::from_le_bytes([id[0], id[1]]);
        bonus.push(ItemStat { id, stat: item_stat(id), value });
    }
    if count <= 8 {
        out.bonus = bonus;
    }
    out
}

fn parse_item(b: &[u8]) {
    if let (Some(uid), Some(item)) = (u64_at(b, 3), u32_at(b, 11)) {
        let extras = if b.get(23) == Some(&0x0B) { item_extras(b, 24) } else { ItemExtras::default() };
        STATE.lock().unwrap_or_else(|e| e.into_inner()).items.insert(uid, (item, enchant_at(b, 24), extras));
    }
}

fn parse_inventory(b: &[u8]) {
    const WORN_TAIL: [u8; 9] = [1, 0, 0, 0, 0, 0, 0, 0, 0x0B];
    let mut s = STATE.lock().unwrap_or_else(|e| e.into_inner());
    let mut worn = Vec::new();
    for p in 12..b.len().saturating_sub(WORN_TAIL.len()) {
        if b[p..p + WORN_TAIL.len()] != WORN_TAIL {
            continue;
        }
        if let (Some(uid), Some(item), Some(&slot)) = (u64_at(b, p - 12), u32_at(b, p - 4), b.get(p + WORN_TAIL.len())) {
            let at = p + WORN_TAIL.len();
            s.items.insert(uid, (item, enchant_at(b, at), item_extras(b, at)));
            worn.push((slot, uid));
        }
    }
    // A later page with only bag items must not wipe the worn list.
    if !worn.is_empty() {
        s.worn = worn;
        s.owner = None; // a login: the character may be another one
        s.gear_score = None;
        s.combat_power = None;
        s.pets.clear();
    }
}

/// The bar list at `b`: the bars it carries (bit per bar number) and their skills. None when the bytes are not one.
fn read_skillbar(b: &[u8]) -> Option<(u8, Vec<BarSkill>)> {
    if b.len() < 2 || b[0] != 1 {
        return None;
    }
    let (mut bars, mut list) = (0u8, Vec::new());
    let mut o = 2;
    for _ in 0..b[1] {
        let (kind, bar, slot) = match (b.get(o), b.get(o + 1), b.get(o + 2)) {
            (Some(&k @ (2 | 3)), Some(&n @ 1..=3), Some(&s)) => (k, n, s),
            _ => return None,
        };
        bars |= 1 << bar;
        o += 3;
        let skill_id = if kind == 3 {
            let id = u32_at(b, o)?;
            o += 4;
            id
        } else {
            0
        };
        if b.get(o) != Some(&4) {
            return None;
        }
        let row = |i: usize| u32_at(b, o + 1 + 4 * i);
        let chain = [row(1)?, row(2)?, row(3)?];
        if kind == 3 {
            list.push(BarSkill { bar, slot, skill_id, chain });
        }
        o += 1 + 16; // 04 <4 × u32>
    }
    Some((bars, list))
}

/// The bars in `b` replace the ones kept; unknown layout: keep the last good bars.
fn store_bars(read: Option<(u8, Vec<BarSkill>)>) {
    if let Some((bars, list)) = read {
        let mut s = STATE.lock().unwrap_or_else(|e| e.into_inner());
        s.skillbar.retain(|x| bars & (1 << x.bar) == 0);
        s.skillbar.extend(list);
        s.skillbar.sort_by_key(|x| (x.bar, x.slot));
    }
}

fn parse_skillbar(b: &[u8]) {
    store_bars(read_skillbar(b));
}

/// `8C E2` at login: the worn sets, then the bars as in `93 E2`; the bar list starts where one reads whole.
fn parse_login_bars(b: &[u8]) {
    store_bars((0..b.len()).filter(|&o| b[o] == 1 && b.get(o + 1).is_some_and(|&n| n >= 12)).find_map(|o| read_skillbar(&b[o..])));
}

fn parse_daevanion(b: &[u8]) {
    let mut nodes = Vec::new();
    let mut o = 1;
    for _ in 0..*b.first().unwrap_or(&0) {
        let count = match b.get(o + 4) {
            Some(&c) => c as usize,
            None => return, // cut short: keep the last good list
        };
        o += 5;
        for i in 0..count {
            match u32_at(b, o + i * 4) {
                Some(node) => nodes.push(node),
                None => return,
            }
        }
        o += count * 4;
    }
    STATE.lock().unwrap_or_else(|e| e.into_inner()).daevanion = nodes;
}

/// `00 90`: the whole collection replaces the last one; anything out of shape keeps the last good one.
fn parse_pets(b: &[u8]) {
    let count = |o: usize| {
        let v = read_varint(b, o);
        (v.length > 0 && v.value >= 0).then(|| (v.value as usize, o + v.length as usize))
    };
    let Some((n, mut o)) = count(4) else { return };
    let mut pets = Vec::with_capacity(n);
    for _ in 0..n {
        let (Some(id), Some(id2), Some(lvl)) = (u32_at(b, o), u32_at(b, o + 4), u32_at(b, o + 8)) else { return };
        if id != id2 || !(1000..10_000).contains(&id) || !(1..=3).contains(&lvl) {
            return;
        }
        pets.push(CapturedPet { id, lvl: lvl as u8, exp: 0 });
        o += 12;
    }
    let Some((n, mut o)) = count(o) else { return };
    for _ in 0..n {
        let (Some(id), Some(exp)) = (u32_at(b, o), u32_at(b, o + 4)) else { return };
        if let Some(p) = pets.iter_mut().find(|p| p.id == id && p.lvl < 3) {
            p.exp = exp.min(75) as u8;
        }
        o += 8;
    }
    let effects = pet_insight(b, o);
    let mut s = STATE.lock().unwrap_or_else(|e| e.into_inner());
    s.pets = pets;
    // A tail out of shape keeps the last good effects.
    if let Some(effects) = effects {
        s.pet_effects = effects;
    }
}

/// `0d 90`, one per kill that counts for a pet (packets_20261019_015229: 11 kills of Kerubiel / Kerubian, 11 records,
/// +7 and +4 against the next `00 90`): `<count varint> { <pet id u32> <exp gained u32> } × count`, e.g.
/// `01 93040000 01000000` = Cherubim_03 +1. Added to the collection read at login, so the counter moves with each kill;
/// the next `00 90` replaces it with the game's own numbers. A level up has not been seen yet: exp stops at 75.
fn parse_pet_progress(b: &[u8]) {
    let n = read_varint(b, 0);
    if n.length <= 0 || n.value <= 0 {
        return;
    }
    let mut s = STATE.lock().unwrap_or_else(|e| e.into_inner());
    let mut o = n.length as usize;
    for _ in 0..n.value {
        let (Some(id), Some(gain)) = (u32_at(b, o), u32_at(b, o + 4)) else { return };
        if let Some(p) = s.pets.iter_mut().find(|p| p.id == id && p.lvl < 3) {
            p.exp = (p.exp as u32).saturating_add(gain).min(75) as u8;
        }
        o += 8;
    }
}

/// Stat ids of the insight options, as far as they are certain (ranges of pet-insight + the character's own values)
/// or follow from the race blocks (8 ids per genus: Damage, Defense, Accuracy, Evasion, Critical, CriticalResist, ?,
/// Block). Ids still open (44, 52, 100, 587, 588, 591: several stats fit their ranges) are not counted.
fn insight_stat(id: u16) -> Option<&'static str> {
    const RACE: [[Option<&str>; 8]; 4] = [
        [Some("IntellectDamage"), Some("IntellectDefense"), Some("IntellectAccuracy"), Some("IntellectEvasion"), Some("IntellectCritical"), Some("IntellectCriticalResist"), None, Some("IntellectBlock")],
        [Some("FeralDamage"), Some("FeralDefense"), Some("FeralAccuracy"), Some("FeralEvasion"), Some("FeralCritical"), Some("FeralCriticalResist"), None, Some("FeralBlock")],
        [Some("NatureDamage"), Some("NatureDefense"), Some("NatureAccuracy"), Some("NatureEvasion"), Some("NatureCritical"), Some("NatureCriticalResist"), None, Some("NatureBlock")],
        [Some("TransDamage"), Some("TransDefense"), Some("TransAccuracy"), Some("TransEvasion"), Some("TransCritical"), Some("TransCriticalResist"), None, Some("TransBlock")],
    ];
    match id {
        56 => Some("PvEAddDamage"),
        57 => Some("PvEDamageDefense"),
        193 => Some("HPMax"),
        199 => Some("MPMax"),
        393..=424 => RACE[(id as usize - 393) / 8][(id as usize - 393) % 8],
        _ => None,
    }
}

/// Stat ids of item options and manastones (same ids as the pet insight), as far as certain: the Arcana main stats
/// (810xxxxxx records against the archive's Arcana, 5 of them), and ids whose value fits a single stat of the Global
/// item's rolled ranges in every capture (~25 items) or is left with one stat once those are taken (3 INT, 200 MPRegen).
/// Ids still open, not counted: 1 and 5 (STR or AGI), 2 (DEX or WIS), 133 and 194 (CriticalResist or HPRegen), 255
/// and 312 (ArmorEvasion or Block), 146, 147, 41, 99, 588 (several defenses), 104 and 116 (manastones only).
fn item_stat(id: u16) -> Option<&'static str> {
    match id {
        3 => Some("INT"),
        4 => Some("CON"),
        8 => Some("Freedom"),
        9 => Some("Illusion"),
        10 => Some("Life"),
        11 => Some("Time"),
        13 => Some("Destruction"),
        44 => Some("AmplifyCriticalDamage"),
        128 => Some("Critical"),
        200 => Some("MPRegen"),
        307 => Some("ArmorDefense"),
        317 => Some("WeaponFixingDamage"),
        318 => Some("WeaponAccuracy"),
        445 => Some("IronWall"),
        _ => insight_stat(id),
    }
}

/// Tail of `00 90` after the two pet lists (packets_20261013_031645, Allalon login; same in 5 captures):
///   `<n u8> { <u8> <u32> } × n  00  <genera u8> { <genus u8> <genus u8> <level u32> <exp u32> <u32>
///    <sets u8> { <set u8> <n u8> { <slot u8> <grade u8> <stat u16> <value u16> <6 × 00> } × n } × sets } × genera`
/// After the 1st, 5th, 9th... option (counted across all genera) the game inserts a byte of 2-bit flags for that
/// option and the next three (bit 0: option locked). Only set 1 is in use (2 and 3 are all zeros).
fn pet_insight(b: &[u8], mut o: usize) -> Option<Vec<CapturedPetEffect>> {
    let u8_at = |i: usize| b.get(i).copied();
    let nh = u8_at(o)? as usize;
    o += 1 + nh * 5 + 1;
    let genera = u8_at(o)?;
    o += 1;
    let mut flags_left = 0;
    let mut out = Vec::new();
    for _ in 0..genera {
        u32_at(b, o + 10)?;
        o += 14;
        let sets = u8_at(o)?;
        o += 1;
        for _ in 0..sets {
            let (set, n) = (u8_at(o)?, u8_at(o + 1)?);
            o += 2;
            for _ in 0..n {
                let rec = b.get(o..o + 12)?;
                let stat = u16::from_le_bytes([rec[2], rec[3]]);
                let value = u16::from_le_bytes([rec[4], rec[5]]);
                o += 12;
                if flags_left == 0 {
                    u8_at(o)?;
                    o += 1;
                    flags_left = 4;
                }
                flags_left -= 1;
                if set == 1 && value > 0 {
                    if let Some(stat) = insight_stat(stat) {
                        out.push(CapturedPetEffect { stat, value: value as u32 });
                    }
                }
            }
        }
    }
    Some(out)
}

/// Item ids of wearable families in the archive: 110/115/150 weapons, 210/215/250 armour, 310/311 accessories.
fn wearable(id: u32) -> bool {
    matches!(id / 1_000_000, 110 | 115 | 150 | 210 | 215 | 250 | 310 | 311)
}

/// `<id u32> <enhancement ≤ 30> <slot> <8 × 00>` at `p`, with id 0 (empty) allowed after the weapon slot.
fn gear_record(b: &[u8], p: usize, slot: u8) -> Option<(u32, u8)> {
    let id = u32_at(b, p)?;
    let (&enchant, &at) = (b.get(p + 4)?, b.get(p + 5)?);
    let ok = at == slot && enchant <= 30 && b.get(p + 6..p + 14)? == [0; 8] && (wearable(id) || (id == 0 && slot > 1));
    ok.then_some((id, enchant))
}

/// Item level and combat power from your own `33 36` record (layout in the header).
fn parse_self_power(b: &[u8]) {
    let id = read_varint(b, 0);
    let mask2 = id.length.max(0) as usize + 4;
    if id.length <= 0 || !matches!(b.get(mask2), Some(m) if m & 1 == 1) {
        return;
    }
    let p = mask2 + 2 + *b.get(mask2 + 1).unwrap_or(&0) as usize; // after the name
    // The level twice around the two item levels: anything else is not this layout.
    if let (Some(level), Some(gs), Some(best), Some(level2)) = (u32_at(b, p + 7), u32_at(b, p + 11), u32_at(b, p + 15), u32_at(b, p + 19)) {
        if (1..=200).contains(&level) && level == level2 {
            set_gear_score(gs, best);
        }
    }
    if let Some(m) = b.windows(3).rposition(|w| w == [0x02, 0x17, 0x05]).filter(|&m| m > p) {
        if let (Some(cp), Some(best)) = (u64_at(b, m + 35), u64_at(b, m + 43)) {
            set_combat_power(cp, best);
        }
    }
}

fn parse_spawn_gear(b: &[u8]) {
    let id = read_varint(b, 0);
    if id.length <= 0 || !(1..=9_999_999).contains(&id.value) {
        return;
    }
    let mask2 = id.length as usize + 4;
    let mut p = match b.get(mask2) {
        Some(m) if m & 1 == 1 => mask2 + 2 + *b.get(mask2 + 1).unwrap_or(&0) as usize,
        Some(_) => mask2 + 1,
        None => return,
    };
    let mut items = Vec::new();
    let mut window = b.len(); // the weapon: anywhere after the name
    for slot in 1..=15u8 {
        let Some((q, item_id, enchant)) = (p..b.len().min(p + window)).find_map(|q| gear_record(b, q, slot).map(|(i, e)| (q, i, e))) else {
            break;
        };
        if item_id != 0 {
            items.push(WornItem { slot, item_id, enchant });
        }
        p = q + 14;
        window = 160;
    }
    if items.is_empty() {
        return;
    }
    let mut g = PLAYER_GEAR.lock().unwrap_or_else(|e| e.into_inner());
    g.retain(|(e, _)| *e != id.value);
    g.push_back((id.value, items));
    if g.len() > PLAYER_GEAR_CAP {
        g.pop_front();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn hex(s: &str) -> Vec<u8> {
        (0..s.len()).step_by(2).map(|i| u8::from_str_radix(&s[i..i + 2], 16).unwrap()).collect()
    }

    fn worn() -> Vec<WornItem> {
        snapshot().equipment.into_iter().map(|e| e.item).collect()
    }

    // One test: the parser keeps global state.
    #[test]
    fn equipment_and_skillbar_from_capture() {
        // 12:11:49.445: pants (uid 4da51b..) put on, worn list of 17 items.
        parse(&hex("a3018de201010111e12b110000ca000001e8e60e0000cb000002027e150000a900000380c319000090000004d9320c0000fa0000054da51b00003f000006daa2160000c600000799a90e0000e0000008386d1b00002e00000a0e49150000ce00000ba36d1b00002f00000c4f3e100000f400000dfa96050000ff00000e07be170000be00000f45df190000a4000011f7da1a00003f00001347a018000095000016"));
        parse(&hex("9a011b560101014da51b00003f00001802880c01000000000000000b06000000000000000000000000000000000000000000000000000000260000000603000000"));
        // 12:11:51.504: cape; 12:11:55.737: weapon.
        parse(&hex("a7011b56010101f7da1a00003f0000367c8f0c01000000000000000b1300000000000000"));
        parse(&hex("7d1b56010101e12b110000ca0000409b990601000000000000000b0100000000000000"));
        assert_eq!(
            worn(),
            vec![
                WornItem { slot: 1, item_id: 110730048, enchant: 0 },
                WornItem { slot: 6, item_id: 210240024, enchant: 0 },
                WornItem { slot: 0x13, item_id: 210730038, enchant: 0 },
            ]
        );

        // 12:11:40.445: Lightning Barrage moved back to slot 1.
        parse(&hex("980293e2010c030100508d030104508d0301000000000000000000000000030101900b090104900b0901000000000000000000000000030102e0ec040104e0ec0401003b05010000000000000000030103001d0a0104001d0a01000000000000000000000000030104d0a7090104d0a709010000000000000000000000000201050400000000000000000000000000000000030106a050040104a0500401000000000000000000000000030107d0c5040104d0c50401f0f50901b077040170bd0801020114040000000000000000000000000000000002011504000000000000000000000000000000000201160400000000000000000000000000000000030117c080090104c080090130b00501c09e040180020401"));
        let bar: Vec<(u8, u32)> = snapshot().skillbar.iter().map(|s| (s.slot, s.skill_id)).collect();
        assert_eq!(
            bar,
            vec![(0, 17010000), (1, 17370000), (2, 17100000), (3, 17440000), (4, 17410000), (6, 17060000), (7, 17090000), (23, 17400000)]
        );
        // Rows 1-3 of slot 7: Prayer of Amplification (a Stigma), Chain of Torment, Condemnation.
        let s7 = snapshot().skillbar.into_iter().find(|s| s.slot == 7).unwrap();
        assert_eq!((s7.bar, s7.chain), (1, [17430000, 17070000, 17350000]));

        // packets_20261011_144836, 14:50:19.263: login inventory, two worn records (claymore +12, cape +10),
        // the cape with the extra zero before its enhancement.
        parse(&hex("975811561002ac0100c9c6130000ae00056c1900004b00008373900601000000000000000b010000000000000000000000000c000000000000000000000000006d000000010403bc7a1e680002035d00050000f70000457c8f0c01000000000000000b13000000000000000000000000000a0000000000000000000000000066000000130403bc7a1ec10003"));
        assert_eq!(worn(), vec![WornItem { slot: 1, item_id: 110130051, enchant: 12 }, WornItem { slot: 0x13, item_id: 210730053, enchant: 10 }]);
        // The inventory comes before the self record: nobody owns it until the self record names the character.
        assert_eq!(snapshot().owner, None);
        set_owner("Agniezska");
        assert_eq!(snapshot().owner.as_deref(), Some("Agniezska"));

        // packets_20261011_183820, 18:48:04.231: Cleric login, Spiritforged Mace +10 (item level 45 + 10 = 0x37).
        parse(&hex("9758115610027800e9d8170000e90000e6e2140000f40000409b990601000000000000000b01000000000000000000000000000a0000000000000000000000000037000000010400000000000000"));
        assert_eq!(worn(), vec![WornItem { slot: 1, item_id: 110730048, enchant: 10 }]);
        // Its item level as the game shows it (45 + 10), 4 empty sockets, no bonus stats.
        let mace = snapshot().equipment.remove(0).extras;
        assert_eq!((mace.level, mace.manastones.len(), mace.bonus.len()), (Some(55), 0, 0));

        // packets_20261011_183820, 18:48:56.278: the Gladiator's bars at login (8C E2, from the bar list on), sets 1
        // and 2 filled, 3 empty: they replace the Cleric's set 1 above.
        parse(&hex(&[
            "7f8ce2010101000124030100e026a80004e026a80000000000000000000000000003010130ccad000430ccad00e008ad00801eac00d0ffa700030102f0beaa0004f0beaa000000000000000000000000000201030400000000000000000000000000000000020104040000",
            "00000000000000000000000000000201050400000000000000000000000000000000030106109ca80004109ca800000000000000000000000000030107605fa90004605fa9000000000000000000000000000301140057ad00040057ad009045ac00a06c",
            "ac0000e6aa00020115040000000000000000000000000000000003011640f3ad000440f3ad0050a9ab00d070aa00000000000201170400000000000000000000000000000000030200e026a80004e026a80000000000000000000000000003020130ccad",
            "000430ccad00d070aa00d0ffa7000000000003020200e6aa000400e6aa00801eac00000000000000000002020304000000000000000000000000000000000202040400000000000000000000000000000000020205040000000000000000000000000000",
            "0000030206605fa90004605fa9004011a90000000000000000000302077086a900047086a9000000000000000000000000000302140057ad00040057ad009045ac00a06cac0000000000030215109ca80004109ca8000000000000000000000000000302",
            "1620a5ad000420a5ad00000000000000000000000000030217f0beaa0004f0beaa00000000000000000000000000020300040000000000000000000000000000000002030104000000000000000000000000000000000203020400000000000000000000",
            "00000000000002030304000000000000000000000000000000000203040400000000000000000000000000000000020305040000000000000000000000000000000002030604000000000000000000000000000000000203070400000000000000000000",
            "0000000000000203140400000000000000000000000000000000020315040000000000000000000000000000000002031604000000000000000000000000000000000203170400000000000000000000000000000000",
        ]
        .concat()));
        let bar: Vec<(u8, u8, u32)> = snapshot().skillbar.iter().map(|s| (s.bar, s.slot, s.skill_id)).collect();
        let set1 = vec![(1, 0, 11020000), (1, 1, 11390000), (1, 2, 11190000), (1, 6, 11050000), (1, 7, 11100000), (1, 20, 11360000), (1, 22, 11400000)];
        assert_eq!(bar[..7], set1[..]);
        assert_eq!(bar.len(), 7 + 9);
        // Set 1, slot 1: Rage Burst, then Lifestealing Blade (Stigma), Sword Aura Rampage, Rending Blow, as in game.
        assert_eq!(snapshot().skillbar[1].chain, [11340000, 11280000, 11010000]);
        // A later `93 E2` of set 1 replaces set 1 only (here the Cleric's, from 12:11:40).
        parse(&hex("980293e2010c030100508d030104508d0301000000000000000000000000030101900b090104900b0901000000000000000000000000030102e0ec040104e0ec0401003b05010000000000000000030103001d0a0104001d0a01000000000000000000000000030104d0a7090104d0a709010000000000000000000000000201050400000000000000000000000000000000030106a050040104a0500401000000000000000000000000030107d0c5040104d0c50401f0f50901b077040170bd0801020114040000000000000000000000000000000002011504000000000000000000000000000000000201160400000000000000000000000000000000030117c080090104c080090130b00501c09e040180020401"));
        let bar: Vec<(u8, u8, u32)> = snapshot().skillbar.iter().map(|s| (s.bar, s.slot, s.skill_id)).collect();
        assert_eq!((bar.len(), bar[0], bar[8]), (8 + 9, (1, 0, 17010000), (2, 0, 11020000)));

        // Daevanion: two boards (11: Start 110113 + 110033, 12: one node), then one node taken in game.
        parse(&hex("1626e2020b0000000221ae0100d1ad01000c0000000103d50100"));
        parse(&hex("0a28e2000004d50100"));
        assert_eq!(snapshot().daevanion, vec![110113, 110033, 120067, 120068]);

        // Gear score and combat power. The login inventory above cleared them.
        assert_eq!((snapshot().gear_score, snapshot().combat_power), (None, None));
        // packets_20261011_183820, 18:48:11.259: Allalon's own record (start and end, the middle cut), level 45,
        // item level 912 (0x390), combat power 52553 (0xcd49) as in the party roster.
        parse(&hex(&[
            "fd0f3336d04f5e81c1083707416c6c616c6f6eff081f000000022d00000090030000900300002d00",
            "0000000000000000000021f4cb1fdc05000000000000d4d3aa28a1010000000000e1372900021705000000000000000000000000000000000000000000000000000000000000000049cd00000000000049cd0000000000000501df0002000003000004000005000005015700020000030000040000050000",
        ]
        .concat()));
        assert_eq!((snapshot().gear_score, snapshot().combat_power), (Some(912), Some(52553)));
        // packets_20261011_121052, 12:11:47.924: a piece taken off, now 870 of 908 and 51858 of 52244: the best is kept.
        parse(&hex("0e1d56660300008c030000"));
        parse(&hex("16563692ca00000000000014cc000000000000"));
        assert_eq!((snapshot().gear_score, snapshot().combat_power), (Some(908), Some(52244)));
        // Not a now/best pair (now above best): ignored.
        parse(&hex("16563614cc000000000000ca92000000000000"));
        assert_eq!(snapshot().combat_power, Some(52244));

        // packets_20261013_031645, 03:16:55: the pet collection, three of its 165 pets (1002 level 1 at 16/75,
        // 1217 level 2 at 16/75, 1299 level 3) and an unowned one (1034) in the exp list.
        parse(&hex("c12200905204000003ea030000ea03000001000000c1040000c10400000200000013050000130500000300000003ea03000010000000c1040000100000000a04000005000000"));
        let pets: Vec<(u32, u8, u8)> = snapshot().pets.iter().map(|p| (p.id, p.lvl, p.exp)).collect();
        assert_eq!(pets, vec![(1002, 1, 16), (1217, 2, 16), (1299, 3, 0)]);
        // Not a collection (a level out of range): the last one stays.
        parse(&hex("100000900000000001ea030000ea03000009000000"));
        assert_eq!(snapshot().pets.len(), 3);
        // packets_20261019_015229, 01:53:44: a kill for Cherubim_03 (1171) is `0f 0d 90 01 93040000 01000000`; here the same
        // record for 1217 (level 2 at 16): +1. A level 3 pet (1299) gains nothing, an unowned one (1034) isn't added.
        parse(&hex("0f0d9001c104000001000000"));
        parse(&hex("0f0d90011305000001000000"));
        parse(&hex("0f0d90010a04000001000000"));
        let pets: Vec<(u32, u8, u8)> = snapshot().pets.iter().map(|p| (p.id, p.lvl, p.exp)).collect();
        assert_eq!(pets, [(1002, 1, 16), (1217, 2, 17), (1299, 3, 0)]);

        // packets_20261013_031645, 03:16:55.558: Allalon's login inventory (body), 19 worn items with their options.
        parse_inventory(&hex(include_str!("testdata/inventory_1156_20261013_031655.hex").trim()));
        let eq = snapshot().equipment;
        assert_eq!(eq.len(), 19);
        let at = |slot: u8| eq.iter().find(|e| e.item.slot == slot).unwrap().extras.clone();
        // Spiritforged Mace +10: 55 on 10/11, now 4 stones of tier 1+3+2+2 more.
        let mace = at(1);
        assert_eq!(mace.level, Some(63));
        let stones: Vec<(u32, Option<&str>, u8)> = mace.manastones.iter().map(|m| (m.item_id, m.stat, m.tier)).collect();
        assert_eq!(stones, vec![(511360003, Some("WeaponFixingDamage"), 1), (511360003, Some("HPMax"), 3), (511360003, Some("HPMax"), 2), (511360003, Some("HPMax"), 2)]);
        // Judicator Greaves: 3 empty sockets, 3 bonus stats (the same as on 10/11).
        let pants = at(6);
        let bonus: Vec<(u16, Option<&str>, u32)> = pants.bonus.iter().map(|b| (b.id, b.stat, b.value)).collect();
        assert_eq!((pants.level, pants.manastones.len()), (Some(38), 0));
        assert_eq!(bonus, vec![(128, Some("Critical"), 20), (318, Some("WeaponAccuracy"), 25), (200, Some("MPRegen"), 16)]);
        // Bakarma Breastplate: an id still open (41) keeps its raw value, with no key.
        assert_eq!(at(5).bonus.last(), Some(&ItemStat { id: 41, stat: None, value: 223 }));
        // Liberator Helm: the record with its level one byte earlier.
        assert_eq!((at(3).level, at(3).manastones.len()), (Some(45), 3));

        // packets_20261011_144836, 14:50:19.263: the Gladiator's Grail of Vigor (810130001) +2, Arcana slot 0x29,
        // one record of the login inventory: its main stat with the enhancement in, Time 22 (20 at +0).
        parse_inventory(&hex("852b0e0000b50000519a493001000000000000000b2900000000000000000000000002600900000000000000000000005200000000290000000000000000000003000000000000000000000000010b0016000000000004d070aa000100e6aa000160d0ab0001605fa9000104d070aa000000e6aa000160d0ab0001605fa9000000000001"));
        let arcana = snapshot().equipment.remove(0);
        assert_eq!(arcana.item, WornItem { slot: 0x29, item_id: 810130001, enchant: 2 });
        assert_eq!((arcana.extras.level, arcana.extras.bonus), (Some(82), vec![ItemStat { id: 11, stat: Some("Time"), value: 22 }]));
    }

    /// packets_20261013_031645, 03:17:02.495: Allalon's full `00 90` (body), 31 insight options; the 7 on stat ids
    /// still open are left out.
    #[test]
    fn reads_the_pet_insight_effects() {
        let body = hex(include_str!("testdata/pets_0090_20261013_031702.hex").trim());
        parse_pets(&body);
        let fx: Vec<(&str, u32)> = snapshot().pet_effects.iter().map(|e| (e.stat, e.value)).collect();
        assert_eq!(fx.len(), 24);
        assert_eq!(fx[0], ("PvEAddDamage", 10));
        assert!(fx.contains(&("FeralDefense", 48)));
        assert!(fx.contains(&("PvEDamageDefense", 80)));
        assert_eq!(fx.last(), Some(&("MPMax", 10)));
    }
    // packets_20261011_183820, 18:38:25: DrBlacK's spawn (entity 8761), cut after the worn list.
    #[test]
    fn player_gear_from_spawn() {
        let hex_str = [
            "89094536b9441730a00107074472426c61634b13000000020100d24c3eacc72675e4c7d1150147e7d7634306a201cab001cab001a30d0000a30d00000000000000000000c0250100003f0200f0490200f049020002000000a0860100a0860100b8520900",
            "b852090002a4676502a4676502c0d84f01ff08040100000000ff0809436c6f776e446f67730200010000000000000000000000000000000e11115dc4c901ffffffffffffffff8075d52abb030000b9440100919a70c62bb6744600d052451114844e0000",
            "c887dc5101000000b199a67da2010000b94406cae3c2c7efb0f6c700610647112c41a93608ffffffffffffffff8075d52abb030000b94405cae3c2c7efb0f6c700610647112de1fa2b08ffffffffffffffff8075d52abb030000b9440fcae3c2c7efb0f6",
            "c700610647112e81812d08ffffffffffffffff8075d52abb030000b9440ecae3c2c7efb0f6c700610647112f21082f08ffffffffffffffff8075d52abb030000b9440bcae3c2c7efb0f6c7006106471130c18e3008ffffffffffffffff8075d52abb0300",
            "00b9440fcae3c2c7efb0f6c700610647113161153208ffffffffffffffff8075d52abb030000b94411cae3c2c7efb0f6c7006106471132019c3308ffffffffffffffff8075d52abb030000b9441180cae3c2c7efb0f6c7006106471133a1223508ffffff",
            "ffffffffff8075d52abb030000b9440fcae3c2c7efb0f6c7006106471134e12f3808ffffffffffffffff8075d52abb030000b94408cae3c2c7efb0f6c700610647113581b63908ffffffffffffffff8075d52abb030000b94410cae3c2c7efb0f6c70061",
            "0647133f273c5101e09304000000000056bed42ba1010000b9440137b92100f9b5c2c7c9d8f6c7f163064713403b3c5101e0930400000000003dc2d42ba1010000b9440139b9210055dfc1c77b93f7c7ca4706470fc38093060c01000000000000000000",
            "0000000003000000000000000000000000bb0ec461890c0a020000000000000000a71bcb0100030000000000000000000000000e64e88a0c0a0300000000000000002860ca010003000000000000000000000000bb0e8454860c0a040000000000000000",
            "9d46cb0100030000000000000000000000000e24db870c0a0500000000000000009e46cb010003000000000000000000000000bb0e056f8c0c0a060000000000000000d144ca0100030000000000000000000000000ea5f58d0c0a070000000000000000",
            "da19ca010003000000000000000000000000bb0e447c8f0c0a0800000000000000001b2dcc0100030000000000000000000000000e83357c120a090000000000000000000000000003000000000000000000000000bb0e25bc7d120a0a00000000000000",
            "000000000000030000000000000000000000000e25bc7d120a0b0000000000000000000000000003000000000000000000000000bb0e00000000000c00000000000000000000000000000e00000000000d0000000000000000000000000000bb0e000000",
            "00000e00000000000000000000000000000e00000000000f00000000000000000000000000001f0e0101194403000000ff0804cd00f7070000ce00",
        ]
        .concat();
        parse(&hex(&hex_str));
        let gear: Vec<(u8, u32, u8)> = player_gear(8761).iter().map(|w| (w.slot, w.item_id, w.enchant)).collect();
        assert_eq!(
            gear,
            vec![
                (1, 110330051, 12),
                (2, 210330052, 10),
                (3, 210430052, 10),
                (4, 210130052, 10),
                (5, 210230052, 10),
                (6, 210530053, 10),
                (7, 210630053, 10),
                (8, 210730052, 10),
                (9, 310130051, 10),
                (10, 310230053, 10),
                (11, 310230053, 10),
            ]
        );
        assert!(player_gear(1).is_empty());
    }
}
