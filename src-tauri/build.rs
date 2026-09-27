fn main() {
    // PowerMeter: embed our manifest (Common Controls v6, asInvoker; admin is
    // requested at startup by powermeter::relaunch_elevated).
    let windows = tauri_build::WindowsAttributes::new()
        .app_manifest(include_str!("windows-app-manifest.xml"));
    tauri_build::try_build(tauri_build::Attributes::new().windows_attributes(windows))
        .expect("failed to run tauri-build");
}
