use rusqlite::{Connection, Result, params};
use tauri::{AppHandle, Manager};
use std::path::PathBuf;
use serde::{Serialize, Deserialize};
use std::sync::Mutex;

#[derive(Clone, Serialize, Deserialize)]
pub struct Contact {
    pub id: String,
    pub name: String,
    pub public_key: String,
    pub avatar: Option<String>,
    pub created_at: i64,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub sender_id: String,
    pub content: String,
    #[serde(rename = "type")]
    pub message_type: String,
    pub file_path: Option<String>,
    pub file_size: Option<i64>,
    pub timestamp: i64,
    pub status: String,
}

// Global database connection
static DB: Mutex<Option<Connection>> = Mutex::new(None);

pub fn init_db(app_handle: &AppHandle) -> Result<(), String> {
    let db_path = get_db_path(app_handle)?;
    
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    create_tables(&conn)?;
    
    // Store connection globally
    let mut guard = DB.lock().map_err(|_| "Failed to lock DB")?;
    *guard = Some(conn);
    
    Ok(())
}

fn get_db_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    
    let nebula_dir = app_data_dir.join("nebula");
    std::fs::create_dir_all(&nebula_dir).map_err(|e| e.to_string())?;
    
    Ok(nebula_dir.join("messages.db"))
}

fn create_tables(conn: &Connection) -> Result<(), String> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS contacts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            public_key TEXT NOT NULL,
            avatar TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER
        )",
        [],
    ).map_err(|e| e.to_string())?;
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            contact_id TEXT NOT NULL,
            last_message TEXT,
            last_message_time INTEGER,
            unread_count INTEGER DEFAULT 0,
            FOREIGN KEY (contact_id) REFERENCES contacts(id)
        )",
        [],
    ).map_err(|e| e.to_string())?;
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            sender_id TEXT NOT NULL,
            content TEXT NOT NULL,
            type TEXT NOT NULL,
            file_path TEXT,
            file_size INTEGER,
            timestamp INTEGER NOT NULL,
            status TEXT NOT NULL,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id)
        )",
        [],
    ).map_err(|e| e.to_string())?;
    
    // Create indexes
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)",
        [],
    ).map_err(|e| e.to_string())?;
    
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)",
        [],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

fn get_db() -> Result<std::sync::MutexGuard<'static, Option<Connection>>, String> {
    DB.lock().map_err(|_| "Failed to lock DB".to_string())
}

// Contact operations
pub fn add_contact(contact: &Contact) -> Result<(), String> {
    let guard = get_db()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;
    
    conn.execute(
        "INSERT OR REPLACE INTO contacts (id, name, public_key, avatar, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            contact.id,
            contact.name,
            contact.public_key,
            contact.avatar,
            contact.created_at,
            chrono::Utc::now().timestamp()
        ],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

pub fn list_contacts() -> Result<Vec<Contact>, String> {
    let guard = get_db()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;
    
    let mut stmt = conn.prepare(
        "SELECT id, name, public_key, avatar, created_at FROM contacts ORDER BY name"
    ).map_err(|e| e.to_string())?;
    
    let contacts = stmt.query_map([], |row| {
        Ok(Contact {
            id: row.get(0)?,
            name: row.get(1)?,
            public_key: row.get(2)?,
            avatar: row.get(3)?,
            created_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut result = Vec::new();
    for contact in contacts {
        result.push(contact.map_err(|e| e.to_string())?);
    }
    
    Ok(result)
}

pub fn remove_contact(contact_id: &str) -> Result<(), String> {
    let guard = get_db()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;
    
    conn.execute(
        "DELETE FROM contacts WHERE id = ?1",
        params![contact_id],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

// Message operations
pub fn add_message(message: &Message) -> Result<(), String> {
    let guard = get_db()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;
    
    conn.execute(
        "INSERT INTO messages (id, conversation_id, sender_id, content, type, file_path, file_size, timestamp, status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            message.id,
            message.conversation_id,
            message.sender_id,
            message.content,
            message.message_type,
            message.file_path,
            message.file_size,
            message.timestamp,
            message.status
        ],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}

pub fn get_messages(conversation_id: &str, limit: usize) -> Result<Vec<Message>, String> {
    let guard = get_db()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;
    
    let mut stmt = conn.prepare(
        "SELECT id, conversation_id, sender_id, content, type, file_path, file_size, timestamp, status
         FROM messages 
         WHERE conversation_id = ?1 
         ORDER BY timestamp DESC 
         LIMIT ?2"
    ).map_err(|e| e.to_string())?;
    
    let messages = stmt.query_map(params![conversation_id, limit], |row| {
        Ok(Message {
            id: row.get(0)?,
            conversation_id: row.get(1)?,
            sender_id: row.get(2)?,
            content: row.get(3)?,
            message_type: row.get(4)?,
            file_path: row.get(5)?,
            file_size: row.get(6)?,
            timestamp: row.get(7)?,
            status: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?;
    
    let mut result = Vec::new();
    for message in messages {
        result.push(message.map_err(|e| e.to_string())?);
    }
    
    result.reverse(); // Return in chronological order
    Ok(result)
}
