use std::collections::HashSet;
use std::ffi::{c_char, c_int, c_uint, CStr, CString};
use std::ptr;
use std::sync::atomic::{AtomicBool, AtomicI64, AtomicU64, Ordering};
use std::sync::{Arc, OnceLock};
use std::time::{SystemTime, UNIX_EPOCH};

use libloading::{Library, Symbol};
use tokio::sync::mpsc;
use tracing::{error, info, warn};

use super::captured_payload::CapturedPayload;
use crate::combat::capture_dispatcher::{contains_any, COMBAT_SIGNATURES};

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

// ===== Raw pcap FFI types =====

type PcapT = *mut std::ffi::c_void;
type PcapIfT = *mut PcapIf;

#[repr(C)]
struct PcapIf {
    next: *mut PcapIf,
    name: *const c_char,
    description: *const c_char,
    addresses: *mut PcapAddr,
    flags: c_uint,
}

#[repr(C)]
struct PcapAddr {
    next: *mut PcapAddr,
    addr: *mut SockAddr,
    netmask: *mut SockAddr,
    broadaddr: *mut SockAddr,
    dstaddr: *mut SockAddr,
}

#[repr(C)]
struct SockAddr {
    sa_family: u16,
    sa_data: [u8; 14],
}

#[repr(C)]
struct PcapPkthdr {
    ts_sec: i32,
    ts_usec: i32,
    caplen: c_uint,
    len: c_uint,
}

const PCAP_IF_LOOPBACK: c_uint = 0x00000001;

// ===== Device info =====

#[derive(Clone)]
struct DeviceInfo {
    name: String,
    description: String,
    has_addresses: bool,
    is_loopback: bool,
}

impl DeviceInfo {
    fn label(&self) -> &str {
        if self.description.is_empty() {
            &self.name
        } else {
            &self.description
        }
    }

    fn is_virtual(&self) -> bool {
        let label = self.label().to_lowercase();
        self.is_loopback
            || self.name.to_lowercase().contains("loopback")
            || label.contains("loopback")
            || label.contains("tap-windows")
            || label.contains("tap")
            || label.contains("wintun")
            || label.contains("wireguard")
    }
}

// ===== Pcap library wrapper =====

struct PcapLib {
    _lib: Library,
    findalldevs: unsafe extern "C" fn(*mut PcapIfT, *mut c_char) -> c_int,
    freealldevs: unsafe extern "C" fn(PcapIfT),
    open_live: unsafe extern "C" fn(*const c_char, c_int, c_int, c_int, *mut c_char) -> PcapT,
    close: unsafe extern "C" fn(PcapT),
    next_ex: unsafe extern "C" fn(PcapT, *mut *mut PcapPkthdr, *mut *const u8) -> c_int,
}

impl PcapLib {
    fn load() -> Result<Self, String> {
        // Npcap installed without "WinPcap API-compatible mode" puts wpcap.dll only
        // in System32\Npcap, which is not on the DLL search path: load it from there.
        let lib = unsafe { Library::new("wpcap.dll") }
            .or_else(|e| load_from_npcap_dir().ok_or(e))
            .map_err(|e| {
                format!(
                    "Failed to load wpcap.dll. Is Npcap installed? Download from https://npcap.com\nError: {}",
                    e
                )
            })?;

        unsafe {
            let findalldevs: Symbol<unsafe extern "C" fn(*mut PcapIfT, *mut c_char) -> c_int> =
                lib.get(b"pcap_findalldevs").map_err(|e| format!("pcap_findalldevs: {}", e))?;
            let freealldevs: Symbol<unsafe extern "C" fn(PcapIfT)> =
                lib.get(b"pcap_freealldevs").map_err(|e| format!("pcap_freealldevs: {}", e))?;
            let open_live: Symbol<
                unsafe extern "C" fn(*const c_char, c_int, c_int, c_int, *mut c_char) -> PcapT,
            > = lib.get(b"pcap_open_live").map_err(|e| format!("pcap_open_live: {}", e))?;
            let close: Symbol<unsafe extern "C" fn(PcapT)> =
                lib.get(b"pcap_close").map_err(|e| format!("pcap_close: {}", e))?;
            let next_ex: Symbol<
                unsafe extern "C" fn(PcapT, *mut *mut PcapPkthdr, *mut *const u8) -> c_int,
            > = lib.get(b"pcap_next_ex").map_err(|e| format!("pcap_next_ex: {}", e))?;

            Ok(Self {
                findalldevs: *findalldevs,
                freealldevs: *freealldevs,
                open_live: *open_live,
                close: *close,
                next_ex: *next_ex,
                _lib: lib,
            })
        }
    }

    fn find_all_devs(&self) -> Result<Vec<DeviceInfo>, String> {
        let mut alldevs: PcapIfT = ptr::null_mut();
        let mut errbuf = [0u8; 256];

        let ret =
            unsafe { (self.findalldevs)(&mut alldevs, errbuf.as_mut_ptr() as *mut c_char) };

        if ret != 0 || alldevs.is_null() {
            let err = unsafe { CStr::from_ptr(errbuf.as_ptr() as *const c_char) }
                .to_string_lossy()
                .to_string();
            return Err(format!("pcap_findalldevs failed: {}", err));
        }

        let mut devices = Vec::new();
        let mut dev = alldevs;
        while !dev.is_null() {
            let d = unsafe { &*dev };
            let name = if d.name.is_null() {
                String::new()
            } else {
                unsafe { CStr::from_ptr(d.name) }
                    .to_string_lossy()
                    .to_string()
            };
            let description = if d.description.is_null() {
                String::new()
            } else {
                unsafe { CStr::from_ptr(d.description) }
                    .to_string_lossy()
                    .to_string()
            };
            let has_addresses = !d.addresses.is_null();
            let is_loopback = (d.flags & PCAP_IF_LOOPBACK) != 0;

            devices.push(DeviceInfo {
                name,
                description,
                has_addresses,
                is_loopback,
            });
            dev = d.next;
        }

        unsafe { (self.freealldevs)(alldevs) };
        Ok(devices)
    }

    fn open_live_handle(&self, name: &str) -> Result<PcapT, String> {
        let c_name = CString::new(name).map_err(|e| format!("Invalid device name: {}", e))?;
        let mut errbuf = [0u8; 256];

        let handle = unsafe {
            (self.open_live)(
                c_name.as_ptr(),
                65535,  // snaplen
                // Not promiscuous: the game traffic is our own, and many Wi-Fi drivers
                // deliver nothing at all to a capture in promiscuous mode.
                0,      // promiscuous
                // Npcap hands buffered packets over when this read timeout
                // expires, so it is a floor on capture latency (was 100 ms).
                20,     // timeout ms
                errbuf.as_mut_ptr() as *mut c_char,
            )
        };

        if handle.is_null() {
            let err = unsafe { CStr::from_ptr(errbuf.as_ptr() as *const c_char) }
                .to_string_lossy()
                .to_string();
            return Err(format!("pcap_open_live failed: {}", err));
        }

        Ok(handle)
    }
}

/// How often to look for network devices that appeared (or came back) after the start.
const DEVICE_SCAN_MS: u64 = 15_000;

/// Devices with a capture thread, or that failed to open (not retried).
type ActiveDevices = Arc<parking_lot::Mutex<HashSet<String>>>;

// Safety: PcapLib function pointers are thread-safe (each thread gets its own pcap handle)
unsafe impl Send for PcapLib {}
unsafe impl Sync for PcapLib {}

/// Manages pcap device handles and captures TCP traffic from network interfaces.
/// Uses runtime dynamic loading of wpcap.dll — no SDK needed at compile time.
pub struct PcapCapturer {
    running: Arc<AtomicBool>,
    sender: mpsc::Sender<CapturedPayload>,
}

impl PcapCapturer {
    pub fn new(sender: mpsc::Sender<CapturedPayload>) -> Self {
        Self {
            running: Arc::new(AtomicBool::new(false)),
            sender,
        }
    }

    pub fn start(&self) {
        if self.running.swap(true, Ordering::SeqCst) {
            return;
        }

        let pcap = match PcapLib::load() {
            Ok(p) => Arc::new(p),
            Err(e) => {
                error!("{}", e);
                let _ = START_ERROR.set("Npcap".to_string());
                self.running.store(false, Ordering::SeqCst);
                return;
            }
        };

        let devices = match pcap.find_all_devs() {
            Ok(d) => d,
            Err(e) => {
                error!("Failed to list devices: {}", e);
                let _ = START_ERROR.set("Npcap".to_string());
                self.running.store(false, Ordering::SeqCst);
                return;
            }
        };

        // Only capture on devices that have addresses
        for d in devices.iter().filter(|d| !d.has_addresses) {
            diag_device(d.label(), false, Some("no address, not captured".into()));
        }
        let devices: Vec<_> = devices.into_iter().filter(|d| d.has_addresses).collect();

        if devices.is_empty() {
            // Not fatal: the rescan below picks a device up once the network is there.
            error!("No capture devices found with addresses");
        }

        info!("Found {} capture devices", devices.len());
        for (i, dev) in devices.iter().enumerate() {
            info!(
                "  [{}] {} (loopback={}, addresses={})",
                i,
                dev.label(),
                dev.is_loopback,
                dev.has_addresses
            );
        }

        let active: ActiveDevices = Arc::default();
        let virtual_devices: Vec<_> = devices.iter().filter(|d| d.is_virtual()).cloned().collect();
        let physical_devices: Vec<_> = devices.iter().filter(|d| !d.is_virtual()).cloned().collect();

        // Start virtual/loopback devices first
        for device in &virtual_devices {
            start_capture_thread(
                device.clone(),
                pcap.clone(),
                self.sender.clone(),
                self.running.clone(),
                active.clone(),
            );
        }

        let running = self.running.clone();
        let sender = self.sender.clone();
        let delay_physical = !virtual_devices.is_empty();
        std::thread::spawn(move || {
            // Physical devices start after a delay as fallback when virtual ones exist.
            if delay_physical {
                std::thread::sleep(std::time::Duration::from_millis(1500));
            }
            for device in &physical_devices {
                if !running.load(Ordering::SeqCst) {
                    return;
                }
                info!("Starting capture on physical device: {}", device.label());
                start_capture_thread(device.clone(), pcap.clone(), sender.clone(), running.clone(), active.clone());
            }
            // The list above is read once. A VPN / ping reducer connected after the
            // meter started, Wi-Fi back after sleep, or an adapter whose capture ended
            // on an error (unplugged, reset) was never captured again until a restart:
            // look again every DEVICE_SCAN_MS and capture what is not captured.
            loop {
                std::thread::sleep(std::time::Duration::from_millis(DEVICE_SCAN_MS));
                if !running.load(Ordering::SeqCst) {
                    return;
                }
                let Ok(devices) = pcap.find_all_devs() else { continue };
                for device in devices.into_iter().filter(|d| d.has_addresses) {
                    start_capture_thread(device, pcap.clone(), sender.clone(), running.clone(), active.clone());
                }
            }
        });
    }

    pub fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
    }

    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }
}

/// Per adapter, for the connection diagnosis: what Npcap gave us, so a meter stuck on
/// "detecting" can say whether the adapter opened, sees packets, sees the game.
#[derive(Default)]
struct DiagCounters {
    frames: AtomicU64,
    game: AtomicU64,
    last_frame_ms: AtomicI64,
    last_game_ms: AtomicI64,
}

struct DeviceDiag {
    label: String,
    running: bool,
    error: Option<String>,
    counters: Arc<DiagCounters>,
}

static DEVICES: parking_lot::Mutex<Vec<DeviceDiag>> = parking_lot::const_mutex(Vec::new());

/// Record an adapter's state; returns its counters (kept across reopenings).
fn diag_device(label: &str, running: bool, error: Option<String>) -> Arc<DiagCounters> {
    let mut list = DEVICES.lock();
    let i = match list.iter().position(|d| d.label == label) {
        Some(i) => i,
        None => {
            list.push(DeviceDiag { label: label.to_string(), running, error: None, counters: Arc::default() });
            list.len() - 1
        }
    };
    list[i].running = running;
    list[i].error = error;
    list[i].counters.clone()
}

/// Every adapter the capture saw, as the widget and the copied diagnosis show it.
pub fn device_diagnosis() -> Vec<serde_json::Value> {
    DEVICES
        .lock()
        .iter()
        .map(|d| {
            let c = &d.counters;
            serde_json::json!({
                "name": d.label,
                "running": d.running,
                "error": d.error,
                "frames": c.frames.load(Ordering::Relaxed),
                "gamePackets": c.game.load(Ordering::Relaxed),
                "lastFrameMs": c.last_frame_ms.load(Ordering::Relaxed),
                "lastGameMs": c.last_game_ms.load(Ordering::Relaxed),
            })
        })
        .collect()
}

/// Set when capture could not start at all; the widget shows it as an Npcap error.
static START_ERROR: OnceLock<String> = OnceLock::new();

pub fn start_error() -> Option<&'static str> {
    START_ERROR.get().map(String::as_str)
}

#[cfg(windows)]
fn load_from_npcap_dir() -> Option<Library> {
    use libloading::os::windows::{Library as WinLibrary, LOAD_WITH_ALTERED_SEARCH_PATH};
    let path = crate::powermeter::npcap_dir()?.join("wpcap.dll");
    // Altered search path: wpcap.dll finds Packet.dll next to it.
    unsafe { WinLibrary::load_with_flags(path, LOAD_WITH_ALTERED_SEARCH_PATH) }.ok().map(Into::into)
}

#[cfg(not(windows))]
fn load_from_npcap_dir() -> Option<Library> {
    None
}

/// List available capture device labels (for the settings UI dropdown).
pub fn list_device_labels() -> Result<Vec<String>, String> {
    let pcap = PcapLib::load().map_err(|e| e.to_string())?;
    let devices = pcap.find_all_devs().map_err(|e| e.to_string())?;
    Ok(devices
        .into_iter()
        .filter(|d| d.has_addresses)
        .map(|d| d.label().to_string())
        .collect())
}

fn start_capture_thread(
    device: DeviceInfo,
    pcap: Arc<PcapLib>,
    sender: mpsc::Sender<CapturedPayload>,
    running: Arc<AtomicBool>,
    active: ActiveDevices,
) {
    let label = device.label().to_string();
    let dev_name = device.name.clone();
    // One capture per device; a device that failed to open stays here and is not retried.
    if !active.lock().insert(dev_name.clone()) {
        return;
    }

    std::thread::spawn(move || {
        let handle = match pcap.open_live_handle(&dev_name) {
            Ok(h) => h,
            Err(e) => {
                warn!("Failed to open capture on {}: {}", label, e);
                diag_device(&label, false, Some(e));
                return;
            }
        };

        info!("Capture active on {}", label);
        let counters = diag_device(&label, true, None);
        let mut end_error = None;
        let mut dropped: u64 = 0;

        while running.load(Ordering::SeqCst) {
            let mut header: *mut PcapPkthdr = ptr::null_mut();
            let mut data: *const u8 = ptr::null();

            let ret = unsafe { (pcap.next_ex)(handle, &mut header, &mut data) };

            match ret {
                1 => {
                    let hdr = unsafe { &*header };
                    let len = hdr.caplen as usize;
                    // Use pcap hardware timestamp (seconds + microseconds since epoch)
                    let pcap_ts_ms = (hdr.ts_sec as i64) * 1000 + (hdr.ts_usec as i64) / 1000;
                    // Sanity check: if pcap timestamp looks bogus, fall back to wall clock
                    let ts = if pcap_ts_ms > 1_000_000_000_000 && pcap_ts_ms < 2_000_000_000_000 {
                        pcap_ts_ms
                    } else {
                        now_ms()
                    };
                    let frame = unsafe { std::slice::from_raw_parts(data, len) };
                    counters.frames.fetch_add(1, Ordering::Relaxed);
                    counters.last_frame_ms.store(ts, Ordering::Relaxed);
                    if let Some(mut payload) = parse_tcp_payload(frame, &label) {
                        payload.captured_at_ms = ts;
                        if contains_any(&payload.data, &COMBAT_SIGNATURES) {
                            counters.game.fetch_add(1, Ordering::Relaxed);
                            counters.last_game_ms.store(ts, Ordering::Relaxed);
                        }
                        // A full channel drops the segment, a hole in the stream:
                        // say so (first, then every 1000th) instead of losing hits silently.
                        if sender.try_send(payload).is_err() {
                            dropped += 1;
                            if dropped % 1000 == 1 {
                                warn!("Capture queue full on {}: {} segments dropped", label, dropped);
                            }
                        }
                    }
                }
                0 => continue, // Timeout
                -2 => break,   // EOF (savefile)
                _ => {
                    warn!("Capture error on {} (ret={})", label, ret);
                    end_error = Some(format!("capture error (ret={ret})"));
                    break;
                }
            }
        }

        unsafe { (pcap.close)(handle) };
        diag_device(&label, false, end_error);
        // Ended (adapter gone or reset): the rescan captures it again if it comes back.
        active.lock().remove(&dev_name);
        info!("Capture stopped on {}", label);
    });
}

/// Parse raw captured frame to extract TCP payload.
/// Handles three link-layer formats:
/// - Ethernet (14-byte header, ether_type 0x0800 for IPv4)
/// - NULL/Loopback (4-byte header used by Npcap loopback adapter: AF_INET = 2)
/// - Raw IPv4 (no link-layer header, first nibble = 4)
fn parse_tcp_payload(frame: &[u8], device_name: &str) -> Option<CapturedPayload> {
    if frame.len() < 4 {
        return None;
    }

    let ip_offset = if frame.len() >= 14 {
        let ether_type = u16::from_be_bytes([frame[12], frame[13]]);
        if ether_type == 0x0800 {
            14 // Standard Ethernet
        } else if ether_type == 0x8100 && frame.len() >= 18 && frame[16] == 0x08 && frame[17] == 0x00 {
            18 // 802.1Q VLAN/priority tag (Killer and other gaming NICs) then IPv4
        } else if frame[0] == 2 && frame[1] == 0 && frame[2] == 0 && frame[3] == 0 {
            4 // NULL/Loopback: AF_INET (little-endian 2) = IPv4
        } else if (frame[0] >> 4) == 4 {
            0 // Raw IPv4
        } else {
            return None;
        }
    } else if (frame[0] >> 4) == 4 {
        0 // Raw IPv4 (short frame)
    } else {
        return None;
    };

    if frame.len() < ip_offset + 20 {
        return None;
    }
    let ip_header = &frame[ip_offset..];
    if ip_header[0] >> 4 != 4 {
        return None;
    }
    let ip_header_len = ((ip_header[0] & 0x0F) as usize) * 4;
    if ip_header[9] != 6 {
        return None; // Not TCP
    }

    let src_ip = format!(
        "{}.{}.{}.{}",
        ip_header[12], ip_header[13], ip_header[14], ip_header[15]
    );
    let dst_ip = format!(
        "{}.{}.{}.{}",
        ip_header[16], ip_header[17], ip_header[18], ip_header[19]
    );

    let tcp_offset = ip_offset + ip_header_len;
    if frame.len() < tcp_offset + 20 {
        return None;
    }
    let tcp_header = &frame[tcp_offset..];
    let src_port = u16::from_be_bytes([tcp_header[0], tcp_header[1]]);
    let dst_port = u16::from_be_bytes([tcp_header[2], tcp_header[3]]);
    let tcp_seq = u32::from_be_bytes([tcp_header[4], tcp_header[5], tcp_header[6], tcp_header[7]]);
    let tcp_ack =
        u32::from_be_bytes([tcp_header[8], tcp_header[9], tcp_header[10], tcp_header[11]]);
    let tcp_header_len = ((tcp_header[12] >> 4) as usize) * 4;

    let payload_offset = tcp_offset + tcp_header_len;
    if payload_offset >= frame.len() {
        return None;
    }
    // Ethernet pads frames to 60 bytes, so a short segment (every pure ACK)
    // carries zero bytes that are not TCP data: the IP total length bounds it.
    // Live logs have thousands of these 6-byte "payloads"; one landing inside
    // a split game packet shifts that packet's bytes. Only a padded frame
    // (IP length < 46) is trimmed, so offloaded segments are left as captured.
    let ip_total = u16::from_be_bytes([ip_header[2], ip_header[3]]) as usize;
    let end = if ip_offset >= 14 && ip_total < 46 { (ip_offset + ip_total).min(frame.len()) } else { frame.len() };
    if payload_offset >= end {
        return None;
    }
    let payload = &frame[payload_offset..end];
    if payload.is_empty() {
        return None;
    }

    Some(CapturedPayload {
        src_port,
        dst_port,
        data: payload.to_vec(),
        device_name: Some(device_name.to_string()),
        captured_at_ms: now_ms(),
        src_ip: Some(src_ip),
        dst_ip: Some(dst_ip),
        tcp_seq,
        tcp_ack,
    })
}

#[cfg(test)]
mod tests {
    use super::parse_tcp_payload;

    /// Ethernet + IPv4 (`ip_len`) + 20-byte TCP header, then `tail`.
    fn frame(ip_len: u16, tail: &[u8]) -> Vec<u8> {
        let mut f = vec![0u8; 12];
        f.extend_from_slice(&[0x08, 0x00, 0x45, 0x00]);
        f.extend_from_slice(&ip_len.to_be_bytes());
        f.extend_from_slice(&[0, 0, 0, 0, 64, 6, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2]);
        f.extend_from_slice(&[0x31, 0x2d, 0xd4, 0x10, 0, 0, 0, 1, 0, 0, 0, 1, 0x50, 0x10, 0, 0, 0, 0, 0, 0]);
        f.extend_from_slice(tail);
        f
    }

    #[test]
    fn ethernet_padding_is_not_payload() {
        // A pure ACK padded to 60 bytes has no payload at all.
        assert!(parse_tcp_payload(&frame(40, &[0; 6]), "eth").is_none());
        // A 3-byte segment keeps its 3 bytes, not the 3 pad bytes after them.
        assert_eq!(parse_tcp_payload(&frame(43, &[7, 8, 9, 0, 0, 0]), "eth").unwrap().data, vec![7, 8, 9]);
        // An unpadded frame is untouched.
        assert_eq!(parse_tcp_payload(&frame(48, &[1; 8]), "eth").unwrap().data, vec![1; 8]);
    }

    #[test]
    fn vlan_tagged_frames_are_read() {
        // Killer and other gaming NICs hand Npcap 802.1Q-tagged frames: 4 more bytes before IPv4.
        let mut f = frame(48, &[1; 8]);
        f.splice(12..12, [0x81, 0x00, 0x00, 0x00]);
        let p = parse_tcp_payload(&f, "wifi").unwrap();
        assert_eq!((p.src_port, p.data), (0x312d, vec![1; 8]));
    }
}
