use std::io::{Read, Write};
use std::net::TcpListener;
use std::sync::{Arc, Mutex};
use tauri::Manager;

/// Pending commands queue
pub struct CommandQueue {
    pub commands: Mutex<Vec<String>>,
}

impl CommandQueue {
    pub fn new() -> Self {
        Self {
            commands: Mutex::new(Vec::new()),
        }
    }
}

/// Start a simple HTTP API server on localhost:9900.
/// Executes JavaScript directly in the WebView for reliable command delivery.
pub fn start_api_server(app_handle: tauri::AppHandle, queue: Arc<CommandQueue>) {
    std::thread::spawn(move || {
        let listener = match TcpListener::bind("127.0.0.1:9900") {
            Ok(l) => l,
            Err(e) => {
                eprintln!("API server failed to start: {}", e);
                return;
            }
        };

        // Clear stale tmux shim state from previous runs
        let tmux_state = std::env::temp_dir().join("molten-tmux");
        let _ = std::fs::remove_dir_all(&tmux_state);
        eprintln!("[api] Cleared tmux shim state at {:?}", tmux_state);

        eprintln!("Molten API server listening on http://127.0.0.1:9900");

        for stream in listener.incoming() {
            let Ok(mut stream) = stream else { continue };
            let handle = app_handle.clone();
            let q = queue.clone();

            std::thread::spawn(move || {
                let mut buf = [0u8; 4096];
                let n = stream.read(&mut buf).unwrap_or(0);
                if n == 0 { return; }

                let request = String::from_utf8_lossy(&buf[..n]);
                let first_line = request.lines().next().unwrap_or("");
                let parts: Vec<&str> = first_line.split_whitespace().collect();
                if parts.len() < 2 { return; }

                let path = parts[1];

                let (status, response_body) = route(&handle, &q, path);

                let response = format!(
                    "HTTP/1.1 {}\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\n\r\n{}",
                    status, response_body.len(), response_body
                );
                let _ = stream.write_all(response.as_bytes());
            });
        }
    });
}

fn route(handle: &tauri::AppHandle, queue: &Arc<CommandQueue>, path: &str) -> (&'static str, String) {
    match path {
        "/" => ("200 OK", r#"{"name":"molten","version":"0.1.0","status":"running"}"#.to_string()),

        "/api/session/create" => {
            push_cmd(queue, "session.create");
            eval_js(handle, "window.__moltenExec('session.create')");
            ("200 OK", r#"{"success":true,"action":"session.create"}"#.to_string())
        }

        "/api/sidebar/toggle" => {
            eval_js(handle, "window.__moltenExec('sidebar.toggle')");
            ("200 OK", r#"{"success":true,"action":"sidebar.toggle"}"#.to_string())
        }

        "/api/sidebar/hide" => {
            eval_js(handle, "window.__moltenExec('sidebar.hide')");
            ("200 OK", r#"{"success":true,"action":"sidebar.hide"}"#.to_string())
        }

        "/api/sidebar/show" => {
            eval_js(handle, "window.__moltenExec('sidebar.show')");
            ("200 OK", r#"{"success":true,"action":"sidebar.show"}"#.to_string())
        }

        "/api/sidebar/left" => {
            eval_js(handle, "window.__moltenExec('sidebar.left')");
            ("200 OK", r#"{"success":true,"action":"sidebar.left"}"#.to_string())
        }

        "/api/sidebar/right" => {
            eval_js(handle, "window.__moltenExec('sidebar.right')");
            ("200 OK", r#"{"success":true,"action":"sidebar.right"}"#.to_string())
        }

        "/api/capture" => {
            eval_js(handle, "window.__moltenExec('capture')");
            ("200 OK", r#"{"success":true,"action":"capture"}"#.to_string())
        }

        "/api/poll" => {
            let mut cmds = queue.commands.lock().unwrap();
            let result = serde_json::to_string(&*cmds).unwrap_or("[]".to_string());
            cmds.clear();
            ("200 OK", result)
        }

        // /api/session/switch/N — switch to session by index (1-based)
        _ if path.starts_with("/api/session/switch/") => {
            let idx = path.trim_start_matches("/api/session/switch/");
            let js = format!("window.__moltenExec('session.switch.{}')", idx);
            eval_js(handle, &js);
            ("200 OK", format!(r#"{{"success":true,"action":"session.switch","index":{}}}"#, idx))
        }

        // /api/split/horizontal — split active session horizontally (left/right)
        "/api/split/horizontal" => {
            eval_js(handle, "window.__moltenExec('split.horizontal')");
            ("200 OK", r#"{"success":true,"action":"split.horizontal"}"#.to_string())
        }

        // /api/split/vertical — split active session vertically (top/bottom)
        "/api/split/vertical" => {
            eval_js(handle, "window.__moltenExec('split.vertical')");
            ("200 OK", r#"{"success":true,"action":"split.vertical"}"#.to_string())
        }

        // /api/split/reset — exit split mode
        "/api/split/reset" => {
            eval_js(handle, "window.__moltenExec('split.reset')");
            ("200 OK", r#"{"success":true,"action":"split.reset"}"#.to_string())
        }

        // Workspace presets
        "/api/preset/dual" => {
            eval_js(handle, "window.__moltenExec('preset.dual')");
            ("200 OK", r#"{"success":true,"action":"preset.dual"}"#.to_string())
        }

        "/api/preset/triple" => {
            eval_js(handle, "window.__moltenExec('preset.triple')");
            ("200 OK", r#"{"success":true,"action":"preset.triple"}"#.to_string())
        }

        "/api/preset/stack" => {
            eval_js(handle, "window.__moltenExec('preset.stack')");
            ("200 OK", r#"{"success":true,"action":"preset.stack"}"#.to_string())
        }

        "/api/preset/focus" => {
            eval_js(handle, "window.__moltenExec('preset.focus')");
            ("200 OK", r#"{"success":true,"action":"preset.focus"}"#.to_string())
        }

        // /api/session/close — close active session
        "/api/session/close" => {
            eval_js(handle, "window.__moltenExec('session.close')");
            ("200 OK", r#"{"success":true,"action":"session.close"}"#.to_string())
        }

        // /api/session/type/TEXT — type text into active session's terminal
        _ if path.starts_with("/api/session/type/") => {
            let text = path.trim_start_matches("/api/session/type/");
            let decoded = urldecode(text);
            // Escape for JS string: \ → \\, ' → \', newline → \n
            let escaped = decoded
                .replace('\\', "\\\\")
                .replace('\'', "\\'")
                .replace('\n', "\\n")
                .replace('\r', "\\r");
            let js = format!("window.__moltenExec('session.type.{}')", escaped);
            eval_js(handle, &js);
            ("200 OK", format!(r#"{{"success":true,"action":"session.type","text":"ok"}}"#))
        }

        // /api/session/count — return number of sessions
        "/api/session/count" => {
            let pty_state = handle.state::<crate::commands::PtyState>();
            let count = pty_state.0.session_count();
            ("200 OK", format!(r#"{{"count":{}}}"#, count))
        }

        // /api/sessions — return list of PTY session IDs
        "/api/sessions" => {
            let pty_state = handle.state::<crate::commands::PtyState>();
            let ids = pty_state.0.session_ids();
            let json = serde_json::to_string(&ids).unwrap_or("[]".to_string());
            ("200 OK", json)
        }

        // /api/pty/write/<session_id> — write text directly to a PTY session
        // Text is URL-encoded after the session ID, separated by /
        // Format: /api/pty/write/SESSION_ID/ENCODED_TEXT
        _ if path.starts_with("/api/pty/write/") => {
            let rest = path.trim_start_matches("/api/pty/write/");
            // Find the first / to split session_id and text
            if let Some(slash_pos) = rest.find('/') {
                let session_id = &rest[..slash_pos];
                let text = urldecode(&rest[slash_pos + 1..]);
                let pty_state = handle.state::<crate::commands::PtyState>();
                match pty_state.0.write(session_id, (text + "\n").as_bytes()) {
                    Ok(_) => ("200 OK", r#"{"success":true}"#.to_string()),
                    Err(e) => ("500 Internal Server Error", format!(r#"{{"error":"{}"}}"#, e)),
                }
            } else {
                ("400 Bad Request", r#"{"error":"Missing text. Use /api/pty/write/SESSION_ID/TEXT"}"#.to_string())
            }
        }

        _ => ("404 Not Found", format!(r#"{{"error":"Unknown: {}"}}"#, path)),
    }
}

fn urldecode(s: &str) -> String {
    let mut result = String::new();
    let mut chars = s.bytes();
    while let Some(b) = chars.next() {
        if b == b'%' {
            let h = chars.next().unwrap_or(b'0');
            let l = chars.next().unwrap_or(b'0');
            let hex = format!("{}{}", h as char, l as char);
            if let Ok(val) = u8::from_str_radix(&hex, 16) {
                result.push(val as char);
            }
        } else if b == b'+' {
            result.push(' ');
        } else {
            result.push(b as char);
        }
    }
    result
}

fn push_cmd(queue: &Arc<CommandQueue>, cmd: &str) {
    let mut cmds = queue.commands.lock().unwrap();
    cmds.push(cmd.to_string());
}

fn eval_js(handle: &tauri::AppHandle, js: &str) {
    match handle.get_webview_window("main") {
        Some(window) => {
            match window.eval(js) {
                Ok(_) => eprintln!("[api] eval OK: {}", &js[..js.len().min(50)]),
                Err(e) => eprintln!("[api] eval FAILED: {}", e),
            }
        }
        None => {
            // Try listing all windows
            let windows = handle.webview_windows();
            let labels: Vec<_> = windows.keys().collect();
            eprintln!("[api] Window 'main' not found! Available: {:?}", labels);
        }
    }
}
