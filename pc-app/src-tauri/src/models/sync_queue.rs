use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SyncQueueItem {
    pub id: String,
    pub note_id: String,
    pub user_id: String,
    pub action: String, // "create", "update", "delete", "archive", "restore"
    pub payload: String, // JSON payload representing the change
    pub status: String,  // "pending", "syncing", "failed"
    pub retry_count: i64,
    pub last_error: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}
