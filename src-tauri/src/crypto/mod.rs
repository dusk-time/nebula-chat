use sodiumoxide::crypto::sign;
use tauri::{AppHandle, Manager};
use std::path::PathBuf;
use serde::{Serialize, Deserialize};
use std::sync::Mutex;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};

#[derive(Clone, Serialize, Deserialize)]
pub struct Identity {
    pub public_key: String,
    pub secret_key: String,
    pub name: String,
    pub created_at: i64,
}

pub struct CryptoState {
    pub identity: Option<Identity>,
}

// Global state for crypto
static IDENTITY: Mutex<Option<Identity>> = Mutex::new(None);

pub fn init_crypto(app_handle: &AppHandle) -> Result<(), String> {
    sodiumoxide::init().map_err(|_| "Failed to initialize sodiumoxide")?;
    
    let identity_path = get_identity_path(app_handle)?;
    
    // Check if identity exists, load if present
    if identity_path.exists() {
        load_identity(&identity_path)?;
    }
    // If no identity, wait for user to create one via generate_identity command
    
    Ok(())
}

fn get_identity_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    
    let nebula_dir = app_data_dir.join("nebula");
    std::fs::create_dir_all(&nebula_dir).map_err(|e| e.to_string())?;
    
    Ok(nebula_dir.join("identity.json"))
}

pub fn generate_identity(app_handle: &AppHandle, username: String) -> Result<Identity, String> {
    let (pk, sk) = sign::gen_keypair();
    
    let identity = Identity {
        public_key: format!("ed25519:{}", BASE64.encode(pk.as_ref())),
        secret_key: format!("ed25519:{}", BASE64.encode(sk.as_ref())),
        name: username,
        created_at: chrono::Utc::now().timestamp(),
    };
    
    // Save to file
    let identity_path = get_identity_path(app_handle)?;
    let json = serde_json::to_string_pretty(&identity)
        .map_err(|e| format!("Failed to serialize identity: {}", e))?;
    
    std::fs::write(&identity_path, json)
        .map_err(|e| format!("Failed to save identity: {}", e))?;
    
    // Store in memory
    let mut guard = IDENTITY.lock().map_err(|_| "Failed to lock identity")?;
    *guard = Some(identity.clone());
    
    Ok(identity)
}

fn load_identity(path: &PathBuf) -> Result<Identity, String> {
    let content = std::fs::read_to_string(path)
        .map_err(|e| format!("Failed to read identity file: {}", e))?;
    
    let identity: Identity = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse identity: {}", e))?;
    
    // Store in memory
    let mut guard = IDENTITY.lock().map_err(|_| "Failed to lock identity")?;
    *guard = Some(identity.clone());
    
    Ok(identity)
}

pub fn get_identity() -> Option<Identity> {
    let guard = IDENTITY.lock().ok()?;
    guard.clone()
}

pub fn export_identity() -> Result<serde_json::Value, String> {
    let guard = IDENTITY.lock().map_err(|_| "Failed to lock identity")?;
    let identity = guard.as_ref()
        .ok_or("No identity found")?;
    
    // Export without secret key
    Ok(serde_json::json!({
        "version": 1,
        "identity": {
            "publicKey": identity.public_key,
            "name": identity.name,
            "createdAt": identity.created_at
        },
        "settings": {
            "theme": "dark",
            "notifications": true
        }
    }))
}

pub fn import_contact(identity_json: &str) -> Result<serde_json::Value, String> {
    let data: serde_json::Value = serde_json::from_str(identity_json)
        .map_err(|e| format!("Failed to parse contact identity: {}", e))?;
    
    let public_key = data["identity"]["publicKey"].as_str()
        .ok_or("Invalid contact identity: missing publicKey")?;
    let name = data["identity"]["name"].as_str()
        .unwrap_or("Unknown");
    
    Ok(serde_json::json!({
        "id": public_key,
        "name": name,
        "publicKey": public_key,
        "avatar": null
    }))
}
