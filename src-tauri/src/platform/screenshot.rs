/// Capture a region of the window and copy it to the clipboard. False when the
/// clipboard could not be opened or set (another app holding it).
#[cfg(windows)]
pub fn capture_to_clipboard(
    hwnd_raw: isize,
    x: i32,
    y: i32,
    width: i32,
    height: i32,
) -> bool {
    use windows::Win32::Foundation::*;
    use windows::Win32::Graphics::Gdi::*;
    use windows::Win32::System::DataExchange::*;

    unsafe {
        let hwnd = HWND(hwnd_raw as *mut _);
        let hdc_screen = GetDC(None);
        let hdc_mem = CreateCompatibleDC(Some(hdc_screen));

        let mut rect = RECT::default();
        let _ = windows::Win32::UI::WindowsAndMessaging::GetWindowRect(hwnd, &mut rect);

        let src_x = rect.left + x;
        let src_y = rect.top + y;

        let hbm = CreateCompatibleBitmap(hdc_screen, width, height);
        let old = SelectObject(hdc_mem, hbm.into());

        // CAPTUREBLT: include layered windows (the transparent overlay) in the copy.
        let _ = BitBlt(hdc_mem, 0, 0, width, height, Some(hdc_screen), src_x, src_y, SRCCOPY | CAPTUREBLT);

        SelectObject(hdc_mem, old);
        let _ = DeleteDC(hdc_mem);
        ReleaseDC(None, hdc_screen);

        // CF_BITMAP = 2. Windows hands it out as CF_DIB too, which is what
        // Discord and browsers read on paste.
        let mut copied = false;
        if OpenClipboard(Some(hwnd)).is_ok() {
            let _ = EmptyClipboard();
            copied = SetClipboardData(2, Some(HANDLE(hbm.0 as *mut _))).is_ok();
            let _ = CloseClipboard();
        }
        // On success the clipboard owns the bitmap; otherwise it is ours to free.
        if !copied {
            let _ = DeleteObject(hbm.into());
        }
        copied
    }
}

#[cfg(not(windows))]
pub fn capture_to_clipboard(_hwnd_raw: isize, _x: i32, _y: i32, _width: i32, _height: i32) -> bool {
    false
}
