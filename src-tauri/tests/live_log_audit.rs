//! Audits a raw packet log (`packets_*.txt`, one TCP segment per line) against
//! the parser: how many damage records the stream carries, how many the parser
//! turned into hits, how many bytes the framing had to skip, and what the
//! boss-mode meter would have shown for the stagger gauge.
//!
//! The log path comes from PM_AUDIT_LOG; the test skips when unset.

use std::collections::HashMap;
use std::sync::Arc;

use a2tools_dps_meter_lib::capture::stream_processor::{read_varint, StreamProcessor};
use a2tools_dps_meter_lib::combat::data_storage::DataStorage;
use a2tools_dps_meter_lib::combat::dps_calculator::DpsCalculator;
use a2tools_dps_meter_lib::combat::ping_tracker::PingTracker;
use a2tools_dps_meter_lib::i18n::lookup::{NpcLookup, SkillLookup};

#[derive(Default, Debug)]
struct Stats {
    segments: usize,
    top_packets: usize,
    bundles: usize,
    bundle_fail: usize,
    top_0438: usize,
    inner_0438: usize,
    skipped_bytes: usize,
    padding_segments: usize,
    padding_mid_packet: usize,
    skipped_0438: usize,
    zero_yield_0438: usize,
    zero_yield_npc_skill: usize,
    zero_yield_not_hit: usize,
    hits: i64,
}

fn decode_hex(hex: &str) -> Option<Vec<u8>> {
    (0..hex.len()).step_by(2).map(|i| u8::from_str_radix(hex.get(i..i + 2)?, 16).ok()).collect()
}

fn opcode_is(p: &[u8], a: u8, b: u8) -> bool {
    let l = read_varint(p, 0);
    l.length > 0 && p.len() > l.length as usize + 1 && p[l.length as usize] == a && p[l.length as usize + 1] == b
}

/// Skill code of the first record of a `04 38` packet, if it decodes.
fn first_skill(p: &[u8]) -> Option<i64> {
    let mut o = read_varint(p, 0).length as usize + 2;
    for _ in 0..4 {
        let v = read_varint(p, o);
        if v.length <= 0 {
            return None;
        }
        o += v.length as usize;
    }
    let s = p.get(o..o + 4)?;
    Some(i64::from(u32::from_le_bytes([s[0], s[1], s[2], s[3]])))
}

/// Switch nibble 4..=7 marks a damage record (see parsing_damage).
fn is_hit_record(p: &[u8]) -> bool {
    let mut o = read_varint(p, 0).length as usize + 2;
    let t = read_varint(p, o);
    if t.length <= 0 {
        return false;
    }
    o += t.length as usize;
    let sw = read_varint(p, o);
    sw.length > 0 && (4..=7).contains(&(sw.value & 0x0F))
}

fn inner_packets(payload: &[u8]) -> Option<Vec<Vec<u8>>> {
    if payload.len() < 7 {
        return None;
    }
    let size = u32::from_le_bytes([payload[2], payload[3], payload[4], payload[5]]) as usize;
    let data = lz4_flex::decompress(&payload[6..], size).ok()?;
    let mut out = Vec::new();
    let mut o = 0;
    while o < data.len() {
        if data[o] == 0 {
            o += 1;
            continue;
        }
        let l = read_varint(&data, o);
        let size = l.value - 4 + l.length;
        if l.length <= 0 || size <= 0 {
            break;
        }
        let end = o + size as usize;
        if end > data.len() {
            break;
        }
        out.push(data[o..end].to_vec());
        o = end;
    }
    Some(out)
}

fn ms_of_day(ts: &str) -> i64 {
    // 2026-10-11T03:21:31.869721300+02:00
    let t = &ts[11..23];
    let h: i64 = t[0..2].parse().unwrap_or(0);
    let m: i64 = t[3..5].parse().unwrap_or(0);
    let s: i64 = t[6..8].parse().unwrap_or(0);
    let ms: i64 = t[9..12].parse().unwrap_or(0);
    ((h * 60 + m) * 60 + s) * 1000 + ms
}

#[test]
fn audit_packet_log() {
    let Ok(path) = std::env::var("PM_AUDIT_LOG") else {
        eprintln!("PM_AUDIT_LOG unset — skipping");
        return;
    };
    let storage = Arc::new(DataStorage::new());
    let npcs = Arc::new(NpcLookup::new());
    if let Ok(t) = std::fs::read_to_string("../src/data/i18n/npcs/en.json") {
        npcs.load_from_json(&t);
    }
    let mut sp = StreamProcessor::new(storage.clone(), Arc::new(SkillLookup::new()), npcs.clone());
    let mut calc = DpsCalculator::new(storage.clone(), Arc::new(SkillLookup::new()), npcs, Arc::new(PingTracker::new()));
    calc.set_target_selection_mode("bossTargets");

    let text = std::fs::read_to_string(&path).expect("log readable");
    let mut st = Stats::default();
    let mut bufs: HashMap<String, Vec<u8>> = HashMap::new();
    let mut last_stagger = HashMap::new();
    let mut next_tick = 0i64;
    let mut last_shown = String::new();
    let mut stale_stagger_ticks = 0;

    for line in text.lines() {
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let mut parts = line.splitn(3, '|');
        let (Some(ts), Some(key), Some(hex)) = (parts.next(), parts.next(), parts.next()) else { continue };
        let Some(bytes) = decode_hex(hex) else { continue };
        st.segments += 1;
        let buf = bufs.entry(key.to_string()).or_default();
        // A pure ACK padded to the 60-byte Ethernet minimum: 6 zero bytes that
        // are not stream data. Mid-packet they shift the rest of that packet.
        if bytes.len() == 6 && bytes.iter().all(|&b| b == 0) {
            st.padding_segments += 1;
            if !buf.is_empty() {
                st.padding_mid_packet += 1;
            }
        }
        buf.extend_from_slice(&bytes);

        // Mirror of StreamProcessor::consume_stream framing, one packet at a time.
        let mut o = 0;
        while o < buf.len() {
            if buf[o] == 0 {
                o += 1;
                continue;
            }
            let l = read_varint(buf, o);
            if l.length <= 0 || l.value <= 0 {
                if o + 5 > buf.len() {
                    break;
                }
                st.skipped_bytes += 1;
                o += 1;
                continue;
            }
            let total = (l.value - 4 + l.length).max(0) as usize;
            if total == 0 || total > 65535 {
                st.skipped_bytes += 1;
                if buf[o..].starts_with(&[0x04, 0x38]) || buf.get(o + 1..o + 3) == Some(&[0x04, 0x38]) {
                    st.skipped_0438 += 1;
                }
                o += 1;
                continue;
            }
            if o + total > buf.len() {
                if total > 16384 {
                    st.skipped_bytes += 1;
                    o += 1;
                    continue;
                }
                break;
            }
            let ps = l.length as usize;
            let is_bundle = ps + 1 < total && buf[o + ps] == 0xFF && buf[o + ps + 1] == 0xFF;
            let pkt_len = total;
            if o + pkt_len > buf.len() {
                break;
            }
            let pkt = buf[o..o + pkt_len].to_vec();
            st.top_packets += 1;
            let gen0 = storage.damage_generation();
            sp.consume_stream(&pkt);
            let got = storage.damage_generation() - gen0;
            if is_bundle {
                st.bundles += 1;
                match inner_packets(&pkt[ps..]) {
                    Some(inner) => {
                        for p in inner.iter().filter(|p| opcode_is(p, 0x05, 0xE0)) {
                            println!("05E0 in bundle: {}", p.iter().map(|b| format!("{b:02X}")).collect::<String>());
                        }
                        let n = inner.iter().filter(|p| opcode_is(p, 0x04, 0x38)).count();
                        st.inner_0438 += n;
                        if n > 0 && got == 0 {
                            st.zero_yield_0438 += n;
                            for p in inner.iter().filter(|p| opcode_is(p, 0x04, 0x38)) {
                                if first_skill(p).is_some_and(|s| (1_000_000..=9_999_999).contains(&s)) {
                                    st.zero_yield_npc_skill += 1;
                                } else if !is_hit_record(p) {
                                    st.zero_yield_not_hit += 1;
                                } else {
                                    println!("zero-yield inner 04 38: {}", p.iter().map(|b| format!("{b:02X}")).collect::<String>());
                                }
                            }
                        }
                    }
                    None => st.bundle_fail += 1,
                }
            } else if opcode_is(&pkt, 0x05, 0xE0) {
                println!("05E0 top: {}", pkt.iter().map(|b| format!("{b:02X}")).collect::<String>());
            } else if opcode_is(&pkt, 0x04, 0x38) {
                st.top_0438 += 1;
                if got == 0 {
                    st.zero_yield_0438 += 1;
                    if first_skill(&pkt).is_some_and(|s| (1_000_000..=9_999_999).contains(&s)) {
                        st.zero_yield_npc_skill += 1;
                    } else if !is_hit_record(&pkt) {
                        st.zero_yield_not_hit += 1;
                    } else if st.zero_yield_0438 - st.zero_yield_npc_skill - st.zero_yield_not_hit <= 12 {
                        println!("zero-yield 04 38: {}", pkt.iter().map(|b| format!("{b:02X}")).collect::<String>());
                    }
                }
            }
            o += pkt_len;
        }
        buf.drain(..o);

        for (&id, _) in storage.get_mob_data().iter() {
            let s = storage.get_stagger(id);
            if s.is_some() && last_stagger.get(&id) != Some(&s) {
                println!("{ts} stagger id={id} {s:?}");
                last_stagger.insert(id, s);
            }
        }
        // What the meter emits every 500 ms of capture time.
        let now = ms_of_day(ts);
        if now >= next_tick {
            next_tick = now + 500;
            let d = calc.get_dps();
            if d.target_id != 0 && d.target_stagger != storage.get_stagger(d.target_id) {
                stale_stagger_ticks += 1;
                println!("{ts} STALE meter={:?} store={:?}", d.target_stagger, storage.get_stagger(d.target_id));
            }
            let shown = format!("target={} maxhp={} hp={} stagger={:?} rows={}", d.target_id, d.target_max_hp, d.target_current_hp, d.target_stagger, d.map.len());
            if shown != last_shown {
                println!("{ts} meter {shown}");
                last_shown = shown;
            }
        }
    }
    st.hits = storage.damage_generation();
    println!("{st:#?}");
    println!("stale stagger ticks: {stale_stagger_ticks}");
    let mobs = storage.get_mob_data();
    for id in last_stagger.keys() {
        println!("stagger mob {id} code={:?}", mobs.get(id));
    }
}

/// C7: switch the meter between PvP, PVE and Boss on a replayed session and
/// check every switch answers at once with that mode's own rows.
#[test]
fn audit_mode_switching() {
    let Ok(path) = std::env::var("PM_AUDIT_LOG") else {
        eprintln!("PM_AUDIT_LOG unset — skipping");
        return;
    };
    let storage = Arc::new(DataStorage::new());
    let npcs = Arc::new(NpcLookup::new());
    if let Ok(t) = std::fs::read_to_string("../src/data/i18n/npcs/en.json") {
        npcs.load_from_json(&t);
    }
    let mut sp = StreamProcessor::new(storage.clone(), Arc::new(SkillLookup::new()), npcs.clone());
    let mut calc = DpsCalculator::new(storage.clone(), Arc::new(SkillLookup::new()), npcs, Arc::new(PingTracker::new()));
    let text = std::fs::read_to_string(&path).expect("log readable");
    let mut buf = Vec::new();
    let modes = ["pvpTargets", "pveTargets", "bossTargets"];
    let mut k = 0;
    let mut worst = 0u128;
    for (n, line) in text.lines().filter(|l| !l.is_empty() && !l.starts_with('#')).enumerate() {
        let Some(hex) = line.splitn(3, '|').nth(2) else { continue };
        let Some(bytes) = decode_hex(hex) else { continue };
        buf.extend_from_slice(&bytes);
        let c = sp.consume_stream(&buf);
        buf.drain(..c);
        if n % 200 == 0 {
            calc.set_target_selection_mode(modes[k % 3]);
            k += 1;
            let t0 = std::time::Instant::now();
            let d = calc.get_dps();
            worst = worst.max(t0.elapsed().as_micros());
            assert_eq!(d.target_mode, modes[(k - 1) % 3]);
        }
    }
    for m in modes.iter().chain(modes.iter()) {
        calc.set_target_selection_mode(m);
        let t0 = std::time::Instant::now();
        let d = calc.get_dps();
        println!("{m}: rows={} target={} took={}us", d.map.len(), d.target_id, t0.elapsed().as_micros());
    }
    println!("switches={k} worst get_dps={worst}us hits={}", storage.damage_generation());
}
