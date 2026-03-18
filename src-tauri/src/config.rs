use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct MoltenConfig {
    #[serde(default)]
    pub sidebar: SidebarConfig,
    #[serde(default)]
    pub font: FontConfig,
    #[serde(default)]
    pub terminal: TerminalConfig,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SidebarConfig {
    #[serde(default = "default_true")]
    pub visible: bool,
    #[serde(default = "default_left")]
    pub position: String,
    #[serde(default = "default_sidebar_width")]
    pub width: u32,
}

impl Default for SidebarConfig {
    fn default() -> Self {
        Self {
            visible: true,
            position: "left".to_string(),
            width: 260,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FontConfig {
    #[serde(default = "default_font_family")]
    pub family: String,
    #[serde(default = "default_font_size")]
    pub size: u32,
}

impl Default for FontConfig {
    fn default() -> Self {
        Self {
            family: "JetBrains Mono, Cascadia Code, Menlo, Consolas, monospace".to_string(),
            size: 14,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TerminalConfig {
    #[serde(default = "default_scrollback")]
    pub scrollback: u32,
    #[serde(default = "default_true")]
    pub cursor_blink: bool,
}

impl Default for TerminalConfig {
    fn default() -> Self {
        Self {
            scrollback: 10000,
            cursor_blink: true,
        }
    }
}

fn default_true() -> bool { true }
fn default_left() -> String { "left".to_string() }
fn default_sidebar_width() -> u32 { 260 }
fn default_font_family() -> String { "JetBrains Mono, Cascadia Code, Menlo, Consolas, monospace".to_string() }
fn default_font_size() -> u32 { 14 }
fn default_scrollback() -> u32 { 10000 }

/// Get the config directory path
pub fn config_dir() -> PathBuf {
    let dir = dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("molten");
    std::fs::create_dir_all(&dir).ok();
    dir
}

/// Load config from file
#[tauri::command]
pub fn load_config() -> Result<String, String> {
    let path = config_dir().join("settings.json");
    if !path.exists() {
        let default = MoltenConfig::default();
        return serde_json::to_string_pretty(&default)
            .map_err(|e| format!("Failed to serialize default config: {}", e));
    }
    std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read config: {}", e))
}

/// Save config to file
#[tauri::command]
pub fn save_config(config: String) -> Result<(), String> {
    let path = config_dir().join("settings.json");
    std::fs::write(&path, config)
        .map_err(|e| format!("Failed to write config: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = MoltenConfig::default();
        assert!(config.sidebar.visible);
        assert_eq!(config.sidebar.position, "left");
        assert_eq!(config.font.size, 14);
    }

    #[test]
    fn test_config_dir() {
        let dir = config_dir();
        assert!(dir.to_string_lossy().contains("molten"));
    }

    #[test]
    fn test_serialize_config() {
        let config = MoltenConfig::default();
        let json = serde_json::to_string(&config).unwrap();
        assert!(json.contains("visible"));
    }
}
