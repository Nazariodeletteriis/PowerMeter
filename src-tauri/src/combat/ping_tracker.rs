use std::collections::VecDeque;

use parking_lot::Mutex;

use crate::capture::captured_payload::CapturedPayload;

const MAX_PING_MS: i32 = 9999;
const MIN_PING_RS_BYTES: usize = 12;
const MAX_HISTORY: usize = 10_000;
/// The client asks every 10 s: a request older than this has had its answer.
const KEEP_SENT_MS: i64 = 10_000;
/// A TCP segment can carry the ping request together with other client packets (movement): kept up to this.
const MAX_SENT_BYTES: usize = 1500;
const MAX_SENT: usize = 512;

pub struct PingTracker {
    inner: Mutex<Inner>,
}

struct Inner {
    last_ping: Option<i32>,
    history: Vec<(i64, i32)>,
    /// Recent client→server packets: (captured at, payload).
    sent: VecDeque<(i64, Vec<u8>)>,
}

impl PingTracker {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(Inner {
                last_ping: None,
                history: Vec::new(),
                sent: VecDeque::new(),
            }),
        }
    }

    /// `outbound`: the packet goes client→server.
    pub fn on_packet(&self, cap: &CapturedPayload, outbound: bool) {
        if outbound {
            if cap.data.len() <= MAX_SENT_BYTES {
                let mut inner = self.inner.lock();
                while inner.sent.front().is_some_and(|(t, _)| cap.captured_at_ms - t > KEEP_SENT_MS) || inner.sent.len() >= MAX_SENT {
                    inner.sent.pop_front();
                }
                inner.sent.push_back((cap.captured_at_ms, cap.data.clone()));
            }
        } else if cap.data.len() >= MIN_PING_RS_BYTES {
            self.try_ping_rs(&cap.data, cap.captured_at_ms);
        }
    }

    /// The server's answer `03 36 00 00 <8 bytes>` echoes the client's request. Those 8 bytes were the client's
    /// .NET clock; now they come from a clock of the game's own, whose base the app can't know. So the ping is
    /// timed on the capture's clock instead: from the request that carried the same 8 bytes to this answer.
    fn try_ping_rs(&self, data: &[u8], arrival_ms: i64) {
        let mut i = 0;
        while i + MIN_PING_RS_BYTES <= data.len() {
            if data[i..i + 4] == [0x03, 0x36, 0x00, 0x00] {
                let echoed = &data[i + 4..i + 12];
                let mut inner = self.inner.lock();
                let sent_at = inner
                    .sent
                    .iter()
                    .rev()
                    .find(|(_, d)| d.windows(8).any(|w| w == echoed))
                    .map(|(t, _)| *t);
                let rtt_ms = sent_at.map(|t| (arrival_ms - t) as i32);
                if let Some(rtt_ms) = rtt_ms.filter(|r| (1..=MAX_PING_MS).contains(r)) {
                    inner.last_ping = Some(rtt_ms);
                    let now = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_millis() as i64;
                    inner.history.push((now, rtt_ms));
                    if inner.history.len() > MAX_HISTORY {
                        inner.history.remove(0);
                    }
                }
                i += 12;
            } else {
                i += 1;
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
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cap(data: Vec<u8>, at: i64) -> CapturedPayload {
        CapturedPayload { src_port: 0, dst_port: 0, data, device_name: None, captured_at_ms: at, src_ip: None, dst_ip: None, tcp_seq: 0, tcp_ack: 0 }
    }

    // The answer's 8 bytes as packets_20261013_031645 (03:16:50) carries them: no longer a .NET timestamp.
    const ECHO: [u8; 8] = 0x0003_F21E_5F98_i64.to_le_bytes();

    #[test]
    fn ping_is_timed_from_the_request_carrying_the_same_bytes() {
        let t = PingTracker::new();
        let mut req = vec![0x0C, 0x00, 0x36];
        req.extend_from_slice(&ECHO);
        t.on_packet(&cap(vec![0x05, 0x00, 0x37, 0x01, 0x02], 1_000), true); // another client packet
        t.on_packet(&cap(req, 1_010), true);
        let mut answer = vec![0x0E, 0x00, 0x36, 0x01, 0x03, 0x36, 0x00, 0x00];
        answer.extend_from_slice(&ECHO);
        t.on_packet(&cap(answer, 1_052), false);
        assert_eq!(t.current_ping_ms(), Some(42));
    }

    #[test]
    fn an_answer_without_its_request_sets_no_ping() {
        let t = PingTracker::new();
        let mut answer = vec![0x03, 0x36, 0x00, 0x00];
        answer.extend_from_slice(&ECHO);
        t.on_packet(&cap(answer, 1_052), false);
        assert_eq!(t.current_ping_ms(), None);
    }
}
