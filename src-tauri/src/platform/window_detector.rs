//! Finding the AION 2 window. The capture drops every packet while no game window
//! is found (`CaptureDispatcher::run`), so a miss here means "never connects".
//!
//! By title first (`AION2…`), then by the program that owns the window (`AION2.exe`):
//! not every client is titled `AION2…` ("AION 2" with a space, a localised or
//! wrapped client), and the title alone left those players with the meter on
//! "AION2 not running" while the game was open.

fn is_game_title(title: &str) -> bool {
    title.starts_with("AION2")
}

fn is_game_exe(path: &str) -> bool {
    path.rsplit(['\\', '/']).next().is_some_and(|name| name.eq_ignore_ascii_case("AION2.exe"))
}

#[cfg(windows)]
mod win {
    use windows::Win32::Foundation::{CloseHandle, BOOL, HWND, LPARAM};
    use windows::Win32::System::Threading::{
        OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_FORMAT, PROCESS_QUERY_LIMITED_INFORMATION,
    };
    use windows::Win32::UI::WindowsAndMessaging::{EnumWindows, GetWindowTextW, GetWindowThreadProcessId, IsWindowVisible};

    pub fn title(hwnd: HWND) -> String {
        let mut buf = [0u16; 256];
        let len = unsafe { GetWindowTextW(hwnd, &mut buf) } as usize;
        String::from_utf16_lossy(&buf[..len])
    }

    pub fn visible(hwnd: HWND) -> bool {
        unsafe { IsWindowVisible(hwnd) }.as_bool()
    }

    /// Full path of the program that owns `hwnd`; no elevation needed for the user's own processes.
    pub fn exe_path(hwnd: HWND) -> Option<String> {
        unsafe {
            let mut pid: u32 = 0;
            GetWindowThreadProcessId(hwnd, Some(&mut pid));
            if pid == 0 {
                return None;
            }
            let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid).ok()?;
            let mut buf = [0u16; 512];
            let mut len = buf.len() as u32;
            let ok = QueryFullProcessImageNameW(handle, PROCESS_NAME_FORMAT(0), windows::core::PWSTR(buf.as_mut_ptr()), &mut len)
                .is_ok();
            let _ = CloseHandle(handle);
            ok.then(|| String::from_utf16_lossy(&buf[..len as usize]))
        }
    }

    pub fn top_level_windows() -> Vec<HWND> {
        unsafe extern "system" fn collect(hwnd: HWND, lparam: LPARAM) -> BOOL {
            unsafe { (*(lparam.0 as *mut Vec<HWND>)).push(hwnd) };
            BOOL(1)
        }
        let mut out: Vec<HWND> = Vec::new();
        unsafe {
            let _ = EnumWindows(Some(collect), LPARAM(&mut out as *mut Vec<HWND> as isize));
        }
        out
    }
}

/// Find the AION 2 game window and return its title, or None if not found.
#[cfg(windows)]
pub fn find_aion2_window_title() -> Option<String> {
    let windows = win::top_level_windows();
    if let Some(t) = windows.iter().map(|&h| win::title(h)).find(|t| is_game_title(t)) {
        return Some(t);
    }
    // Titled some other way: a visible, titled window owned by AION2.exe.
    windows.into_iter().find_map(|h| {
        if !win::visible(h) {
            return None;
        }
        let t = win::title(h);
        (!t.is_empty() && win::exe_path(h).is_some_and(|p| is_game_exe(&p))).then_some(t)
    })
}

/// Check if the AION 2 game window is currently running.
#[cfg(windows)]
pub fn find_aion2_window() -> bool {
    find_aion2_window_title().is_some()
}

/// Windows whose title or program mentions "aion", for the log when none is recognised:
/// the next log then says what the game is actually called. Never every window title.
#[cfg(windows)]
pub fn describe_candidates() -> Vec<String> {
    win::top_level_windows()
        .into_iter()
        .filter_map(|h| {
            let t = win::title(h);
            let exe = win::exe_path(h).unwrap_or_default();
            let exe_name = exe.rsplit(['\\', '/']).next().unwrap_or("").to_string();
            (t.to_lowercase().contains("aion") || exe_name.to_lowercase().contains("aion"))
                .then(|| format!("title={t:?} exe={exe_name:?} visible={}", win::visible(h)))
        })
        .take(8)
        .collect()
}

#[cfg(not(windows))]
pub fn find_aion2_window_title() -> Option<String> {
    None
}

#[cfg(not(windows))]
pub fn find_aion2_window() -> bool {
    false
}

#[cfg(not(windows))]
pub fn describe_candidates() -> Vec<String> {
    Vec::new()
}

/// Check if the foreground window belongs to AION 2, by title or by program.
#[cfg(windows)]
pub fn is_aion2_foreground() -> bool {
    let hwnd = unsafe { windows::Win32::UI::WindowsAndMessaging::GetForegroundWindow() };
    if hwnd.0.is_null() {
        return false;
    }
    is_game_title(&win::title(hwnd)) || win::exe_path(hwnd).is_some_and(|p| is_game_exe(&p))
}

#[cfg(not(windows))]
pub fn is_aion2_foreground() -> bool {
    false
}

/// The mouse pointer is on screen: shown and with a shape (a game that takes the mouse for its camera hides it, or
/// sets no cursor).
#[cfg(windows)]
pub fn cursor_shown() -> bool {
    use windows::Win32::UI::WindowsAndMessaging::{GetCursorInfo, CURSORINFO, CURSOR_SHOWING};
    let mut info = CURSORINFO { cbSize: std::mem::size_of::<CURSORINFO>() as u32, ..Default::default() };
    unsafe { GetCursorInfo(&mut info) }.is_ok() && info.flags.0 & CURSOR_SHOWING.0 != 0 && !info.hCursor.0.is_null()
}

#[cfg(not(windows))]
pub fn cursor_shown() -> bool {
    true
}

/// Aion 2 is in front showing the mouse pointer, and its window overlaps `rect` (left, top, right, bottom; physical
/// pixels, as the widget windows give theirs).
#[cfg(windows)]
pub fn game_menu_over(rect: [i32; 4]) -> bool {
    use windows::Win32::Foundation::RECT;
    use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowRect};
    if !is_aion2_foreground() || !cursor_shown() {
        return false;
    }
    let mut r = RECT::default();
    let game = unsafe { GetForegroundWindow() };
    unsafe { GetWindowRect(game, &mut r) }.is_ok() && r.left < rect[2] && rect[0] < r.right && r.top < rect[3] && rect[1] < r.bottom
}

#[cfg(not(windows))]
pub fn game_menu_over(_rect: [i32; 4]) -> bool {
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recognises_the_game_by_title_or_program() {
        assert!(is_game_title("AION2"));
        assert!(is_game_title("AION2 | Agniezska"));
        // These titles are why the program check exists: the title test alone misses them.
        assert!(!is_game_title("AION 2"));
        assert!(!is_game_title("아이온2"));
        assert!(is_game_exe(r"D:\SteamLibrary\steamapps\common\AION2\Aion2\Binaries\Win64\AION2.exe"));
        assert!(is_game_exe(r"C:\Games\aion2.EXE"));
        assert!(!is_game_exe(r"C:\Games\AION2Launcher.exe"));
        assert!(!is_game_exe(r"C:\Program Files\PowerMeter\powermeter.exe"));
        assert!(!is_game_exe(""));
    }
}
