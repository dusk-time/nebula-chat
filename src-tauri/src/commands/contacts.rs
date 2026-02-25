use serde::{Deserialize, Serialize};
use crate::db;

#[derive(Debug, Serialize, Deserialize)]
pub struct Contact {
    pub id: String,
    pub name: String,
    pub public_key: String,
    pub avatar: Option<String>,
}

#[tauri::command]
pub async fn add_contact(
    name: String,
    public_key: String,
) -> Result<Contact, String> {
    let contact = Contact {
        id: public_key.clone(),
        name: name.clone(),
        public_key: public_key.clone(),
        avatar: None,
    };
    
    let db_contact = db::Contact {
        id: contact.id.clone(),
        name: contact.name.clone(),
        public_key: contact.public_key.clone(),
        avatar: contact.avatar.clone(),
        created_at: chrono::Utc::now().timestamp(),
    };
    
    db::add_contact(&db_contact)?;
    
    Ok(contact)
}

#[tauri::command]
pub async fn list_contacts() -> Result<Vec<Contact>, String> {
    let db_contacts = db::list_contacts()?;
    
    let contacts = db_contacts.into_iter().map(|c| Contact {
        id: c.id,
        name: c.name,
        public_key: c.public_key,
        avatar: c.avatar,
    }).collect();
    
    Ok(contacts)
}

#[tauri::command]
pub async fn remove_contact(contact_id: String) -> Result<(), String> {
    db::remove_contact(&contact_id)?;
    Ok(())
}
