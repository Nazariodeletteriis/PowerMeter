//! PowerMeter additions: the dashboard window and first-run onboarding.
//!
//! Kept in its own module so the A2Tools engine files stay close to upstream
//! and `git merge upstream/main` keeps applying cleanly.

use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{Emitter, Manager};

use crate::platform::hotkeys::{parse_hotkey_label, HotkeyManager};
use crate::AppState;

const CLICK_THROUGH_HOTKEY_KEY: &str = "pm.clickThroughHotkey";

/// Not persisted on purpose: the overlay always starts clickable, so a user
/// who forgot the hotkey is never locked out of it.
static CLICK_THROUGH: AtomicBool = AtomicBool::new(false);

/// Lets mouse input pass through the overlay to the game underneath. Emits
/// `pm-click-through` so the overlay's lock button reflects the state.
fn apply_click_through(app: &tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("overlay window not found")?;
    window.set_ignore_cursor_events(enabled).map_err(|e| e.to_string())?;
    CLICK_THROUGH.store(enabled, Ordering::SeqCst);
    let _ = app.emit("pm-click-through", enabled);
    Ok(())
}

/// The overlay's lock button (design: widget header).
#[tauri::command]
pub fn set_click_through(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    apply_click_through(&app, enabled)
}

#[tauri::command]
pub fn get_click_through() -> bool {
    CLICK_THROUGH.load(Ordering::SeqCst)
}

/// Set when the user closes the overlay, so the engine's auto-hide loop does
/// not bring it back when Aion 2 regains focus. Cleared by any explicit show.
static USER_HIDDEN: AtomicBool = AtomicBool::new(false);

pub fn user_hidden() -> bool {
    USER_HIDDEN.load(Ordering::SeqCst)
}

pub fn set_user_hidden(hidden: bool) {
    USER_HIDDEN.store(hidden, Ordering::SeqCst);
}

/// The overlay's close button.
#[tauri::command]
pub fn hide_overlay(app: tauri::AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("overlay window not found")?;
    set_user_hidden(true);
    window.hide().map_err(|e| e.to_string())
}

/// Brings the overlay back if it was hidden with the toggle hotkey.
#[tauri::command]
pub fn show_overlay(app: tauri::AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("overlay window not found")?;
    set_user_hidden(false);
    window.show().map_err(|e| e.to_string())?;
    let _ = window.unminimize();
    let _ = window.set_always_on_top(true);
    Ok(())
}

/// Global hotkey toggling click-through (default Ctrl+Alt+L). Uses a second
/// A2Tools `HotkeyManager` with only its first slot bound, so the engine's own
/// reload/toggle hotkeys and its hotkeys.rs stay untouched.
pub fn start_click_through_hotkey(app: &tauri::AppHandle) {
    let label = app
        .try_state::<AppState>()
        .and_then(|state| state.settings.get(CLICK_THROUGH_HOTKEY_KEY))
        .unwrap_or_default();
    let (mods, vk) = parse_hotkey_label(&label).unwrap_or((0x0002 | 0x0001, 0x4C)); // Ctrl+Alt+L
    let app = app.clone();
    // The listener thread keeps running after the manager is dropped, as the
    // engine's own manager in lib.rs does.
    HotkeyManager::new().start(
        mods,
        vk,
        0,
        0,
        move || {
            let next = !CLICK_THROUGH.load(Ordering::SeqCst);
            if let Err(e) = apply_click_through(&app, next) {
                tracing::warn!("Click-through toggle failed: {}", e);
            }
        },
        || {},
    );
}

/// Packet capture needs admin rights. The manifest is `asInvoker` because the
/// MSI's "Launch" checkbox and the updater restart start us via CreateProcess,
/// which can't show UAC. So we relaunch through ShellExecute "runas", which
/// does. If the user declines, we keep running un-elevated and onboarding
/// explains why admin is needed. Returns true when this process should exit.
#[cfg(all(windows, not(debug_assertions)))]
pub fn relaunch_elevated() -> bool {
    use windows::core::{w, HSTRING, PCWSTR};
    use windows::Win32::UI::Shell::ShellExecuteW;
    use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

    const FLAG: &str = "--pm-elevated"; // never loop if elevation isn't granted
    let args: Vec<String> = std::env::args().skip(1).collect();
    if crate::platform::admin::is_admin() || args.iter().any(|a| a == FLAG) {
        return false;
    }
    let Ok(exe) = std::env::current_exe() else { return false };
    let params = args.iter().map(|a| format!("\"{a}\"")).chain([FLAG.to_string()]).collect::<Vec<_>>().join(" ");
    let result = unsafe {
        ShellExecuteW(None, w!("runas"), &HSTRING::from(exe.as_os_str()), &HSTRING::from(params), PCWSTR::null(), SW_SHOWNORMAL)
    };
    result.0 as usize > 32
}

#[cfg(not(all(windows, not(debug_assertions))))]
pub fn relaunch_elevated() -> bool {
    false
}

/// Same probe the capture engine uses (`PcapLib::load`): Npcap in WinPcap
/// API-compatible mode puts `wpcap.dll` on the default DLL search path.
#[tauri::command]
pub fn npcap_installed() -> bool {
    unsafe { libloading::Library::new("wpcap.dll") }.is_ok()
}

/// Lets `wpcap.dll` load from Npcap's own folder, so capture works even when
/// Npcap was installed without "WinPcap API-compatible Mode" (the engine loads
/// it by bare name). Appended, so a compat-mode copy in System32 still wins.
/// Call first thing in `run()`, before any thread reads the environment.
pub fn add_npcap_to_dll_path() {
    let Some(root) = std::env::var_os("SystemRoot") else { return };
    let path = std::env::var_os("PATH").unwrap_or_default();
    let dirs = std::env::split_paths(&path)
        .chain([std::path::Path::new(&root).join("System32").join("Npcap")]);
    if let Ok(joined) = std::env::join_paths(dirs) {
        unsafe { std::env::set_var("PATH", joined) };
    }
}

/// Downloads the official Npcap installer from npcap.com and starts it.
/// Npcap's free license forbids bundling it with PowerMeter, so the user's
/// machine fetches it from the source and the user clicks through its wizard.
#[tauri::command]
pub async fn install_npcap() -> Result<(), String> {
    let page = reqwest::get("https://npcap.com/")
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())?;
    let file = page
        .split('"')
        .find(|s| s.starts_with("dist/npcap-") && s.ends_with(".exe"))
        .ok_or("Npcap download link not found on npcap.com")?;
    let bytes = reqwest::get(format!("https://npcap.com/{file}"))
        .await
        .and_then(|r| r.error_for_status())
        .map_err(|e| e.to_string())?
        .bytes()
        .await
        .map_err(|e| e.to_string())?;
    let installer = std::env::temp_dir().join(file.trim_start_matches("dist/"));
    std::fs::write(&installer, &bytes).map_err(|e| e.to_string())?;
    std::process::Command::new(&installer).spawn().map_err(|e| e.to_string())?;
    Ok(())
}

/// Async for the same reason as `open_settings_window`: building a window from
/// a synchronous command deadlocks WebView2 on Windows.
#[tauri::command]
pub async fn open_dashboard_window(app: tauri::AppHandle) -> Result<(), String> {
    show_dashboard(&app)
}

fn show_dashboard(app: &tauri::AppHandle) -> Result<(), String> {
    if let Some(existing) = app.get_webview_window("dashboard") {
        let _ = existing.show();
        let _ = existing.unminimize();
        let _ = existing.set_focus();
        return Ok(());
    }
    tauri::WebviewWindowBuilder::new(app, "dashboard", tauri::WebviewUrl::App("dashboard.html".into()))
        .title("PowerMeter")
        // The dashboard draws its own title bar (design: 34px bar with window controls).
        .decorations(false)
        .inner_size(1280.0, 800.0)
        .min_inner_size(1024.0, 640.0)
        .background_color(tauri::window::Color(10, 14, 22, 255))
        .center()
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// The dashboard is the main window: it opens on every launch next to the meter
/// and shows onboarding itself until `pm.onboarded` is set. Spawned rather than
/// called inline, keeping window creation off the setup path.
pub fn open_dashboard_on_start(app: &tauri::AppHandle) {
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(e) = show_dashboard(&app) {
            tracing::error!("Failed to open dashboard: {}", e);
        }
    });
}
