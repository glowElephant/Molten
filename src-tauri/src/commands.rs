use crate::pty::{PtyConfig, PtyManager};
use std::sync::Arc;
use tauri::State;

#[cfg(debug_assertions)]
use crate::api_server::CommandQueue;
use std::sync::Mutex;

/// Tauri state wrapper for PTY manager
pub struct PtyState(pub Arc<PtyManager>);

#[tauri::command]
pub fn pty_spawn(
    session_id: String,
    config: PtyConfig,
    state: State<'_, PtyState>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    state.0.spawn(&session_id, config, app_handle)
}

#[tauri::command]
pub fn pty_write(session_id: String, data: String, state: State<'_, PtyState>) -> Result<(), String> {
    state.0.write(&session_id, data.as_bytes())
}

#[tauri::command]
pub fn pty_resize(
    session_id: String,
    cols: u16,
    rows: u16,
    state: State<'_, PtyState>,
) -> Result<(), String> {
    state.0.resize(&session_id, cols, rows)
}

#[tauri::command]
pub fn pty_kill(session_id: String, state: State<'_, PtyState>) -> Result<(), String> {
    state.0.kill(&session_id)
}

#[tauri::command]
pub fn pty_has_session(session_id: String, state: State<'_, PtyState>) -> bool {
    state.0.has_session(&session_id)
}

#[tauri::command]
pub fn pty_session_count(state: State<'_, PtyState>) -> usize {
    state.0.session_count()
}

/// Dev-only: Poll for pending API commands
#[cfg(debug_assertions)]
#[tauri::command]
pub fn poll_commands(state: State<'_, Arc<CommandQueue>>) -> Vec<String> {
    let mut cmds = state.commands.lock().unwrap();
    let result = cmds.clone();
    cmds.clear();
    result
}
