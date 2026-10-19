use std::collections::VecDeque;

use parking_lot::Mutex;

use crate::capture::captured_payload::CapturedPayload;

const MAX_PING_MS: i32 = 9999;
const MAX_HISTORY: usize = 10_000;
/// A client segment older than this without its ACK was lost or retransmitted: dropped, never a sample.
const KEEP_SENT_MS: i64 = 10_000;
const MAX_SENT: usize = 2_000;
/// The ping shown is the lowest round trip of this window: the server's ACK can wait for its next packet (one every
/// ~50 ms in game), so single samples run a little high; the lowest is the network's own time.
const WINDOW_MS: i64 = 5_000;

pub struct PingTracker {
    inner: Mutex<Inner>,
}

struct Inner {
    last_ping: Option<i32>,
    history: Vec<(i64, i32)>,
    /// Client segments not acknowledged yet: (local port, sequence number after the segment, captured at).
    sent: VecDeque<(u16, u32, i64)>,
    /// Round trips of the last WINDOW_MS: (captured at, ms).
    samples: VecDeque<(i64, i32)>,
}

impl PingTracker {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(Inner {
                last_ping: None,
                history: Vec::new(),
                sent: VecDeque::new(),
                samples: VecDeque::new(),
            }),
        }
    }

    /// The ping as the network's round trip, from the TCP headers: a client segment, then the server's ACK covering
    /// it. The game's own ping can't be read any more: its answer (`03 36 00 00 <8 bytes>`) echoes a clock of the
    /// game's whose base moves from day to day, and the request side is encrypted (packets_20261019_023957, the
    /// first log with the client's packets). `outbound`: the packet goes client→server.
    pub fn on_packet(&self, cap: &CapturedPayload, outbound: bool) {
        let now = cap.captured_at_ms;
        let mut inner = self.inner.lock();
        if outbound {
            if cap.data.is_empty() {
                return; // a bare ACK: nothing for the server to acknowledge
            }
            while inner.sent.front().is_some_and(|&(_, _, t)| now - t > KEEP_SENT_MS) || inner.sent.len() >= MAX_SENT {
                inner.sent.pop_front();
            }
            inner.sent.push_back((cap.src_port, cap.tcp_seq.wrapping_add(cap.data.len() as u32), now));
            return;
        }
        // Every segment of this connection the ACK covers is acknowledged now; the newest of them is the round trip.
        let mut newest = None;
        inner.sent.retain(|&(port, end, t)| {
            let covered = port == cap.dst_port && cap.tcp_ack.wrapping_sub(end) as i32 >= 0;
            if covered {
                newest = Some(t);
            }
            !covered
        });
        let Some(sent_at) = newest else { return };
        let rtt = (now - sent_at) as i32;
        if !(0..=MAX_PING_MS).contains(&rtt) {
            return;
        }
        inner.samples.push_back((now, rtt));
        while inner.samples.front().is_some_and(|&(t, _)| now - t > WINDOW_MS) {
            inner.samples.pop_front();
        }
        let ping = inner.samples.iter().map(|&(_, r)| r).min().unwrap_or(rtt).max(1);
        if inner.last_ping != Some(ping) {
            inner.last_ping = Some(ping);
            let wall = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as i64;
            inner.history.push((wall, ping));
            if inner.history.len() > MAX_HISTORY {
                inner.history.remove(0);
            }
        }
    }

    pub fn current_ping_ms(&self) -> Option<i32> {
        self.inner.lock().last_ping
    }

    pub fn get_ping_history(&self, start_ms: i64, end_ms: i64) -> Vec<(i64, i32)> {
        self.inner.lock().history.iter()
            .filter(|(ts, _)| *ts >= start_ms && *ts <= end_ms)
            .cloned()
            .collect()
    }

    pub fn reset(&self) {
        let mut inner = self.inner.lock();
        inner.last_ping = None;
        inner.history.clear();
        inner.sent.clear();
        inner.samples.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const GAME: u16 = 13328;
    const LOCAL: u16 = 51000;

    fn out(seq: u32, len: usize, at: i64) -> CapturedPayload {
        CapturedPayload { src_port: LOCAL, dst_port: GAME, data: vec![0x0e; len], device_name: None, captured_at_ms: at, src_ip: None, dst_ip: None, tcp_seq: seq, tcp_ack: 0 }
    }

    fn inbound(ack: u32, at: i64) -> CapturedPayload {
        CapturedPayload { src_port: GAME, dst_port: LOCAL, data: vec![0x18, 0x03, 0x36], device_name: None, captured_at_ms: at, src_ip: None, dst_ip: None, tcp_seq: 0, tcp_ack: ack }
    }

    #[test]
    fn ping_is_the_round_trip_to_the_servers_ack() {
        let t = PingTracker::new();
        t.on_packet(&out(1000, 11, 10_000), true); // the client's 11-byte packets, as in the 10/19 log
        t.on_packet(&out(1011, 11, 10_031), true);
        t.on_packet(&inbound(1000, 10_040), false); // acks nothing new yet
        assert_eq!(t.current_ping_ms(), None);
        t.on_packet(&inbound(1022, 10_073), false); // covers both: the newest went 42 ms ago
        assert_eq!(t.current_ping_ms(), Some(42));
    }

    #[test]
    fn the_lowest_round_trip_of_the_window_is_shown() {
        let t = PingTracker::new();
        t.on_packet(&out(1000, 11, 10_000), true);
        t.on_packet(&inbound(1011, 10_090), false); // the server waited for its next packet to ack
        t.on_packet(&out(1011, 11, 10_200), true);
        t.on_packet(&inbound(1022, 10_240), false);
        assert_eq!(t.current_ping_ms(), Some(40));
    }

    #[test]
    fn sequence_numbers_wrap() {
        let t = PingTracker::new();
        t.on_packet(&out(u32::MAX - 4, 11, 10_000), true);
        t.on_packet(&inbound(6, 10_035), false);
        assert_eq!(t.current_ping_ms(), Some(35));
    }
}
