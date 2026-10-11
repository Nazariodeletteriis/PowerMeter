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
//!   `01 <count u8> { <kind u8> 01 <slot u8> [kind 3: <skill id u32>] 04 <4 × u32> } × count`
//!   kind 3 = the slot holds a skill, 2 = empty; slots 0-7 and 20-23.
//!   e.g. `03 01 16 900b0901 04 900b0901 00000000 00000000 00000000` = Lightning Barrage (17370000) in slot 22.
//! `8C E2` at login (packets_20261011_183820): the worn sets, then the bar list as in `93 E2` with the bar
//!   number (1-3) in the entry's second byte: `01 24 { <kind> <bar> <slot> ... }` = 3 bars × 12 slots.
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

#[derive(Serialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BarSkill {
    pub slot: u8,
    pub skill_id: u32,
}

/// What `get_captured_character` returns. Worn slots whose item was never seen in a `1B 56` are left out.
#[derive(Serialize, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CapturedCharacter {
    /// Who wears `equipment`: the self record's name after the last login inventory. None until the game says it
    /// (on a character switch the inventory comes ~7 s before the self record, packets_20261011_183820).
    pub owner: Option<String>,
    pub equipment: Vec<WornItem>,
    pub skillbar: Vec<BarSkill>,
    /// Daevanion node ids taken, as in the archive without the class (`110113` of `gladiator:110113`).
    pub daevanion: Vec<u32>,
}

struct State {
    /// Last `8D E2` list: (slot, item uid).
    worn: Vec<(u8, u64)>,
    /// Item uid → (item id, enhancement), from `1B 56` and `11 56`.
    items: BTreeMap<u64, (u32, u8)>,
    skillbar: Vec<BarSkill>,
    owner: Option<String>,
    daevanion: Vec<u32>,
}

static STATE: Mutex<State> =
    Mutex::new(State { worn: Vec::new(), items: BTreeMap::new(), skillbar: Vec::new(), owner: None, daevanion: Vec::new() });

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
            .filter_map(|&(slot, uid)| s.items.get(&uid).map(|&(item_id, enchant)| WornItem { slot, item_id, enchant }))
            .collect(),
        skillbar: s.skillbar.clone(),
        daevanion: s.daevanion.clone(),
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
        (0x45 | 0x33, 0x36) => parse_spawn_gear(body),
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

fn parse_item(b: &[u8]) {
    if let (Some(uid), Some(item)) = (u64_at(b, 3), u32_at(b, 11)) {
        STATE.lock().unwrap_or_else(|e| e.into_inner()).items.insert(uid, (item, enchant_at(b, 24)));
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
            s.items.insert(uid, (item, enchant_at(b, p + WORN_TAIL.len())));
            worn.push((slot, uid));
        }
    }
    // A later page with only bag items must not wipe the worn list.
    if !worn.is_empty() {
        s.worn = worn;
        s.owner = None; // a login: the character may be another one
    }
}

/// The bar list at `b`; only bar 1 is kept (the login copy has bars 1-3). None when the bytes are not one.
fn read_skillbar(b: &[u8]) -> Option<Vec<BarSkill>> {
    if b.len() < 2 || b[0] != 1 {
        return None;
    }
    let mut bar = Vec::new();
    let mut o = 2;
    for _ in 0..b[1] {
        let (kind, n, slot) = match (b.get(o), b.get(o + 1), b.get(o + 2)) {
            (Some(&k @ (2 | 3)), Some(&n @ 1..=3), Some(&s)) => (k, n, s),
            _ => return None,
        };
        o += 3;
        if kind == 3 {
            let skill_id = u32_at(b, o)?;
            if n == 1 {
                bar.push(BarSkill { slot, skill_id });
            }
            o += 4;
        }
        if b.get(o) != Some(&4) {
            return None;
        }
        o += 1 + 16; // 04 <4 × u32>
    }
    Some(bar)
}

fn parse_skillbar(b: &[u8]) {
    // Unknown layout: keep the last good bar.
    if let Some(bar) = read_skillbar(b) {
        STATE.lock().unwrap_or_else(|e| e.into_inner()).skillbar = bar;
    }
}

/// `8C E2` at login: the worn sets, then the bars as in `93 E2`; the bar list starts where one reads whole.
fn parse_login_bars(b: &[u8]) {
    if let Some(bar) = (0..b.len()).filter(|&o| b[o] == 1 && b.get(o + 1).is_some_and(|&n| n >= 12)).find_map(|o| read_skillbar(&b[o..])) {
        STATE.lock().unwrap_or_else(|e| e.into_inner()).skillbar = bar;
    }
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
            snapshot().equipment,
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

        // packets_20261011_144836, 14:50:19.263: login inventory, two worn records (claymore +12, cape +10),
        // the cape with the extra zero before its enhancement.
        parse(&hex("975811561002ac0100c9c6130000ae00056c1900004b00008373900601000000000000000b010000000000000000000000000c000000000000000000000000006d000000010403bc7a1e680002035d00050000f70000457c8f0c01000000000000000b13000000000000000000000000000a0000000000000000000000000066000000130403bc7a1ec10003"));
        assert_eq!(
            snapshot().equipment,
            vec![WornItem { slot: 1, item_id: 110130051, enchant: 12 }, WornItem { slot: 0x13, item_id: 210730053, enchant: 10 }]
        );
        // The inventory comes before the self record: nobody owns it until the self record names the character.
        assert_eq!(snapshot().owner, None);
        set_owner("Agniezska");
        assert_eq!(snapshot().owner.as_deref(), Some("Agniezska"));

        // packets_20261011_183820, 18:48:04.231: Cleric login, Spiritforged Mace +10 (item level 45 + 10 = 0x37).
        parse(&hex("9758115610027800e9d8170000e90000e6e2140000f40000409b990601000000000000000b01000000000000000000000000000a0000000000000000000000000037000000010400000000000000"));
        assert_eq!(snapshot().equipment, vec![WornItem { slot: 1, item_id: 110730048, enchant: 10 }]);

        // packets_20261011_183820, 18:48:04.174: the Cleric's bars at login (8C E2, from the bar list on): bar 1 only.
        STATE.lock().unwrap().skillbar.clear();
        parse(&hex("7f8ce2010101000124030100508d030104508d0301000000000000000000000000030101900b090104900b0901000000000000000000000000030102e0ec040104e0ec0401003b05010000000000000000030103001d0a0104001d0a01000000000000000000000000030104d0a7090104d0a709010000000000000000000000000201050400000000000000000000000000000000030106a050040104a0500401000000000000000000000000030107d0c5040104d0c50401f0f50901b077040170bd0801020114040000000000000000000000000000000002011504000000000000000000000000000000000201160400000000000000000000000000000000030117c080090104c080090130b00501c09e040180020401020200040000000000000000000000000000000002020104000000000000000000000000000000000202020400000000000000000000000000000000020203040000000000000000000000000000000002020404000000000000000000000000000000000202050400000000000000000000000000000000020206040000000000000000000000000000000002020704000000000000000000000000000000000202140400000000000000000000000000000000020215040000000000000000000000000000000002021604000000000000000000000000000000000202170400000000000000000000000000000000020300040000000000000000000000000000000002030104000000000000000000000000000000000203020400000000000000000000000000000000020303040000000000000000000000000000000002030404000000000000000000000000000000000203050400000000000000000000000000000000020306040000000000000000000000000000000002030704000000000000000000000000000000000203140400000000000000000000000000000000020315040000000000000000000000000000000002031604000000000000000000000000000000000203170400000000000000000000000000000000"));
        let bar: Vec<(u8, u32)> = snapshot().skillbar.iter().map(|s| (s.slot, s.skill_id)).collect();
        assert_eq!(
            bar,
            vec![(0, 17010000), (1, 17370000), (2, 17100000), (3, 17440000), (4, 17410000), (6, 17060000), (7, 17090000), (23, 17400000)]
        );

        // Daevanion: two boards (11: Start 110113 + 110033, 12: one node), then one node taken in game.
        parse(&hex("1626e2020b0000000221ae0100d1ad01000c0000000103d50100"));
        parse(&hex("0a28e2000004d50100"));
        assert_eq!(snapshot().daevanion, vec![110113, 110033, 120067, 120068]);
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
