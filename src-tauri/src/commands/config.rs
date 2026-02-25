use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct AppSettings {
    pub theme: String,
    pub notifications: bool,
    pub auto_start: bool,
}

#[tauri::command]
pub async fn get_settings() -> Result<AppSettings, String> {
    Ok(AppSettings {
        theme: "dark".to_string(),
        notifications: true,
        auto_start: false,
    })
}

#[tauri::command]
pub async fn update_settings(_settings: AppSettings) -> Result<(), String> {
    // TODO: Save settings to file
    Ok(())
}
