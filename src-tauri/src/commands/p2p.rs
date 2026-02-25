//! P2P 相关 Tauri 命令

use serde::{Deserialize, Serialize};
use tauri::{State, Manager, Emitter};
use std::sync::Arc;
use tokio::sync::Mutex;
use crate::p2p::{P2PEngine, P2PEvent};

// 全局 P2P 引擎状态
pub struct P2PState {
    pub engine: Arc<Mutex<Option<P2PEngine>>>,
}

#[tauri::command]
pub async fn start_p2p_engine(
    state: State<'_, P2PState>,
    app_handle: tauri::AppHandle,
    secret_key: String,
    name: String,
) -> Result<String, String> {
    println!("🔑 [后端] start_p2p_engine 被调用");
    println!("   密钥：{}...{}", &secret_key[..20], &secret_key[secret_key.len()-10..]);
    println!("   用户名：{}", name);
    
    let mut engine_guard = state.engine.lock().await;
    
    if engine_guard.is_some() {
        println!("⚠️ [后端] P2P 引擎已经启动，返回现有 Peer ID");
        let existing_peer_id = engine_guard.as_ref().unwrap().local_peer_id().to_string();
        return Ok(existing_peer_id);
    }
    
    println!("✅ [后端] 开始创建 P2P 引擎...");
    
    // 创建 P2P 引擎
    let mut engine = crate::p2p::init_p2p(&secret_key, name.clone())?;
    
    // 创建事件通道
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<P2PEvent>();
    engine.set_event_sender(tx);
    
    // 启动引擎
    engine.start().await?;
    
    let peer_id = engine.local_peer_id().to_string();
    
    println!("✅ [后端] P2P 引擎创建成功，Peer ID: {}", peer_id);
    
    // 启动后台事件轮询和转发任务
    let engine_arc = state.engine.clone();
    // 克隆 app_handle 以便在 spawn 任务中使用
    let app_handle_clone = app_handle.clone();
    
    tauri::async_runtime::spawn(async move {
        println!("🔄 [后端] 启动后台事件轮询任务...");
        
        // 事件转发任务 - 使用克隆的 app_handle
        tauri::async_runtime::spawn(async move {
            println!("📡 [后端] 事件转发任务已启动");
            while let Some(event) = rx.recv().await {
                match event {
                    P2PEvent::MessageReceived { from_peer_id, from_name, content, timestamp, message_id } => {
                        println!("📬 [后端] 转发收到消息事件到前端 from={}", from_peer_id);
                        let emit_result = app_handle_clone.emit("p2p-message-received", serde_json::json!({
                            "from_peer_id": from_peer_id,
                            "from_name": from_name,
                            "content": content,
                            "timestamp": timestamp,
                            "message_id": message_id
                        }));
                        match emit_result {
                            Ok(_) => println!("✅ [后端] 事件发送成功"),
                            Err(e) => println!("❌ [后端] 事件发送失败：{:?}", e),
                        }
                    }
                    P2PEvent::MessageSent { message_id, peer_id } => {
                        let _ = app_handle_clone.emit("p2p-message-sent", serde_json::json!({
                            "message_id": message_id,
                            "peer_id": peer_id
                        }));
                    }
                    P2PEvent::PeerConnected { peer_id } => {
                        println!("🔗 [后端] 转发 Peer 连接事件：{}", peer_id);
                        let _ = app_handle_clone.emit("p2p-peer-connected", serde_json::json!({
                            "peer_id": peer_id
                        }));
                    }
                    P2PEvent::PeerDisconnected { peer_id } => {
                        let _ = app_handle_clone.emit("p2p-peer-disconnected", serde_json::json!({
                            "peer_id": peer_id
                        }));
                    }
                    P2PEvent::EngineStarted { peer_id, listening_on } => {
                        println!("🚀 [后端] 转发引擎启动事件：{} on {}", peer_id, listening_on);
                        let _ = app_handle_clone.emit("p2p-engine-started", serde_json::json!({
                            "peer_id": peer_id,
                            "listening_on": listening_on
                        }));
                    }
                    _ => {}
                }
            }
            println!("⏹️ [后端] 事件转发任务停止");
        });
        
        loop {
            let mut guard = engine_arc.lock().await;
            if let Some(engine) = guard.as_mut() {
                let _ = engine.poll_events().await;
            } else {
                break;
            }
            drop(guard);
            
            tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
        }
        println!("⏹️ [后端] 后台事件轮询任务停止");
    });
    
    *engine_guard = Some(engine);
    
    println!("✅ [后端] P2P 引擎启动完成");
    
    Ok(peer_id)
}

#[tauri::command]
pub async fn send_chat_message(
    state: State<'_, P2PState>,
    peer_id: String,
    content: String,
) -> Result<String, String> {
    let mut engine_guard = state.engine.lock().await;
    
    if let Some(engine) = engine_guard.as_mut() {
        engine.send_chat_message(&peer_id, &content).await
    } else {
        Err("P2P engine not started".to_string())
    }
}

#[tauri::command]
pub async fn send_contact_request(
    state: State<'_, P2PState>,
    peer_id: String,
) -> Result<(), String> {
    let mut engine_guard = state.engine.lock().await;
    
    if let Some(engine) = engine_guard.as_mut() {
        engine.send_contact_request(&peer_id).await
    } else {
        Err("P2P engine not started".to_string())
    }
}

#[tauri::command]
pub async fn get_peers(state: State<'_, P2PState>) -> Result<Vec<crate::p2p::Peer>, String> {
    let engine_guard = state.engine.lock().await;
    
    if let Some(engine) = engine_guard.as_ref() {
        Ok(engine.get_peers())
    } else {
        Ok(vec![])
    }
}

#[tauri::command]
pub async fn add_peer_manually(
    state: State<'_, P2PState>,
    peer_id: String,
    address: String,
    name: Option<String>,
) -> Result<(), String> {
    let mut engine_guard = state.engine.lock().await;
    
    if let Some(engine) = engine_guard.as_mut() {
        engine.add_peer(peer_id, address, name);
        Ok(())
    } else {
        Err("P2P engine not started".to_string())
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct P2PStatus {
    pub started: bool,
    pub local_peer_id: String,
    pub local_public_key: String,
}

#[tauri::command]
pub async fn get_p2p_status(state: State<'_, P2PState>) -> Result<P2PStatus, String> {
    let engine_guard = state.engine.lock().await;
    
    if let Some(engine) = engine_guard.as_ref() {
        Ok(P2PStatus {
            started: true,
            local_peer_id: engine.local_peer_id().to_string(),
            local_public_key: engine.local_public_key().to_string(),
        })
    } else {
        Ok(P2PStatus {
            started: false,
            local_peer_id: String::new(),
            local_public_key: String::new(),
        })
    }
}

#[tauri::command]
pub async fn get_connected_peers(state: State<'_, P2PState>) -> Result<Vec<String>, String> {
    let engine_guard = state.engine.lock().await;
    
    if let Some(engine) = engine_guard.as_ref() {
        Ok(engine.get_connected_peers())
    } else {
        Ok(vec![])
    }
}

#[tauri::command]
pub async fn get_p2p_debug_info(state: State<'_, P2PState>) -> Result<serde_json::Value, String> {
    let engine_guard = state.engine.lock().await;
    
    if let Some(engine) = engine_guard.as_ref() {
        Ok(serde_json::json!({
            "started": true,
            "peer_id": engine.local_peer_id(),
            "public_key": engine.local_public_key(),
            "peers_count": engine.get_peers().len(),
            "connected_peers": engine.get_connected_peers(),
            "message_log_count": engine.get_message_log().len()
        }))
    } else {
        Ok(serde_json::json!({
            "started": false,
            "peer_id": null,
            "public_key": null,
            "peers_count": 0,
            "connected_peers": [],
            "message_log_count": 0
        }))
    }
}

#[tauri::command]
pub async fn stop_p2p_engine(state: State<'_, P2PState>) -> Result<(), String> {
    println!("⏹️ [后端] stop_p2p_engine 被调用");
    
    let mut engine_guard = state.engine.lock().await;
    
    if engine_guard.is_some() {
        println!("✅ [后端] P2P 引擎已停止");
        *engine_guard = None;
        Ok(())
    } else {
        println!("⚠️ [后端] P2P 引擎未启动");
        Ok(())
    }
}

#[tauri::command]
pub async fn reconnect_to_peer(
    state: State<'_, P2PState>,
    peer_id: String,
) -> Result<String, String> {
    println!("🔄 [后端] 重连到 {}", peer_id);
    
    let mut engine_guard = state.engine.lock().await;
    
    if let Some(engine) = engine_guard.as_mut() {
        engine.reconnect_to(&peer_id).await?;
        Ok(format!("正在重连到 {}", peer_id))
    } else {
        Err("P2P engine not started".to_string())
    }
}
