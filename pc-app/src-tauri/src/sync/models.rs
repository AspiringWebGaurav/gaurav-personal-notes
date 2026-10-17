use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteNote {
    pub id: String,
    pub title: String,
    pub content: String,
    pub word_count: i64,
    pub is_archived: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatusSummary {
    pub state: String, // "idle", "syncing", "synced", "offline", "error"
    pub pending_count: i64,
    pub last_synced_at: Option<i64>,
    pub last_error: Option<String>,
    #[serde(default)]
    pub has_remote_changes: Option<bool>,
}
