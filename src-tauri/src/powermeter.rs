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

/// A window that can be locked in place: the meter overlay, the minimap (Map
/// window) and the Hidden cube guide. Locked, it can't be moved; its buttons
/// keep working. Not persisted.
/// (The commands keep their old click-through names: the lock used to let the
/// mouse through to the game.)
struct Lock {
    label: &'static str,
    /// Emitted with the state, so the window's lock button reflects it.
    event: &'static str,
    on: AtomicBool,
}

static LOCKS: [Lock; 3] = [
    Lock { label: "main", event: "pm-click-through", on: AtomicBool::new(false) },
    // Widget windows: the event is pm-<label>-click-through (Minimap.tsx useLock).
    Lock { label: "map", event: "pm-map-click-through", on: AtomicBool::new(false) },
    Lock { label: "cubes", event: "pm-cubes-click-through", on: AtomicBool::new(false) },
];
static METER: &Lock = &LOCKS[0];

fn lock_of(label: &str) -> Result<&'static Lock, String> {
    LOCKS.iter().find(|l| l.label == label).ok_or_else(|| format!("window {label} has no lock"))
}

fn apply_lock(app: &tauri::AppHandle, lock: &Lock, enabled: bool) {
    lock.on.store(enabled, Ordering::SeqCst);
    let _ = app.emit(lock.event, enabled);
}

/// The meter's start_drag (lib.rs) does nothing while it is locked.
pub fn meter_locked() -> bool {
    METER.on.load(Ordering::SeqCst)
}

/// The lock buttons: the meter's (no label, design: widget header) and the widget windows' (their label).
#[tauri::command]
pub fn set_click_through(app: tauri::AppHandle, enabled: bool, label: Option<String>) -> Result<(), String> {
    apply_lock(&app, lock_of(label.as_deref().unwrap_or("main"))?, enabled);
    Ok(())
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
    window.show().map_err(|e| e.to_string())?;
    let _ = window.unminimize();
    let _ = window.set_always_on_top(true);
    Ok(())
}

/// Global hotkey toggling the meter's lock (default Ctrl+Alt+L). Uses a second
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
            apply_lock(&app, METER, !meter_locked());
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

/// Async for the same reason as `open_details_window`: building a window from
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
/// a full map window).
#[tauri::command]
pub async fn open_map_window(app: tauri::AppHandle) -> Result<(), String> {
    open_widget_window(&app, "map", "minimap", "PowerMeter — Map", (360.0, 400.0), true)
}

/// The Hidden cube guide (CubeGuide.tsx): a small card over the game pointing
/// at the nearest hidden cube and listing the other spots of the place. Fixed size, tall enough for the full list
/// (six spots) and the footer at its longest (three lines in German with the aim line), in type a quarter up on 0.5.34 to
/// read over the game; its place is remembered (`window.cubes.*`).
#[tauri::command]
pub async fn open_cube_window(app: tauri::AppHandle) -> Result<(), String> {
    open_widget_window(&app, "cubes", "cubes", "PowerMeter — Hidden cubes", (270.0, 336.0), false)
}

/// A transparent widget window over the game: dashboard.html drawing only the
/// view named by its label (main.tsx). Its geometry is saved under
/// `window.<key>.*` when it loses focus or closes rather than on every move
/// event, since each save writes the settings file.
fn open_widget_window(app: &tauri::AppHandle, label: &'static str, key: &'static str, title: &str, size: (f64, f64), resizable: bool) -> Result<(), String> {
    let lock = lock_of(label)?;
    if let Some(existing) = app.get_webview_window(label) {
        let _ = existing.show();
        let _ = existing.unminimize();
        let _ = existing.set_focus();
        return Ok(());
    }
    lock.on.store(false, Ordering::SeqCst); // a new window starts unlocked
    let window = tauri::WebviewWindowBuilder::new(app, label, tauri::WebviewUrl::App("dashboard.html".into()))
        // WebviewUrl::App is a path (a ?query is percent-encoded): see open_details_on_monitor_inner.
        .initialization_script(format!("window.__PM_VIEW__ = '{label}';"))
        .title(title)
        .decorations(false)
        .transparent(true)
        // On Windows an undecorated window's shadow is a 1px border around the transparent area.
        .shadow(false)
        // Over the game, like the meter and the tool windows.
        .always_on_top(true)
        .resizable(resizable)
        .inner_size(size.0, size.1)
        .min_inner_size(size.0.min(240.0), size.1.min(240.0))
        .build()
        .map_err(|e| e.to_string())?;
    if !crate::restore_window_geometry(app, &window, key) {
        let _ = window.center();
    }
    if !resizable {
        // A fixed card keeps the size it is built with: a saved one is an older layout's (0.5.33's cube guide was 172 high).
        let _ = window.set_size(tauri::LogicalSize::new(size.0, size.1));
    }
    let handle = window.clone();
    window.on_window_event(move |event| {
        if matches!(event, tauri::WindowEvent::Focused(false) | tauri::WindowEvent::CloseRequested { .. }) {
            save_widget_geometry(&handle, key);
        }
    });
    Ok(())
}

/// Full screen, minimized or maximized is not a place the user chose: kept out.
fn save_widget_geometry(window: &tauri::WebviewWindow, key: &str) {
    let Some(state) = window.app_handle().try_state::<AppState>() else { return };
    let placed = !window.is_fullscreen().unwrap_or(true)
        && !window.is_minimized().unwrap_or(true)
        && !window.is_maximized().unwrap_or(true);
    if !placed {
        return;
    }
    if let (Ok(pos), Ok(size)) = (window.outer_position(), window.outer_size()) {
        if pos.x > -10000 && pos.y > -10000 && size.width > 100 && size.height > 100 {
            for (k, value) in [("x", pos.x), ("y", pos.y), ("w", size.width as i32), ("h", size.height as i32)] {
                state.settings.set(&format!("window.{key}.{k}"), &value.to_string());
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
