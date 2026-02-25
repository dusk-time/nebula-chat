use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct AppConfig {
    pub theme: String,
    pub notifications: bool,
    pub auto_start: bool,
    pub language: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        AppConfig {
            theme: "dark".to_string(),
            notifications: true,
            auto_start: false,
            language: "en".to_string(),
        }
    }
}

pub fn load_config(config_path: &PathBuf) -> Result<AppConfig, String> {
    if config_path.exists() {
        let content = std::fs::read_to_string(config_path)
            .map_err(|e| e.to_string())?;
        serde_json::from_str(&content)
            .map_err(|e| e.to_string())
    } else {
        Ok(AppConfig::default())
    }
}

pub fn save_config(config_path: &PathBuf, config: &AppConfig) -> Result<(), String> {
    let content = serde_json::to_string_pretty(config)
        .map_err(|e| e.to_string())?;
    std::fs::write(config_path, content)
        .map_err(|e| e.to_string())
}
