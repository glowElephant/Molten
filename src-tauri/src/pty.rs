use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use tauri::Emitter;
use std::thread;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PtyConfig {
    pub shell: Option<String>,
    pub cwd: Option<String>,
    pub env: Option<HashMap<String, String>>,
    pub cols: Option<u16>,
    pub rows: Option<u16>,
}

impl Default for PtyConfig {
    fn default() -> Self {
        Self {
            shell: None,
            cwd: None,
            env: None,
            cols: Some(80),
            rows: Some(24),
        }
    }
}

struct PtyInstance {
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
}

pub struct PtyManager {
    instances: Arc<Mutex<HashMap<String, PtyInstance>>>,
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            instances: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn spawn(
        &self,
        session_id: &str,
        config: PtyConfig,
        app_handle: tauri::AppHandle,
    ) -> Result<(), String> {
        let pty_system = native_pty_system();

        let size = PtySize {
            rows: config.rows.unwrap_or(24),
            cols: config.cols.unwrap_or(80),
            pixel_width: 0,
            pixel_height: 0,
        };

        let pair = pty_system
            .openpty(size)
            .map_err(|e| format!("Failed to open PTY: {}", e))?;

        let shell = config.shell.unwrap_or_else(|| default_shell());

        let mut cmd = CommandBuilder::new(&shell);
        // Use --rcfile to explicitly source .bashrc before first prompt
        // This avoids timing issues with --login where PS1 may render
        // before function definitions are loaded
        if shell.contains("bash") {
            let home = dirs::home_dir()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default();
            if !home.is_empty() {
                cmd.arg("--rcfile");
                cmd.arg(format!("{}/.bashrc", home));
            }
        }

        if let Some(cwd) = &config.cwd {
            cmd.cwd(cwd);
        }

        // Mark this PTY as running inside Molten so hooks can skip terminal-specific actions
        cmd.env("MOLTEN", "1");
        cmd.env("TERM_PROGRAM", "molten");
        // UTF-8 locale for Korean/CJK input
        cmd.env("LANG", "C.UTF-8");
        cmd.env("LC_ALL", "C.UTF-8");

        // tmux shim: prepend tmux-shim to PATH so Claude Code thinks it's in tmux
        let exe_dir = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|d| d.to_path_buf()));
        if let Some(dir) = &exe_dir {
            let shim_dir = dir.join("../tmux-shim");
            // Also check development path
            let dev_shim = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tmux-shim");
            let shim_path = if dev_shim.exists() { dev_shim } else { shim_dir };
            if shim_path.exists() {
                let current_path = std::env::var("PATH").unwrap_or_default();
                // Use : separator for MSYS2/Git Bash PATH
                let shim_str = shim_path.to_string_lossy().replace('\\', "/");
                cmd.env("PATH", format!("{}:{}", shim_str, current_path));
            }
        }
        // Fake TMUX env var so Claude Code detects tmux
        cmd.env("TMUX", "/tmp/molten-tmux/molten,0,0");

        if let Some(env) = &config.env {
            for (key, value) in env {
                cmd.env(key, value);
            }
        }

        pair.slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn command: {}", e))?;

        // Drop slave — we only need the master side
        drop(pair.slave);

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| format!("Failed to get PTY writer: {}", e))?;

        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| format!("Failed to get PTY reader: {}", e))?;

        // Store the PTY instance
        {
            let mut instances = self.instances.lock().unwrap();
            instances.insert(
                session_id.to_string(),
                PtyInstance {
                    master: pair.master,
                    writer,
                },
            );
        }

        // Spawn reader thread to emit PTY output to frontend
        let sid = session_id.to_string();
        let handle = app_handle.clone();
        thread::spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => {
                        // PTY closed
                        let _ = handle.emit(&format!("pty-exit-{}", sid), ());
                        break;
                    }
                    Ok(n) => {
                        let data = &buf[..n];
                        // Send as base64 to avoid encoding issues
                        let encoded = base64_encode(data);
                        let _ = handle.emit(&format!("pty-output-{}", sid), encoded);
                    }
                    Err(e) => {
                        eprintln!("PTY read error for session {}: {}", sid, e);
                        let _ = handle.emit(&format!("pty-exit-{}", sid), ());
                        break;
                    }
                }
            }
        });

        Ok(())
    }

    pub fn write(&self, session_id: &str, data: &[u8]) -> Result<(), String> {
        let mut instances = self.instances.lock().unwrap();
        let instance = instances
            .get_mut(session_id)
            .ok_or_else(|| format!("Session {} not found", session_id))?;

        instance
            .writer
            .write_all(data)
            .map_err(|e| format!("Failed to write to PTY: {}", e))?;

        instance
            .writer
            .flush()
            .map_err(|e| format!("Failed to flush PTY: {}", e))?;

        Ok(())
    }

    pub fn resize(&self, session_id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let instances = self.instances.lock().unwrap();
        let instance = instances
            .get(session_id)
            .ok_or_else(|| format!("Session {} not found", session_id))?;

        instance
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to resize PTY: {}", e))?;

        Ok(())
    }

    pub fn kill(&self, session_id: &str) -> Result<(), String> {
        let mut instances = self.instances.lock().unwrap();
        instances
            .remove(session_id)
            .ok_or_else(|| format!("Session {} not found", session_id))?;
        // Dropping the PtyInstance closes the master, which signals the child process
        Ok(())
    }

    pub fn has_session(&self, session_id: &str) -> bool {
        let instances = self.instances.lock().unwrap();
        instances.contains_key(session_id)
    }

    pub fn session_count(&self) -> usize {
        let instances = self.instances.lock().unwrap();
        instances.len()
    }
}

fn default_shell() -> String {
    #[cfg(target_os = "windows")]
    {
        // Prefer Git Bash if available, otherwise PowerShell
        if let Ok(git_bash) = std::env::var("PROGRAMFILES") {
            let git_bash_path = format!("{}/Git/bin/bash.exe", git_bash);
            if std::path::Path::new(&git_bash_path).exists() {
                return git_bash_path;
            }
        }
        "powershell.exe".to_string()
    }

    #[cfg(target_os = "macos")]
    {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string())
    }

    #[cfg(target_os = "linux")]
    {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string())
    }
}

fn base64_encode(data: &[u8]) -> String {
    // Simple base64 encoding without external dependency
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::with_capacity((data.len() + 2) / 3 * 4);

    for chunk in data.chunks(3) {
        let b0 = chunk[0] as u32;
        let b1 = if chunk.len() > 1 { chunk[1] as u32 } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as u32 } else { 0 };

        let triple = (b0 << 16) | (b1 << 8) | b2;

        result.push(CHARS[((triple >> 18) & 0x3F) as usize] as char);
        result.push(CHARS[((triple >> 12) & 0x3F) as usize] as char);

        if chunk.len() > 1 {
            result.push(CHARS[((triple >> 6) & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }

        if chunk.len() > 2 {
            result.push(CHARS[(triple & 0x3F) as usize] as char);
        } else {
            result.push('=');
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = PtyConfig::default();
        assert!(config.shell.is_none());
        assert!(config.cwd.is_none());
        assert_eq!(config.cols, Some(80));
        assert_eq!(config.rows, Some(24));
    }

    #[test]
    fn test_pty_manager_creation() {
        let manager = PtyManager::new();
        assert_eq!(manager.session_count(), 0);
    }

    #[test]
    fn test_has_session_returns_false_for_nonexistent() {
        let manager = PtyManager::new();
        assert!(!manager.has_session("nonexistent"));
    }

    #[test]
    fn test_kill_nonexistent_session_returns_error() {
        let manager = PtyManager::new();
        assert!(manager.kill("nonexistent").is_err());
    }

    #[test]
    fn test_write_nonexistent_session_returns_error() {
        let manager = PtyManager::new();
        assert!(manager.write("nonexistent", b"hello").is_err());
    }

    #[test]
    fn test_resize_nonexistent_session_returns_error() {
        let manager = PtyManager::new();
        assert!(manager.resize("nonexistent", 80, 24).is_err());
    }

    #[test]
    fn test_base64_encode() {
        assert_eq!(base64_encode(b"Hello"), "SGVsbG8=");
        assert_eq!(base64_encode(b"Hi"), "SGk=");
        assert_eq!(base64_encode(b""), "");
        assert_eq!(base64_encode(b"abc"), "YWJj");
    }

    #[test]
    fn test_default_shell() {
        let shell = default_shell();
        assert!(!shell.is_empty());
    }
}
