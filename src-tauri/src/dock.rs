// Live macOS Dock Tile Progress & Badge Bridge
use tauri::command;

#[cfg(target_os = "macos")]
#[allow(unused_imports)]
use cocoa::appkit::{NSApp, NSApplication, NSDockTile};
#[cfg(target_os = "macos")]
use cocoa::base::nil;
#[cfg(target_os = "macos")]
use cocoa::foundation::NSString;

#[command]
pub fn set_dock_badge(badge: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    unsafe {
        let app = NSApp();
        let dock_tile = app.dockTile();
        let label = NSString::alloc(nil).init_str(&badge);
        dock_tile.setBadgeLabel(label);
    }
    Ok(())
}

#[command]
pub fn set_dock_progress(progress: f64) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    unsafe {
        let app = NSApp();
        let dock_tile = app.dockTile();
        let percent_str = format!("{:.0}%", progress * 100.0);
        let label = NSString::alloc(nil).init_str(&percent_str);
        dock_tile.setBadgeLabel(label);
    }
    Ok(())
}

#[command]
pub fn clear_dock_progress() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    unsafe {
        let app = NSApp();
        let dock_tile = app.dockTile();
        dock_tile.setBadgeLabel(nil);
    }
    Ok(())
}
