// macOS URL Scheme & Shortcuts App Deep Link Handler
use tauri::{AppHandle, Manager};

pub fn handle_deep_link(app: &AppHandle, url_str: &str) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();

        // Parse filekit://tool/<tool-id>?file=<path>
        if let Ok(url) = url::Url::parse(url_str) {
            let tool_id = url.path().trim_start_matches('/');
            let js = format!("window.FF?.openTool?.('{}', true);", tool_id);
            let _ = window.eval(&js);
        }
    }
}
