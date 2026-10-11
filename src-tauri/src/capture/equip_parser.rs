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
//! `93 E2` skill bar, the whole bar, sent again on every change:
//!   `01 <count u8> { <kind u8> 01 <slot u8> [kind 3: <skill id u32>] 04 <4 × u32> } × count`
//!   kind 3 = the slot holds a skill, 2 = empty; slots 0-7 and 20-23.
//!   e.g. `03 01 16 900b0901 04 900b0901 00000000 00000000 00000000` = Lightning Barrage (17370000) in slot 22.

use std::collections::BTreeMap;
use std::sync::Mutex;

use serde::Serialize;

use super::stream_processor::read_varint;

#[derive(Serialize, Clone, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WornItem {
    pub slot: u8,
    pub item_id: u32,
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
    pub equipment: Vec<WornItem>,
    pub skillbar: Vec<BarSkill>,
}

struct State {
    /// Last `8D E2` list: (slot, item uid).
    worn: Vec<(u8, u64)>,
    /// Item uid → item id, from `1B 56`.
    items: BTreeMap<u64, u32>,
    skillbar: Vec<BarSkill>,
}

static STATE: Mutex<State> = Mutex::new(State { worn: Vec::new(), items: BTreeMap::new(), skillbar: Vec::new() });

pub fn snapshot() -> CapturedCharacter {
    let s = STATE.lock().unwrap_or_else(|e| e.into_inner());
    CapturedCharacter {
        equipment: s
            .worn
            .iter()
            .filter_map(|&(slot, uid)| s.items.get(&uid).map(|&item_id| WornItem { slot, item_id }))
            .collect(),
        skillbar: s.skillbar.clone(),
    }
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
        (0x93, 0xE2) => parse_skillbar(body),
        _ => {}
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
        STATE.lock().unwrap_or_else(|e| e.into_inner()).items.insert(uid, item);
    }
}

fn parse_skillbar(b: &[u8]) {
    if b.len() < 2 || b[0] != 1 {
        return;
    }
    let mut bar = Vec::new();
    let mut o = 2;
    for _ in 0..b[1] {
        let (kind, slot) = match (b.get(o), b.get(o + 1), b.get(o + 2)) {
            (Some(&k @ (2 | 3)), Some(1), Some(&s)) => (k, s),
            _ => return, // unknown layout: keep the last good bar
        };
        o += 3;
        if kind == 3 {
            match u32_at(b, o) {
                Some(skill_id) => bar.push(BarSkill { slot, skill_id }),
                None => return,
            }
            o += 4;
        }
        o += 1 + 16; // 04 <4 × u32>
    }
    STATE.lock().unwrap_or_else(|e| e.into_inner()).skillbar = bar;
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
                WornItem { slot: 1, item_id: 110730048 },
                WornItem { slot: 6, item_id: 210240024 },
                WornItem { slot: 0x13, item_id: 210730038 },
            ]
        );

        // 12:11:40.445: Lightning Barrage moved back to slot 1.
        parse(&hex("980293e2010c030100508d030104508d0301000000000000000000000000030101900b090104900b0901000000000000000000000000030102e0ec040104e0ec0401003b05010000000000000000030103001d0a0104001d0a01000000000000000000000000030104d0a7090104d0a709010000000000000000000000000201050400000000000000000000000000000000030106a050040104a0500401000000000000000000000000030107d0c5040104d0c50401f0f50901b077040170bd0801020114040000000000000000000000000000000002011504000000000000000000000000000000000201160400000000000000000000000000000000030117c080090104c080090130b00501c09e040180020401"));
        let bar: Vec<(u8, u32)> = snapshot().skillbar.iter().map(|s| (s.slot, s.skill_id)).collect();
        assert_eq!(
            bar,
            vec![(0, 17010000), (1, 17370000), (2, 17100000), (3, 17440000), (4, 17410000), (6, 17060000), (7, 17090000), (23, 17400000)]
        );
    }
}
