use serde::{Deserialize, Serialize};
use crate::db;

#[derive(Debug, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub sender_id: String,
    pub content: String,
    #[serde(rename = "type")]
    pub message_type: String,
    pub timestamp: i64,
    pub status: String,
}

#[tauri::command]
pub async fn send_message(
    _recipient: String,
    _content: String,
    _message_type: String,
) -> Result<String, String> {
    // TODO: Implement actual P2P message sending
    // For now, just return a placeholder
    let message_id = uuid::Uuid::new_v4().to_string();
    Ok(message_id)
}

#[tauri::command]
pub async fn get_messages(
    conversation_id: String,
    limit: usize,
) -> Result<Vec<Message>, String> {
    let db_messages = db::get_messages(&conversation_id, limit)?;
    
    let messages = db_messages.into_iter().map(|m| Message {
        id: m.id,
        conversation_id: m.conversation_id,
        sender_id: m.sender_id,
        content: m.content,
        message_type: m.message_type,
        timestamp: m.timestamp,
        status: m.status,
    }).collect();
    
    Ok(messages)
}
