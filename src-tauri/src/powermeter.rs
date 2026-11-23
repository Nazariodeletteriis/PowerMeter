//! PowerMeter additions: the dashboard window and first-run onboarding.
//!
//! Kept in its own module so the A2Tools engine files stay close to upstream
//! and `git merge upstream/main` keeps applying cleanly.

use std::sync::atomic::{AtomicBool, AtomicU32, AtomicU64, Ordering};

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

static LOCKS: [Lock; 4] = [
    Lock { label: "main", event: "pm-click-through", on: AtomicBool::new(false) },
    Lock { label: "controls", event: "pm-controls-click-through", on: AtomicBool::new(false) },
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
    open_widget_window(&app, "map", "minimap", "PowerMeter — Map", (380.0, 380.0), (280.0, 280.0))
}

/// The Cube Finder window: the minimap (MapExplorer.tsx) with Cube Finder's own layers and settings, its hidden cube
/// compass top left like the Map window's. Its place and size are remembered under `window.cubeFinder.*`:
/// `window.cubeGuide.*` holds the size of the 0.5.36-0.5.40 compass card, too small for a map.
#[tauri::command]
pub async fn open_cube_window(app: tauri::AppHandle) -> Result<(), String> {
    open_widget_window(&app, "cubes", "cubeFinder", "PowerMeter — Cube Finder", (380.0, 380.0), (280.0, 280.0))
}

/// The Options window (Controls.tsx, label "controls"; its place under `window.options.*`, as the 0.5.64-0.5.65
/// Controls card was smaller): the meter's preferences, its counters, the dummy test, a
/// switch per PowerMeter window that can float over the game and the grid to line them up.
#[tauri::command]
pub async fn open_controls_window(app: tauri::AppHandle) -> Result<(), String> {
    open_widget_window(&app, "controls", "options", "PowerMeter — Options", (320.0, 640.0), (280.0, 320.0))
}

/// The meter's settings button: opens Options, or closes it when it is already open.
#[tauri::command]
pub async fn toggle_controls_window(app: tauri::AppHandle) -> Result<(), String> {
    match app.get_webview_window("controls") {
        Some(window) => window.close().map_err(|e| e.to_string()),
        None => open_controls_window(app).await,
    }
}

/// Windows the Controls window can close (the meter hides instead: hide_overlay).
const CLOSABLE: [&str; 3] = ["history", "map", "cubes"];
/// Windows that line up on the grid while it is on.
const SNAPPING: [&str; 7] = ["main", "details", "history", "map", "cubes", "controls", "petmarket"];

static GRID_ON: AtomicBool = AtomicBool::new(false);
static GRID_HIDDEN: AtomicBool = AtomicBool::new(false);
static GRID_STEP: AtomicU32 = AtomicU32::new(16);
/// Bumped on every move of a snapping window: a snap waits for the moves to stop.
static MOVE_SEQ: AtomicU64 = AtomicU64::new(0);
/// A window snaps this long after its last move (the drag has ended).
const SNAP_AFTER_MS: u64 = 400;

/// What the Controls window shows: which windows are up, and the grid.
#[tauri::command]
pub fn overlay_state(app: tauri::AppHandle) -> serde_json::Value {
    let up = |label: &str| app.get_webview_window(label).and_then(|w| w.is_visible().ok()).unwrap_or(false);
    serde_json::json!({
        "main": up("main"),
        "history": up("history"),
        "map": up("map"),
        "cubes": up("cubes"),
        "grid": GRID_ON.load(Ordering::SeqCst),
        "gridHidden": GRID_HIDDEN.load(Ordering::SeqCst),
        "gridStep": GRID_STEP.load(Ordering::SeqCst),
    })
}

#[tauri::command]
pub fn close_overlay_window(app: tauri::AppHandle, label: String) -> Result<(), String> {
    if !CLOSABLE.contains(&label.as_str()) {
        return Err(format!("{label} can't be closed from Controls"));
    }
    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// "Move windows": the windows snap to a grid of `step` px (logical) when a drag ends; the grid shows over the
/// game's screen unless hidden. Off, the grid window closes.
#[tauri::command]
pub async fn set_grid(app: tauri::AppHandle, on: bool, hidden: bool, step: u32) -> Result<(), String> {
    GRID_ON.store(on, Ordering::SeqCst);
    GRID_HIDDEN.store(hidden, Ordering::SeqCst);
    GRID_STEP.store(step.clamp(4, 128), Ordering::SeqCst);
    let existing = app.get_webview_window("grid");
    if !on || hidden {
        if let Some(window) = existing {
            let _ = window.close();
        }
        return Ok(());
    }
    if let Some(window) = existing {
        let _ = app.emit_to("grid", "grid-step", GRID_STEP.load(Ordering::SeqCst));
        return window.show().map_err(|e| e.to_string());
    }
    // The screen the meter is on: where the game is.
    let monitor = app
        .get_webview_window("main")
        .and_then(|w| w.current_monitor().ok().flatten())
        .or_else(|| app.primary_monitor().ok().flatten())
        .ok_or("no monitor")?;
    let scale = monitor.scale_factor();
    let window = tauri::WebviewWindowBuilder::new(&app, "grid", tauri::WebviewUrl::App("dashboard.html".into()))
        .initialization_script(format!("window.__PM_VIEW__ = 'grid'; window.__PM_GRID__ = {};", GRID_STEP.load(Ordering::SeqCst)))
        .title("PowerMeter — Grid")
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .always_on_top(true)
        .focused(false)
        .skip_taskbar(true)
        .resizable(false)
        .inner_size(monitor.size().width as f64 / scale, monitor.size().height as f64 / scale)
        .build()
        .map_err(|e| e.to_string())?;
    let _ = window.set_ignore_cursor_events(true);
    let _ = window.set_position(*monitor.position());
    Ok(())
}

/// "Move windows" off and its grid closed (the Controls window went away).
pub fn grid_off(app: &tauri::AppHandle) {
    GRID_ON.store(false, Ordering::SeqCst);
    if let Some(window) = app.get_webview_window("grid") {
        let _ = window.close();
    }
}

/// A snapping window moved (lib.rs on_window_event): once the moves stop, put it on the nearest grid point of its
/// screen.
pub fn snap_after_move(window: &tauri::Window) {
    if !GRID_ON.load(Ordering::SeqCst) || !SNAPPING.contains(&window.label()) {
        return;
    }
    let seq = MOVE_SEQ.fetch_add(1, Ordering::SeqCst) + 1;
    let window = window.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(SNAP_AFTER_MS));
        if MOVE_SEQ.load(Ordering::SeqCst) != seq || !GRID_ON.load(Ordering::SeqCst) {
            return;
        }
        let (Ok(pos), Ok(Some(monitor))) = (window.outer_position(), window.current_monitor()) else { return };
        let step = GRID_STEP.load(Ordering::SeqCst) as f64 * monitor.scale_factor();
        let origin = monitor.position();
        let snap = |v: i32, o: i32| o + (((v - o) as f64 / step).round() * step) as i32;
        let (x, y) = (snap(pos.x, origin.x), snap(pos.y, origin.y));
        if (x, y) != (pos.x, pos.y) {
            let _ = window.set_position(tauri::PhysicalPosition::new(x, y));
        }
    });
}

/// The pet overlays, made at launch so they are loaded before the first event; transparent, never focused, and clicks
/// pass through them, so they never get in the game's way while they draw nothing:
/// - "petpop" (PetPopup.tsx): a card at the top centre of the main monitor for each kill that counts for a pet
///   (lib.rs's tick sends `pet-kill`);
/// - "petmarket" (BlackMarket.tsx): the Black Market's pets on sale when the shop is opened (`black-market`), to the
///   right of the card. It takes the mouse while it shows, to be moved; its place is kept under `window.petMarket.*`.
pub fn open_pet_popup_on_start(app: &tauri::AppHandle) {
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        pet_overlay(&app, "petpop", "PowerMeter — Pet", (360.0, 96.0), None, 72.0);
        pet_overlay(&app, "petmarket", "PowerMeter — Black Market", (360.0, 480.0), Some("petMarket"), 72.0);
        // The event popup (EventPopup.tsx): the same kind of card, bigger, just below the pet card.
        pet_overlay(&app, "eventpop", "PowerMeter — Event", (460.0, 120.0), None, 176.0);
    });
}

fn pet_overlay(app: &tauri::AppHandle, label: &'static str, title: &str, (w, h): (f64, f64), key: Option<&'static str>, top: f64) {
    let built = tauri::WebviewWindowBuilder::new(app, label, tauri::WebviewUrl::App("dashboard.html".into()))
        .initialization_script(format!("window.__PM_VIEW__ = '{label}';"))
        .title(title)
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .always_on_top(true)
        .focused(false)
        .skip_taskbar(true)
        .resizable(false)
        .inner_size(w, h)
        .build();
    let window = match built {
        Ok(window) => window,
        Err(e) => return tracing::error!("Failed to open the {} overlay: {}", label, e),
    };
    let _ = window.set_ignore_cursor_events(true);
    if let Some(key) = key {
        let handle = window.clone();
        window.on_window_event(move |event| {
            if matches!(event, tauri::WindowEvent::Focused(false)) {
                save_widget_geometry(&handle, key);
            }
        });
        if crate::restore_window_geometry(app, &window, key) {
            // The place only: the saved size is physical (another display scale shrinks it), and the panel sizes
            // the window to itself anyway.
            let _ = window.set_size(tauri::LogicalSize::new(w, h));
            return;
        }
    }
    if let Some(m) = app.primary_monitor().ok().flatten() {
        // Physical: a logical position is scaled by the monitor the window is on now, maybe not this one. The card
        // centred at the top; the market panel just right of it.
        let scale = m.scale_factor();
        let centre = m.position().x + ((m.size().width as f64 - w * scale) / 2.0) as i32;
        let x = if key.is_some() { centre + (380.0 * scale) as i32 } else { centre };
        let y = m.position().y + (top * scale) as i32;
        let _ = window.set_position(tauri::PhysicalPosition::new(x, y));
    }
}

/// A transparent widget window over the game: dashboard.html drawing only the
/// view named by its label (main.tsx). Its geometry is saved under
/// `window.<key>.*` when it loses focus or closes rather than on every move
/// event, since each save writes the settings file.
fn open_widget_window(app: &tauri::AppHandle, label: &'static str, key: &'static str, title: &str, size: (f64, f64), min: (f64, f64)) -> Result<(), String> {
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
        .resizable(true)
        .inner_size(size.0, size.1)
        .min_inner_size(min.0, min.1)
        .build()
        .map_err(|e| e.to_string())?;
    if !crate::restore_window_geometry(app, &window, key) {
        let _ = window.center();
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
