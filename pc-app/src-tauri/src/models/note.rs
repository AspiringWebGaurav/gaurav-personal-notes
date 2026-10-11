use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LocalNote {
    pub id: String,
    pub user_id: String,
    pub title: String,
    pub content: String,
    pub word_count: i64,
    pub is_archived: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub remote_updated_at: i64,
    pub sync_version: i64,
    pub sync_state: String, // "synced", "pending", "syncing", "conflict"
    pub is_deleted: bool,
    pub deleted_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNoteInput {
    pub id: Option<String>,
    pub user_id: Option<String>,
    pub title: Option<String>,
    pub content: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateNoteInput {
    pub title: Option<String>,
    pub content: Option<String>,
    pub word_count: Option<i64>,
    pub is_archived: Option<bool>,
}
