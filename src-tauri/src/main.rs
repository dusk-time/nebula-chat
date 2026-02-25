#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod crypto;
mod db;
mod p2p;
mod config;

use commands::p2p::P2PState;
use std::sync::Arc;
use tokio::sync::Mutex;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(P2PState {
            engine: Arc::new(Mutex::new(None)),
        })
        .invoke_handler(tauri::generate_handler![
            // P2P 命令
            commands::p2p::start_p2p_engine,
            commands::p2p::stop_p2p_engine,
            commands::p2p::send_chat_message,
            commands::p2p::send_contact_request,
            commands::p2p::get_peers,
            commands::p2p::add_peer_manually,
            commands::p2p::get_p2p_status,
            commands::p2p::get_connected_peers,
            commands::p2p::get_p2p_debug_info,
            
            // 聊天命令
            commands::chat::send_message,
            commands::chat::get_messages,
            
            // 联系人命令
            commands::contacts::add_contact,
            commands::contacts::list_contacts,
            commands::contacts::remove_contact,
            
            // 加密命令
            commands::crypto::generate_identity,
            commands::crypto::export_identity,
            commands::crypto::import_contact,
            
            // 配置命令
            commands::config::get_settings,
            commands::config::update_settings,
        ])
        .setup(|app| {
            // Initialize database
            let app_handle = app.handle();
            db::init_db(&app_handle)?;
            
            // Initialize crypto
            crypto::init_crypto(&app_handle)?;
            
            println!("✅ Nebula Chat started");
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running nebula-chat");
}
