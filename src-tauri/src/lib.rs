// Nebula Chat - Android Library Entry Point
// This file is required for Tauri Android build

// Mobile entry point macro for Tauri v2
#[cfg(target_os = "android")]
#[no_mangle]
pub fn android_main(app: tauri::android::AndroidApp) {
    use tauri::android::android_setup;
    android_setup(app);
}

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
