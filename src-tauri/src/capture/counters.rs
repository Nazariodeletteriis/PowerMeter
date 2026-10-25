//! The character's recharging counters (entries and keys: Daily Dungeon, Shugo keys, Odyle...), shown in game as
//! "base (+charged) / max". The server sends them all on entering the world and one at a time when one changes
//! (packets_daily_dungeon_20261025_214625: Daily Dungeon 0(+10) → 0(+9) on entering it; packets_shugo_20261025_220103:
//! Shugo keys 0(+7) → 0(+6) on taking a festival reward, as the game's tooltip). The max values are not in the packets:
//! the widget keeps them (src/widget/charBar.ts).
//!
//! An entry: `<kind u8> <id u32 LE>`, then by the bits of kind: 0x01 an u64 (unknown: 7 h in ms on some), 0x04 the base
//! (varint), 0x08 the charged (varint); a missing one is 0.
//! `0B 61 <count varint> <entry>…`: all of them, on entering the world (so a new character replaces the last one's).
//! `0C 61 00 <entry> <u8>`: one that changed.
//! Ids seen: 1 Shugo keys, 4 Nightmare (2(+2) → 1(+2) entering it, packets_nightmare_20261025_232845), 8 Beritra keys (1 → 0 using one, packets_beritra_20261025_223047), 101 Daily Dungeon, 60000001 Odyle (85 / 370 = the tooltip's Basic 85/840, Charged 370/2000).

use std::collections::BTreeMap;
use std::sync::Mutex;

use super::stream_processor::read_varint;

/// Counter id → (base, charged).
static COUNTERS: Mutex<BTreeMap<u32, (i32, i32)>> = Mutex::new(BTreeMap::new());

pub fn parse(packet: &[u8]) {
    let len = read_varint(packet, 0);
    if len.length <= 0 {
        return;
    }
    let op = len.length as usize;
    let Some(body) = packet.get(op + 2..) else { return };
    match (packet[op], packet[op + 1]) {
        (0x0B, 0x61) => {
            let n = read_varint(body, 0);
            if n.length <= 0 {
                return;
            }
            let mut at = n.length as usize;
            let mut all = BTreeMap::new();
            for _ in 0..n.value {
                // A record we can't read through keeps the last good list.
                let Some((id, value)) = entry(body, &mut at) else { return };
                all.insert(id, value);
            }
            *COUNTERS.lock().unwrap_or_else(|e| e.into_inner()) = all;
        }
        (0x0C, 0x61) if body.first() == Some(&0) => {
            let mut at = 1;
            if let Some((id, value)) = entry(body, &mut at) {
                COUNTERS.lock().unwrap_or_else(|e| e.into_inner()).insert(id, value);
            }
        }
        _ => {}
    }
}

fn entry(body: &[u8], at: &mut usize) -> Option<(u32, (i32, i32))> {
    let kind = *body.get(*at)?;
    if kind & !0x0D != 0 {
        return None; // a field we don't know the size of
    }
    let id = u32::from_le_bytes(body.get(*at + 1..*at + 5)?.try_into().ok()?);
    *at += 5;
    if kind & 0x01 != 0 {
        body.get(*at..*at + 8)?;
        *at += 8;
    }
    let mut field = |on: bool| -> Option<i32> {
        if !on {
            return Some(0);
        }
        let v = read_varint(body, *at);
        if v.length <= 0 {
            return None;
        }
        *at += v.length as usize;
        Some(v.value)
    };
    let base = field(kind & 0x04 != 0)?;
    let charged = field(kind & 0x08 != 0)?;
    Some((id, (base, charged)))
}

pub fn snapshot() -> BTreeMap<u32, (i32, i32)> {
    COUNTERS.lock().unwrap_or_else(|e| e.into_inner()).clone()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn hex(s: &str) -> Vec<u8> {
        let s: String = s.split_whitespace().collect();
        (0..s.len()).step_by(2).map(|i| u8::from_str_radix(&s[i..i + 2], 16).unwrap()).collect()
    }

    #[test]
    fn reads_the_list_then_a_change() {
        // Shugo keys 0(+7), Daily Dungeon 0(+10), one with the unknown u64 and nothing else, Odyle 85(+370).
        let list = hex("00 0B 61 04  08 01000000 07  08 65000000 0A  01 09000000 4089800100000000  0C 01879303 55 F202");
        let mut packet = list.clone();
        packet[0] = list.len() as u8; // length varint
        parse(&packet);
        let c = snapshot();
        assert_eq!(c[&1], (0, 7));
        assert_eq!(c[&101], (0, 10));
        assert_eq!(c[&9], (0, 0));
        assert_eq!(c[&60000001], (85, 370));
        // Entering the dungeon (21:47:14.474).
        parse(&hex("09 0C 61 00 08 65000000 09 03"));
        assert_eq!(snapshot()[&101], (0, 9));
    }
}
