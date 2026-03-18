mod capture;
mod commands;
mod pty;

use commands::PtyState;
use pty::PtyManager;
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let pty_manager = Arc::new(PtyManager::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(PtyState(pty_manager))
        .invoke_handler(tauri::generate_handler![
            commands::pty_spawn,
            commands::pty_write,
            commands::pty_resize,
            commands::pty_kill,
            commands::pty_has_session,
            commands::pty_session_count,
            capture::capture_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
