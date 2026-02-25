// Nebula Chat - Android Library Entry Point
// This file is required for Tauri Android build

// Mobile entry point macro
#[cfg(target_os = "android")]
tauri::android_plugin_entry_point!();

// Re-export main module
pub mod commands;
pub mod config;
pub mod crypto;
pub mod db;
pub mod p2p;

// Re-export commonly used items
pub use commands::*;
pub use config::*;
pub use crypto::*;
pub use db::*;
pub use p2p::*;
