//! PowerMeter additions: the dashboard window and first-run onboarding.
//!
//! Kept in its own module so the A2Tools engine files stay close to upstream
//! and `git merge upstream/main` keeps applying cleanly.

use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{Emitter, Manager};

use crate::platform::hotkeys::{parse_hotkey_label, HotkeyManager};
use crate::AppState;

const CLICK_THROUGH_HOTKEY_KEY: &str = "pm.clickThroughHotkey";
/// Must match TERMS_VERSION in src/dashboard/Onboarding.tsx.
const TERMS_VERSION: &str = "2026-10-12";

/// Nothing is captured before the user accepts the current terms (the last
/// onboarding step writes `pm.termsAccepted`): until then the meter stays
/// hidden and `start` waits. The meter window opens on launch next to the
/// dashboard, so without this it would read combat data during onboarding.
pub fn start_capture_after_terms(app: &tauri::AppHandle, start: impl FnOnce() + Send + 'static) {
    let accepted = |app: &tauri::AppHandle| {
        app.try_state::<AppState>()
            .is_some_and(|s| s.settings.get("pm.termsAccepted").as_deref() == Some(TERMS_VERSION))
    };
    if accepted(app) {
        start();
        return;
    }
    set_user_hidden(true);
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        while !accepted(&app) {
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        }
        set_user_hidden(false);
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.set_always_on_top(true);
        }
        start();
    });
}

/// A window that can be locked: it lets mouse input pass through to the game
/// underneath. The meter overlay and the minimap (Map window). Not persisted on
/// purpose: both always start clickable, so a user who forgot how to unlock is
/// never locked out.
struct Lock {
    label: &'static str,
    /// Emitted with the state, so the window's lock button reflects it.
    event: &'static str,
    /// Emitted while the cursor is over the lock button, for its hover style.
    hot_event: &'static str,
    on: AtomicBool,
    /// Lock button rect in CSS px of the window's viewport, reported by the
    /// window whenever it locks (the button moves with the window's layout).
    spot: std::sync::Mutex<Option<[f64; 4]>>,
}

static LOCKS: [Lock; 2] = [
    Lock { label: "main", event: "pm-click-through", hot_event: "pm-lock-hot", on: AtomicBool::new(false), spot: std::sync::Mutex::new(None) },
    Lock { label: "map", event: "pm-map-click-through", hot_event: "pm-map-lock-hot", on: AtomicBool::new(false), spot: std::sync::Mutex::new(None) },
];
static METER: &Lock = &LOCKS[0];

fn lock_of(label: &str) -> Result<&'static Lock, String> {
    LOCKS.iter().find(|l| l.label == label).ok_or_else(|| format!("window {label} has no lock"))
}

fn apply_click_through(app: &tauri::AppHandle, lock: &Lock, enabled: bool) -> Result<(), String> {
    let window = app.get_webview_window(lock.label).ok_or_else(|| format!("{} window not found", lock.label))?;
    window.set_ignore_cursor_events(enabled).map_err(|e| e.to_string())?;
    lock.on.store(enabled, Ordering::SeqCst);
    let _ = app.emit(lock.event, enabled);
    Ok(())
}

/// Reported by the calling window (pmWidget.js for the meter, Minimap.tsx for the map).
#[tauri::command]
pub fn set_lock_hotspot(window: tauri::WebviewWindow, x: f64, y: f64, w: f64, h: f64) {
    if let Ok(lock) = lock_of(window.label()) {
        *lock.spot.lock().unwrap_or_else(|e| e.into_inner()) = Some([x, y, w, h]);
    }
}

/// While locked, the whole window ignores the mouse, so its lock button can't
/// be clicked through the webview. This loop polls the cursor: over the button
/// the window takes the mouse (so the click doesn't reach the game) and emits
/// the lock's hot event for the hover style; a left-button press there unlocks.
/// Detecting the press here keeps it working whatever the webview does.
#[cfg(windows)]
fn watch_lock_corner(app: tauri::AppHandle) {
    use windows::Win32::Foundation::POINT;
    use windows::Win32::UI::Input::KeyboardAndMouse::{GetAsyncKeyState, VK_LBUTTON};
    use windows::Win32::UI::WindowsAndMessaging::GetCursorPos;

    std::thread::spawn(move || {
        let (mut hot, mut was_down) = (vec![false; LOCKS.len()], false);
        loop {
            std::thread::sleep(std::time::Duration::from_millis(30));
            let down = unsafe { GetAsyncKeyState(VK_LBUTTON.0 as i32) } as u16 & 0x8000 != 0;
            for (lock, hot) in LOCKS.iter().zip(hot.iter_mut()) {
                let Some(window) = app.get_webview_window(lock.label) else { continue };
                let spot = *lock.spot.lock().unwrap_or_else(|e| e.into_inner());
                let over = lock.on.load(Ordering::SeqCst)
                    && (|| {
                        let [x, y, w, h] = spot?;
                        let mut cursor = POINT::default();
                        unsafe { GetCursorPos(&mut cursor) }.ok()?;
                        let origin = window.inner_position().ok()?;
                        let scale = window.scale_factor().ok()?;
                        let (cx, cy) = ((cursor.x - origin.x) as f64 / scale, (cursor.y - origin.y) as f64 / scale);
                        Some(cx >= x && cx <= x + w && cy >= y && cy <= y + h)
                    })()
                    .unwrap_or(false);
                if over != *hot {
                    *hot = over;
                    let _ = window.set_ignore_cursor_events(!over && lock.on.load(Ordering::SeqCst));
                    let _ = app.emit(lock.hot_event, over);
                }
                if over && down && !was_down {
                    *hot = false;
                    let _ = app.emit(lock.hot_event, false);
                    if let Err(e) = apply_click_through(&app, lock, false) {
                        tracing::warn!("Unlock from the {} lock button failed: {}", lock.label, e);
                    }
                }
            }
            was_down = down;
        }
    });
}

#[cfg(not(windows))]
fn watch_lock_corner(_app: tauri::AppHandle) {}

/// The lock buttons: the meter's (no label, design: widget header) and the minimap's (label "map").
#[tauri::command]
pub fn set_click_through(app: tauri::AppHandle, enabled: bool, label: Option<String>) -> Result<(), String> {
    apply_click_through(&app, lock_of(label.as_deref().unwrap_or("main"))?, enabled)
}

#[tauri::command]
pub fn get_click_through(label: Option<String>) -> bool {
    lock_of(label.as_deref().unwrap_or("main")).is_ok_and(|l| l.on.load(Ordering::SeqCst))
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
    // "Open widget" is also the mouse way out of a locked (click-through) meter.
    apply_click_through(&app, METER, false)?;
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
    watch_lock_corner(app.clone());
    let app = app.clone();
    // The listener thread keeps running after the manager is dropped, as the
    // engine's own manager in lib.rs does.
    HotkeyManager::new().start(
        mods,
        vk,
        0,
        0,
        move || {
            let next = !METER.on.load(Ordering::SeqCst);
            if let Err(e) = apply_click_through(&app, METER, next) {
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

/// Npcap counts as installed when any trace of it is on the PC: its DLL in
/// `System32\Npcap`, its driver service, or a `wpcap.dll` that loads (WinPcap
/// API-compatible mode, or an old WinPcap). Loading alone was the only probe
/// before, so any loader hiccup reported an installed Npcap as missing and
/// pushed the user to install it again.
#[tauri::command]
pub fn npcap_installed() -> bool {
    npcap_dir().is_some_and(|dir| dir.join("wpcap.dll").is_file())
        || npcap_service_registered()
        || unsafe { libloading::Library::new("wpcap.dll") }.is_ok()
}

/// `%SystemRoot%\System32\Npcap`, where Npcap always puts its DLLs.
pub(crate) fn npcap_dir() -> Option<std::path::PathBuf> {
    std::env::var_os("SystemRoot").map(|root| std::path::Path::new(&root).join("System32").join("Npcap"))
}

/// The installer registers the `npcap` driver service and the uninstaller
/// removes it. The SYSTEM hive is not redirected for 32/64-bit.
#[cfg(windows)]
fn npcap_service_registered() -> bool {
    use windows::Win32::System::Registry::{HKEY_LOCAL_MACHINE, RRF_RT_ANY, RegGetValueW};
    use windows::core::w;
    unsafe {
        RegGetValueW(HKEY_LOCAL_MACHINE, w!("SYSTEM\\CurrentControlSet\\Services\\npcap"), w!("Start"), RRF_RT_ANY, None, None, None)
    }
    .is_ok()
}

#[cfg(not(windows))]
fn npcap_service_registered() -> bool {
    false
}

/// Lets `wpcap.dll` load from Npcap's own folder, so capture works even when
/// Npcap was installed without "WinPcap API-compatible Mode" (the engine loads
/// it by bare name). Appended, so a compat-mode copy in System32 still wins.
/// Call first thing in `run()`, before any thread reads the environment.
pub fn add_npcap_to_dll_path() {
    let Some(dir) = npcap_dir() else { return };
    let path = std::env::var_os("PATH").unwrap_or_default();
    let dirs = std::env::split_paths(&path).chain([dir]);
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
    run_installer(&installer)
}

/// The Npcap installer needs admin: CreateProcess (Command::spawn) fails with
/// ERROR_ELEVATION_REQUIRED when the app itself isn't elevated, so start it
/// through ShellExecute "runas", which shows UAC when needed.
#[cfg(windows)]
fn run_installer(path: &std::path::Path) -> Result<(), String> {
    use windows::core::{w, HSTRING, PCWSTR};
    use windows::Win32::UI::Shell::ShellExecuteW;
    use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;
    let result = unsafe { ShellExecuteW(None, w!("runas"), &HSTRING::from(path.as_os_str()), PCWSTR::null(), PCWSTR::null(), SW_SHOWNORMAL) };
    if result.0 as usize > 32 {
        Ok(())
    } else {
        Err(format!("could not start the Npcap installer (code {})", result.0 as usize))
    }
}

#[cfg(not(windows))]
fn run_installer(path: &std::path::Path) -> Result<(), String> {
    std::process::Command::new(path).spawn().map(|_| ()).map_err(|e| e.to_string())
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
        // Desktop, laptop and landscape-tablet sizes only: below this the
        // layout isn't supported (no phone/portrait mode, see README).
        .min_inner_size(1024.0, 600.0)
        .maximized(true)
        .background_color(tauri::window::Color(10, 14, 22, 255))
        .center()
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// The Map window: the minimap widget over the game (MapWindow.tsx), and the
/// whole map when the user takes it full screen. Transparent: the minimap's
/// own map and path opacity show the game through it. Async for the same
/// reason as `open_dashboard_window`. Its place and size are remembered like
/// the tool windows' (`window.minimap.*`: the old `window.map.*` was the size of
/// a full map window), saved when it loses focus or closes rather than on every
/// move event, since each save writes the settings file. Opening it again also
/// unlocks it: the mouse way out of a locked minimap.
#[tauri::command]
pub async fn open_map_window(app: tauri::AppHandle) -> Result<(), String> {
    let lock = lock_of("map")?;
    if let Some(existing) = app.get_webview_window("map") {
        apply_click_through(&app, lock, false)?;
        let _ = existing.show();
        let _ = existing.unminimize();
        let _ = existing.set_focus();
        return Ok(());
    }
    lock.on.store(false, Ordering::SeqCst); // a new window takes the mouse
    let window = tauri::WebviewWindowBuilder::new(&app, "map", tauri::WebviewUrl::App("dashboard.html".into()))
        // WebviewUrl::App is a path (a ?query is percent-encoded): see build_settings_window.
        .initialization_script("window.__PM_VIEW__ = 'map';")
        .title("PowerMeter — Map")
        .decorations(false)
        .transparent(true)
        // On Windows an undecorated window's shadow is a 1px border around the transparent area.
        .shadow(false)
        // Over the game, like the meter and the tool windows.
        .always_on_top(true)
        .resizable(true)
        .inner_size(360.0, 400.0)
        .min_inner_size(240.0, 240.0)
        .build()
        .map_err(|e| e.to_string())?;
    if !crate::restore_window_geometry(&app, &window, "minimap") {
        let _ = window.center();
    }
    let handle = window.clone();
    window.on_window_event(move |event| {
        if matches!(event, tauri::WindowEvent::Focused(false) | tauri::WindowEvent::CloseRequested { .. }) {
            save_map_geometry(&handle);
        }
    });
    Ok(())
}

/// Full screen, minimized or maximized is not a place the user chose: kept out.
fn save_map_geometry(window: &tauri::WebviewWindow) {
    let Some(state) = window.app_handle().try_state::<AppState>() else { return };
    let placed = !window.is_fullscreen().unwrap_or(true)
        && !window.is_minimized().unwrap_or(true)
        && !window.is_maximized().unwrap_or(true);
    if !placed {
        return;
    }
    if let (Ok(pos), Ok(size)) = (window.outer_position(), window.outer_size()) {
        if pos.x > -10000 && pos.y > -10000 && size.width > 100 && size.height > 100 {
            for (key, value) in [("x", pos.x), ("y", pos.y), ("w", size.width as i32), ("h", size.height as i32)] {
                state.settings.set(&format!("window.minimap.{key}"), &value.to_string());
            }
        }
    }
}

/// True only for the first caller in this process: the dashboard's update
/// popup shows once per launch, even if the dashboard window is reopened.
static UPDATE_PROMPTED: AtomicBool = AtomicBool::new(false);

#[tauri::command]
pub fn take_update_prompt() -> bool {
    !UPDATE_PROMPTED.swap(true, Ordering::SeqCst)
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
