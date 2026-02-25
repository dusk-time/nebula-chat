use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use crate::crypto;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IdentityResponse {
    pub public_key: String,
    pub secret_key: String,
    pub name: String,
    pub created_at: i64,
}

#[tauri::command]
pub async fn generate_identity(app: AppHandle, username: String) -> Result<IdentityResponse, String> {
    let identity = crypto::generate_identity(&app, username)?;
    
    Ok(IdentityResponse {
        public_key: identity.public_key.clone(),
        secret_key: identity.secret_key.clone(),
        name: identity.name,
        created_at: identity.created_at,
    })
}

#[tauri::command]
pub async fn export_identity() -> Result<serde_json::Value, String> {
    crypto::export_identity()
}

#[tauri::command]
pub async fn import_contact(identity_json: String) -> Result<serde_json::Value, String> {
    crypto::import_contact(&identity_json)
}
