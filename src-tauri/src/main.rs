// FileKit Native macOS Desktop Application Entrypoint
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod dock;
mod menu;
mod shortcuts;
mod tray;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            dock::set_dock_badge,
            dock::set_dock_progress,
            dock::clear_dock_progress
        ])
        .setup(|app| {
            let handle = app.handle();

            // Set up native macOS Top Menu Bar
            if let Ok(app_menu) = menu::build_app_menu(&handle) {
                let _ = app.set_menu(app_menu);
            }

            // Set up Menu Bar Companion Tray Icon
            let _ = tray::setup_tray(&handle);

            // Configure main window properties on macOS
            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "macos")]
                {
                    // Apply macOS window level styling
                    let _ = window.show();
                }
            }

            Ok(())
        })
        .on_menu_event(|app, event| match event.id.as_ref() {
            "preferences" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.eval("window.FF?.MacBridge?.openPreferences?.()");
                }
            }
            "search_tools" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.eval("document.getElementById('header-search-trigger')?.click()");
                }
            }
            "open_file" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.eval("document.getElementById('try-file-input')?.click()");
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running FileKit application");
}
