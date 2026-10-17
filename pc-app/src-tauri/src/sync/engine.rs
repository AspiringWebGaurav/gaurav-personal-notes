use super::firestore_client::FirestoreClient;
use super::models::{RemoteNote, SyncStatusSummary};
use crate::models::{LocalNote, SyncQueueItem};
use chrono::Utc;
use rusqlite::{params, Connection};
use std::sync::Arc;
use uuid::Uuid;

pub struct SyncEngine {
    firestore: FirestoreClient,
}

impl SyncEngine {
    pub fn new(project_id: String) -> Self {
        Self {
            firestore: FirestoreClient::new(project_id),
        }
    }

    /// Performs a complete local-first bidirectional synchronization cycle:
    /// 1. PUSH local mutations from `sync_queue` to Firestore
    /// 2. PULL remote documents from Firestore, resolving conflicts with LWW + Conflict Backup
    pub async fn run_sync_cycle(
        &self,
        conn_arc: Arc<parking_lot::Mutex<Connection>>,
        uid: &str,
        id_token: &str,
        force_pull: bool,
    ) -> Result<SyncStatusSummary, String> {
        let now = Utc::now().timestamp_millis();
        let mut has_remote_changes = false;

        // 1. PUSH PHASE: Process pending items from durable sync queue
        let pending_items: Vec<SyncQueueItem> = {
            let conn = conn_arc.lock();
            let mut stmt = conn
                .prepare(
                    "SELECT id, note_id, user_id, action, payload, status, retry_count, last_error, created_at, updated_at
                     FROM sync_queue
                     WHERE status = 'pending' AND user_id = ?1
                     ORDER BY created_at ASC
                     LIMIT 50",
                )
                .map_err(|e| format!("Failed to read sync queue: {}", e))?;

            let rows = stmt
                .query_map([uid], |row| {
                    Ok(SyncQueueItem {
                        id: row.get(0)?,
                        note_id: row.get(1)?,
                        user_id: row.get(2)?,
                        action: row.get(3)?,
                        payload: row.get(4)?,
                        status: row.get(5)?,
                        retry_count: row.get(6)?,
                        last_error: row.get(7)?,
                        created_at: row.get(8)?,
                        updated_at: row.get(9)?,
                    })
                })
                .map_err(|e| format!("Failed to query sync queue rows: {}", e))?;

            let mut items = Vec::new();
            for r in rows {
                if let Ok(item) = r {
                    items.push(item);
                }
            }
            items
        };

        for item in &pending_items {
            match item.action.as_str() {
                "create" | "update" => {
                    let local_note: Result<LocalNote, _> = serde_json::from_str(&item.payload);
                    match local_note {
                        Ok(note) => {
                            let remote_note = RemoteNote {
                                id: note.id.clone(),
                                title: note.title,
                                content: note.content,
                                word_count: note.word_count,
                                is_archived: note.is_archived,
                                created_at: note.created_at,
                                updated_at: note.updated_at,
                            };

                            match self.firestore.upsert_note(uid, id_token, &remote_note).await {
                                Ok(_) => {
                                    let conn = conn_arc.lock();
                                    let _ = conn.execute(
                                        "UPDATE notes SET sync_state = 'synced', remote_updated_at = ?1 WHERE id = ?2",
                                        params![note.updated_at, note.id],
                                    );
                                    let _ = conn.execute(
                                        "DELETE FROM sync_queue WHERE note_id = ?1 AND user_id = ?2",
                                        params![note.id, uid],
                                    );
                                }
                                Err(err) => {
                                    let conn = conn_arc.lock();
                                    let _ = conn.execute(
                                        "UPDATE sync_queue SET retry_count = retry_count + 1, last_error = ?1, updated_at = ?2 WHERE id = ?3",
                                        params![err, now, item.id],
                                    );
                                }
                            }
                        }
                        Err(e) => {
                            // Invalid payload in queue, discard to prevent blocking
                            let conn = conn_arc.lock();
                            let _ = conn.execute("DELETE FROM sync_queue WHERE id = ?1", params![item.id]);
                            eprintln!("Invalid note sync payload: {}", e);
                        }
                    }
                }
                "delete" => {
                    match self.firestore.delete_note(uid, id_token, &item.note_id).await {
                        Ok(_) => {
                            let conn = conn_arc.lock();
                            let _ = conn.execute("DELETE FROM sync_queue WHERE note_id = ?1 AND user_id = ?2", params![item.note_id, uid]);
                        }
                        Err(err) => {
                            let conn = conn_arc.lock();
                            let _ = conn.execute(
                                "UPDATE sync_queue SET retry_count = retry_count + 1, last_error = ?1, updated_at = ?2 WHERE id = ?3",
                                params![err, now, item.id],
                            );
                        }
                    }
                }
                "archive" | "restore" => {
                    let note_opt: Option<LocalNote> = {
                        let conn = conn_arc.lock();
                        conn.query_row(
                            "SELECT id, user_id, title, content, word_count, is_archived,
                                    created_at, updated_at, remote_updated_at, sync_version,
                                    sync_state, is_deleted, deleted_at
                             FROM notes WHERE id = ?1 AND user_id = ?2",
                            params![item.note_id, uid],
                            |row| {
                                let is_archived_int: i64 = row.get(5)?;
                                let is_deleted_int: i64 = row.get(11)?;
                                Ok(LocalNote {
                                    id: row.get(0)?,
                                    user_id: row.get(1)?,
                                    title: row.get(2)?,
                                    content: row.get(3)?,
                                    word_count: row.get(4)?,
                                    is_archived: is_archived_int != 0,
                                    created_at: row.get(6)?,
                                    updated_at: row.get(7)?,
                                    remote_updated_at: row.get(8)?,
                                    sync_version: row.get(9)?,
                                    sync_state: row.get(10)?,
                                    is_deleted: is_deleted_int != 0,
                                    deleted_at: row.get(12)?,
                                })
                            },
                        ).ok()
                    };

                    if let Some(note) = note_opt {
                        let remote_note = RemoteNote {
                            id: note.id.clone(),
                            title: note.title,
                            content: note.content,
                            word_count: note.word_count,
                            is_archived: note.is_archived,
                            created_at: note.created_at,
                            updated_at: note.updated_at,
                        };
                        match self.firestore.upsert_note(uid, id_token, &remote_note).await {
                            Ok(_) => {
                                let conn = conn_arc.lock();
                                let _ = conn.execute(
                                    "UPDATE notes SET sync_state = 'synced', remote_updated_at = ?1 WHERE id = ?2",
                                    params![note.updated_at, note.id],
                                );
                                let _ = conn.execute(
                                    "DELETE FROM sync_queue WHERE note_id = ?1 AND user_id = ?2",
                                    params![note.id, uid],
                                );
                            }
                            Err(err) => {
                                let conn = conn_arc.lock();
                                let _ = conn.execute(
                                    "UPDATE sync_queue SET retry_count = retry_count + 1, last_error = ?1, updated_at = ?2 WHERE id = ?3",
                                    params![err, now, item.id],
                                );
                            }
                        }
                    } else {
                        let conn = conn_arc.lock();
                        let _ = conn.execute("DELETE FROM sync_queue WHERE id = ?1", params![item.id]);
                    }
                }
                _ => {
                    let conn = conn_arc.lock();
                    let _ = conn.execute("DELETE FROM sync_queue WHERE id = ?1", params![item.id]);
                }
            }
        }

        // 2. PULL PHASE: Retrieve remote notes and merge with local database.
        // QUOTA OPTIMIZATION: Only execute list_notes when force_pull is true.
        // Routine background local pushes skip this entirely, saving Firebase reads!
        if force_pull {
            let remote_notes = self.firestore.list_notes(uid, id_token).await?;

            for remote in &remote_notes {
                let conn = conn_arc.lock();
                let local_existing: Option<(String, String, i64, String)> = conn
                    .query_row(
                        "SELECT title, content, updated_at, sync_state FROM notes WHERE id = ?1",
                        params![remote.id],
                        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
                    )
                    .ok();

                match local_existing {
                    None => {
                        // New remote note: insert locally as synced
                        let _ = conn.execute(
                            "INSERT INTO notes (id, user_id, title, content, word_count, is_archived, created_at, updated_at, remote_updated_at, sync_version, sync_state, is_deleted)
                             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 1, 'synced', 0)",
                            params![
                                remote.id,
                                uid,
                                remote.title,
                                remote.content,
                                remote.word_count,
                                remote.is_archived as i32,
                                remote.created_at,
                                remote.updated_at,
                                remote.updated_at,
                            ],
                        );
                        has_remote_changes = true;
                    }
                    Some((local_title, local_content, local_updated_at, sync_state)) => {
                        if sync_state == "pending" {
                            // Conflict condition: local has unpushed edits, and remote was also edited concurrently!
                            if remote.updated_at > local_updated_at {
                                // Preserve local changes in a safe conflict backup note
                                let conflict_id = Uuid::new_v4().to_string();
                                let conflict_title = format!("[Conflict Backup] {}", local_title);
                                let _ = conn.execute(
                                    "INSERT INTO notes (id, user_id, title, content, word_count, is_archived, created_at, updated_at, remote_updated_at, sync_version, sync_state, is_deleted)
                                     VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6, ?6, 0, 1, 'pending', 0)",
                                    params![
                                        conflict_id,
                                        uid,
                                        conflict_title,
                                        local_content,
                                        local_content.split_whitespace().count() as i64,
                                        now,
                                    ],
                                );

                                // Apply remote version to the primary note
                                let _ = conn.execute(
                                    "UPDATE notes SET title = ?1, content = ?2, word_count = ?3, is_archived = ?4, updated_at = ?5, remote_updated_at = ?5, sync_state = 'synced' WHERE id = ?6",
                                    params![
                                        remote.title,
                                        remote.content,
                                        remote.word_count,
                                        remote.is_archived as i32,
                                        remote.updated_at,
                                        remote.id,
                                    ],
                                );
                                has_remote_changes = true;
                            }
                        } else if remote.updated_at > local_updated_at || (remote.updated_at == local_updated_at && (remote.title != local_title || remote.content != local_content)) {
                            // Remote is newer or different: apply remote version
                            let _ = conn.execute(
                                "UPDATE notes SET title = ?1, content = ?2, word_count = ?3, is_archived = ?4, updated_at = ?5, remote_updated_at = ?5, sync_state = 'synced' WHERE id = ?6",
                                params![
                                    remote.title,
                                    remote.content,
                                    remote.word_count,
                                    remote.is_archived as i32,
                                    remote.updated_at,
                                    remote.id,
                                ],
                            );
                            has_remote_changes = true;
                        }
                    }
                }
            }

            // Mirror Cleanup: Remote document set is the source of truth for cloud notes.
            // Any note in SQLite for this user that is already synced but no longer exists in Firestore
            // is removed locally so the local database is an exact 1-to-1 mirror of the cloud database.
            let remote_ids: std::collections::HashSet<String> = remote_notes.iter().map(|n| n.id.clone()).collect();
            {
                let conn = conn_arc.lock();
                let mut stmt = conn
                    .prepare(
                        "SELECT id FROM notes WHERE user_id = ?1 AND sync_state != 'pending' AND sync_state != 'local_only' AND is_deleted = 0",
                    )
                    .map_err(|e| format!("Failed to prepare mirror check query: {}", e))?;

                let local_ids: Vec<String> = stmt
                    .query_map([uid], |row| row.get(0))
                    .map_err(|e| format!("Failed to query local ids: {}", e))?
                    .filter_map(|r| r.ok())
                    .collect();

                for loc_id in local_ids {
                    if !remote_ids.contains(&loc_id) {
                        let _ = conn.execute("DELETE FROM notes WHERE id = ?1", params![loc_id]);
                        let _ = conn.execute("DELETE FROM notes_fts WHERE id = ?1", params![loc_id]);
                        has_remote_changes = true;
                    }
                }
            }
        }

        // 3. Update sync metadata in SQLite
        {
            let conn = conn_arc.lock();
            let _ = conn.execute(
                "INSERT INTO sync_metadata (key, value, updated_at) VALUES ('last_synced_at', ?1, ?2)
                 ON CONFLICT(key) DO UPDATE SET value = ?1, updated_at = ?2",
                params![now.to_string(), now],
            );
        }

        let mut summary = {
            let conn = conn_arc.lock();
            Self::get_sync_status(&conn, uid)
        };
        summary.has_remote_changes = Some(has_remote_changes);

        Ok(summary)
    }

    /// Retrieve sync status summary with automatic self-healing reconciliation
    pub fn get_sync_status(
        conn: &Connection,
        uid: &str,
    ) -> SyncStatusSummary {
        // Self-healing: purge false pending items
        // 1. Purge queue rows for notes that are already marked 'synced' in the notes table
        let _ = conn.execute(
            "DELETE FROM sync_queue
             WHERE user_id = ?1
               AND action IN ('create', 'update', 'archive', 'restore')
               AND note_id IN (
                 SELECT id FROM notes WHERE sync_state = 'synced' AND user_id = ?1
               )",
            params![uid],
        );

        // 2. Purge queue rows for notes marked 'local_only'
        let _ = conn.execute(
            "DELETE FROM sync_queue
             WHERE user_id = ?1
               AND note_id IN (
                 SELECT id FROM notes WHERE sync_state = 'local_only' AND user_id = ?1
               )",
            params![uid],
        );

        // 3. Purge orphan queue rows where note no longer exists (unless action is 'delete')
        let _ = conn.execute(
            "DELETE FROM sync_queue
             WHERE user_id = ?1
               AND action != 'delete'
               AND note_id NOT IN (
                 SELECT id FROM notes WHERE user_id = ?1
               )",
            params![uid],
        );

        // 4. Purge queue rows for notes that are soft-deleted where action is NOT 'delete'
        let _ = conn.execute(
            "DELETE FROM sync_queue
             WHERE user_id = ?1
               AND action != 'delete'
               AND note_id IN (
                 SELECT id FROM notes WHERE is_deleted = 1 AND user_id = ?1
               )",
            params![uid],
        );

        // 5. Deduplicate multiple pending entries for the same note
        let _ = conn.execute(
            "DELETE FROM sync_queue
             WHERE id NOT IN (
               SELECT MAX(id) FROM sync_queue WHERE status = 'pending' AND user_id = ?1 GROUP BY note_id
             ) AND status = 'pending' AND user_id = ?1",
            params![uid],
        );

        let pending_count = conn
            .query_row(
                "SELECT COUNT(*) FROM sync_queue WHERE status = 'pending' AND user_id = ?1",
                params![uid],
                |row| row.get::<_, i64>(0),
            )
            .unwrap_or(0);

        let last_synced_at = conn
            .query_row(
                "SELECT value FROM sync_metadata WHERE key = 'last_synced_at'",
                [],
                |row| row.get::<_, String>(0),
            )
            .ok()
            .and_then(|s| s.parse::<i64>().ok());

        let last_error = conn
            .query_row(
                "SELECT last_error FROM sync_queue WHERE status = 'pending' AND last_error IS NOT NULL ORDER BY updated_at DESC LIMIT 1",
                [],
                |row| row.get::<_, String>(0),
            )
            .ok();

        let state = if last_error.is_some() {
            "error".to_string()
        } else if pending_count > 0 {
            "pending".to_string()
        } else {
            "synced".to_string()
        };

        SyncStatusSummary {
            state,
            pending_count,
            last_synced_at,
            last_error,
            has_remote_changes: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::migrations::run_migrations;
    use rusqlite::Connection;

    #[test]
    fn test_sync_status_summary() {
        let mut conn = Connection::open_in_memory().unwrap();
        run_migrations(&mut conn).unwrap();

        // 1. Initial state with zero pending items
        let status = SyncEngine::get_sync_status(&conn, "user-abc");
        assert_eq!(status.state, "synced");
        assert_eq!(status.pending_count, 0);
        assert_eq!(status.last_synced_at, None);
        assert_eq!(status.last_error, None);

        // 2. Insert pending item
        let now = chrono::Utc::now().timestamp_millis();
        conn.execute(
            "INSERT INTO sync_queue (id, note_id, user_id, action, payload, status, retry_count, created_at, updated_at)
             VALUES ('q1', 'n1', 'user-abc', 'create', '{}', 'pending', 0, ?1, ?1)",
            rusqlite::params![now],
        ).unwrap();

        let status2 = SyncEngine::get_sync_status(&conn, "user-abc");
        assert_eq!(status2.state, "pending");
        assert_eq!(status2.pending_count, 1);

        // 3. Update with error
        conn.execute(
            "UPDATE sync_queue SET last_error = 'Network unreachable' WHERE id = 'q1'",
            [],
        ).unwrap();

        let status3 = SyncEngine::get_sync_status(&conn, "user-abc");
        assert_eq!(status3.state, "error");
        assert_eq!(status3.last_error.as_deref(), Some("Network unreachable"));
    }
}

