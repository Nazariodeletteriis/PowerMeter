//! PowerMeter additions: the dashboard window and first-run onboarding.
//!
//! Kept in its own module so the A2Tools engine files stay close to upstream
//! and `git merge upstream/main` keeps applying cleanly.

use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{Emitter, Manager};

use crate::platform::hotkeys::{parse_hotkey_label, HotkeyManager};
use crate::AppState;

/// Settings key set once the user has finished onboarding.
const ONBOARDED_KEY: &str = "pm.onboarded";
const CLICK_THROUGH_HOTKEY_KEY: &str = "pm.clickThroughHotkey";

/// Not persisted on purpose: the overlay always starts clickable, so a user
/// who forgot the hotkey is never locked out of it.
static CLICK_THROUGH: AtomicBool = AtomicBool::new(false);

/// Lets mouse input pass through the overlay to the game underneath.
#[tauri::command]
pub fn set_click_through(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("overlay window not found")?;
    window.set_ignore_cursor_events(enabled).map_err(|e| e.to_string())?;
    CLICK_THROUGH.store(enabled, Ordering::SeqCst);
    let _ = app.emit("pm-click-through", enabled);
    Ok(())
}

/// Brings the overlay back if it was hidden with the toggle hotkey.
#[tauri::command]
pub fn show_overlay(app: tauri::AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("overlay window not found")?;
    window.show().map_err(|e| e.to_string())?;
    let _ = window.unminimize();
    let _ = window.set_always_on_top(true);
    Ok(())
}

#[tauri::command]
pub fn get_click_through() -> bool {
    CLICK_THROUGH.load(Ordering::SeqCst)
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
            if let Err(e) = set_click_through(app.clone(), next) {
                tracing::warn!("Click-through toggle failed: {}", e);
            }
        },
        || {},
    );
}

/// Same probe the capture engine uses (`PcapLib::load`): Npcap in WinPcap
/// API-compatible mode puts `wpcap.dll` on the default DLL search path.
#[tauri::command]
pub fn npcap_installed() -> bool {
    unsafe { libloading::Library::new("wpcap.dll") }.is_ok()
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
        .inner_size(1280.0, 800.0)
        .min_inner_size(1024.0, 640.0)
        .background_color(tauri::window::Color(10, 14, 22, 255))
        .center()
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Opens the dashboard on first launch so the user goes through onboarding.
/// Spawned rather than called inline, keeping window creation off the setup path.
pub fn open_onboarding_if_needed(app: &tauri::AppHandle) {
    let onboarded = app
        .try_state::<AppState>()
        .and_then(|state| state.settings.get(ONBOARDED_KEY))
        .is_some_and(|v| v == "1");
    if onboarded {
        return;
    }
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(e) = show_dashboard(&app) {
            tracing::error!("Failed to open onboarding: {}", e);
        }
    });
}
