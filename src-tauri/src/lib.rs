#[cfg(debug_assertions)]
mod api_server;
mod capture;
mod commands;
mod config;
mod pty;

use commands::PtyState;
use pty::PtyManager;
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let pty_manager = Arc::new(PtyManager::new());

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(PtyState(pty_manager));

    #[cfg(debug_assertions)]
    {
        let queue = Arc::new(api_server::CommandQueue::new());
        let queue_for_server = queue.clone();
        builder = builder
            .manage(queue)
            .invoke_handler(tauri::generate_handler![
                commands::pty_spawn,
                commands::pty_write,
                commands::pty_resize,
                commands::pty_kill,
                commands::pty_has_session,
                commands::pty_session_count,
                commands::poll_commands,
                capture::capture_window,
                config::load_config,
                config::save_config,
            ])
            .setup(move |app| {
                let handle = app.handle().clone();
                api_server::start_api_server(handle, queue_for_server);
                Ok(())
            });
    }

    #[cfg(not(debug_assertions))]
    {
        builder = builder
            .invoke_handler(tauri::generate_handler![
                commands::pty_spawn,
                commands::pty_write,
                commands::pty_resize,
                commands::pty_kill,
                commands::pty_has_session,
                commands::pty_session_count,
                capture::capture_window,
                config::load_config,
                config::save_config,
            ]);
    }

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
