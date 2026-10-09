// Menu Bar Quick Companion Tray for FileKit
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager};

pub fn setup_tray(app: &AppHandle) -> Result<(), tauri::Error> {
    let tray_menu = Menu::with_items(
        app,
        &[
            &MenuItem::with_id(app, "tray_open", "Open FileKit", true, None::<&str>)?,
            &MenuItem::with_id(app, "tray_compress_pdf", "Quick Compress PDF", true, None::<&str>)?,
            &MenuItem::with_id(app, "tray_convert_docx", "Quick Convert to Word", true, None::<&str>)?,
            &MenuItem::with_id(app, "tray_optimize_img", "Quick Optimize Images", true, None::<&str>)?,
            &MenuItem::with_id(app, "tray_ocr", "Quick OCR Extract Text", true, None::<&str>)?,
            &MenuItem::with_id(app, "tray_quit", "Quit FileKit", true, None::<&str>)?,
        ],
    )?;

    let _tray = TrayIconBuilder::new()
        .menu(&tray_menu)
        .show_menu_on_left_click(true)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .on_menu_event(|app, event| match event.id.as_ref() {
            "tray_open" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "tray_compress_pdf" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = window.eval("window.FF?.openTool?.('pdf-compress', true)");
                }
            }
            "tray_convert_docx" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = window.eval("window.FF?.openTool?.('pdf-to-docx', true)");
                }
            }
            "tray_optimize_img" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = window.eval("window.FF?.openTool?.('img-compress', true)");
                }
            }
            "tray_ocr" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = window.eval("window.FF?.openTool?.('pdf-ocr', true)");
                }
            }
            "tray_quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}
