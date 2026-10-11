use crate::models::{LocalNote, SyncQueueItem};
use chrono::Utc;
use parking_lot::Mutex;
use rusqlite::{params, Connection, OptionalExtension, Result, Row};
use std::sync::Arc;
use uuid::Uuid;

#[derive(Clone)]
pub struct NotesRepository {
    conn: Arc<Mutex<Connection>>,
}

impl NotesRepository {
    pub fn new(conn: Arc<Mutex<Connection>>) -> Self {
        Self { conn }
    }

    fn row_to_note(row: &Row) -> Result<LocalNote> {
        let is_archived_int: i64 = row.get("is_archived")?;
        let is_deleted_int: i64 = row.get("is_deleted")?;

        Ok(LocalNote {
            id: row.get("id")?,
            user_id: row.get("user_id")?,
            title: row.get("title")?,
            content: row.get("content")?,
            word_count: row.get("word_count")?,
            is_archived: is_archived_int != 0,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            remote_updated_at: row.get("remote_updated_at")?,
            sync_version: row.get("sync_version")?,
            sync_state: row.get("sync_state")?,
            is_deleted: is_deleted_int != 0,
            deleted_at: row.get("deleted_at")?,
        })
    }

    fn calculate_word_count(text: &str) -> i64 {
        let plain_text = text
            .split('<')
            .filter_map(|part| part.split_once('>').map(|(_, rest)| rest))
            .collect::<Vec<_>>()
            .join(" ");

        let source = if plain_text.trim().is_empty() {
            text
        } else {
            &plain_text
        };

        source
            .split_whitespace()
            .filter(|w| !w.is_empty())
            .count() as i64
    }

    pub fn create_note(
        &self,
        user_id: &str,
        title: &str,
        content: &str,
        custom_id: Option<String>,
    ) -> Result<LocalNote> {
        let conn = self.conn.lock();
        let now = Utc::now().timestamp_millis();
        let note_id = custom_id.unwrap_or_else(|| Uuid::new_v4().to_string());
        let word_count = Self::calculate_word_count(content);

        let note = LocalNote {
            id: note_id.clone(),
            user_id: user_id.to_string(),
            title: if title.trim().is_empty() {
                "Untitled Note".to_string()
            } else {
                title.trim().to_string()
            },
            content: content.to_string(),
            word_count,
            is_archived: false,
            created_at: now,
            updated_at: now,
            remote_updated_at: 0,
            sync_version: 1,
            sync_state: "pending".to_string(),
            is_deleted: false,
            deleted_at: None,
        };

        let queue_id = Uuid::new_v4().to_string();
        let payload = serde_json::to_string(&note).unwrap_or_default();

        conn.execute(
            r#"
            INSERT INTO notes (
                id, user_id, title, content, word_count, is_archived,
                created_at, updated_at, remote_updated_at, sync_version,
                sync_state, is_deleted, deleted_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
            "#,
            params![
                note.id,
                note.user_id,
                note.title,
                note.content,
                note.word_count,
                0,
                note.created_at,
                note.updated_at,
                note.remote_updated_at,
                note.sync_version,
                note.sync_state,
                0,
                note.deleted_at,
            ],
        )?;

        if user_id != "local_vault" && note.sync_state != "local_only" {
            conn.execute(
                r#"
                INSERT INTO sync_queue (
                    id, note_id, user_id, action, payload, status,
                    retry_count, last_error, created_at, updated_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
                "#,
                params![
                    queue_id,
                    note.id,
                    note.user_id,
                    "create",
                    payload,
                    "pending",
                    0,
                    None::<String>,
                    now,
                    now,
                ],
            )?;
        }

        Ok(note)
    }

    pub fn get_note(&self, id: &str) -> Result<Option<LocalNote>> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            r#"
            SELECT id, user_id, title, content, word_count, is_archived,
                   created_at, updated_at, remote_updated_at, sync_version,
                   sync_state, is_deleted, deleted_at
            FROM notes
            WHERE id = ?1 AND is_deleted = 0
            "#,
        )?;

        stmt.query_row([id], Self::row_to_note).optional()
    }

    pub fn list_notes(&self, user_id: &str, is_archived: bool) -> Result<Vec<LocalNote>> {
        let conn = self.conn.lock();
        let archived_flag = if is_archived { 1 } else { 0 };

        let mut stmt = conn.prepare(
            r#"
            SELECT id, user_id, title, content, word_count, is_archived,
                   created_at, updated_at, remote_updated_at, sync_version,
                   sync_state, is_deleted, deleted_at
            FROM notes
            WHERE user_id = ?1 AND is_archived = ?2 AND is_deleted = 0
            ORDER BY updated_at DESC
            "#,
        )?;

        let rows = stmt.query_map(params![user_id, archived_flag], Self::row_to_note)?;
        let mut notes = Vec::new();
        for row in rows {
            notes.push(row?);
        }

        Ok(notes)
    }

    pub fn update_note(
        &self,
        id: &str,
        user_id: &str,
        title: Option<&str>,
        content: Option<&str>,
        word_count: Option<i64>,
    ) -> Result<LocalNote> {
        let conn = self.conn.lock();
        let now = Utc::now().timestamp_millis();

        let mut fetch_stmt = conn.prepare(
            r#"
            SELECT id, user_id, title, content, word_count, is_archived,
                   created_at, updated_at, remote_updated_at, sync_version,
                   sync_state, is_deleted, deleted_at
            FROM notes
            WHERE id = ?1 AND user_id = ?2 AND is_deleted = 0
            "#,
        )?;

        let current_note = fetch_stmt.query_row(params![id, user_id], Self::row_to_note)?;

        let new_title = match title {
            Some(t) => {
                if t.trim().is_empty() {
                    "Untitled Note".to_string()
                } else {
                    t.trim().to_string()
                }
            }
            None => current_note.title,
        };

        let new_content = match content {
            Some(c) => c.to_string(),
            None => current_note.content,
        };

        let new_word_count = match word_count {
            Some(wc) => wc,
            None => Self::calculate_word_count(&new_content),
        };

        let is_local_only = current_note.sync_state == "local_only";
        let next_sync_state = if is_local_only {
            "local_only".to_string()
        } else {
            "pending".to_string()
        };

        let updated_note = LocalNote {
            id: id.to_string(),
            user_id: user_id.to_string(),
            title: new_title,
            content: new_content,
            word_count: new_word_count,
            is_archived: current_note.is_archived,
            created_at: current_note.created_at,
            updated_at: now,
            remote_updated_at: current_note.remote_updated_at,
            sync_version: current_note.sync_version + 1,
            sync_state: next_sync_state.clone(),
            is_deleted: false,
            deleted_at: None,
        };

        conn.execute(
            r#"
            UPDATE notes
            SET title = ?1,
                content = ?2,
                word_count = ?3,
                updated_at = ?4,
                sync_version = sync_version + 1,
                sync_state = ?5
            WHERE id = ?6 AND user_id = ?7 AND is_deleted = 0
            "#,
            params![
                updated_note.title,
                updated_note.content,
                updated_note.word_count,
                now,
                next_sync_state,
                id,
                user_id,
            ],
        )?;

        if user_id != "local_vault" && !is_local_only {
            let _ = conn.execute("DELETE FROM sync_queue WHERE note_id = ?1", params![id]);
            let queue_id = Uuid::new_v4().to_string();
            let payload = serde_json::to_string(&updated_note).unwrap_or_default();

            conn.execute(
                r#"
                INSERT INTO sync_queue (
                    id, note_id, user_id, action, payload, status,
                    retry_count, last_error, created_at, updated_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
                "#,
                params![
                    queue_id,
                    id,
                    user_id,
                    "update",
                    payload,
                    "pending",
                    0,
                    None::<String>,
                    now,
                    now,
                ],
            )?;
        }

        Ok(updated_note)
    }

    pub fn move_to_trash(&self, id: &str, user_id: &str) -> Result<()> {
        let conn = self.conn.lock();
        let now = Utc::now().timestamp_millis();

        conn.execute(
            r#"
            UPDATE notes
            SET is_archived = 1,
                updated_at = ?1,
                sync_version = sync_version + 1,
                sync_state = 'pending'
            WHERE id = ?2 AND user_id = ?3 AND is_deleted = 0
            "#,
            params![now, id, user_id],
        )?;

        let queue_id = Uuid::new_v4().to_string();
        let payload = serde_json::json!({
            "id": id,
            "isArchived": true,
            "updatedAt": now
        })
        .to_string();

        let _ = conn.execute("DELETE FROM sync_queue WHERE note_id = ?1", params![id]);

        conn.execute(
            r#"
            INSERT INTO sync_queue (
                id, note_id, user_id, action, payload, status,
                retry_count, last_error, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
            "#,
            params![
                queue_id,
                id,
                user_id,
                "archive",
                payload,
                "pending",
                0,
                None::<String>,
                now,
                now,
            ],
        )?;

        Ok(())
    }

    pub fn restore_from_trash(&self, id: &str, user_id: &str) -> Result<()> {
        let conn = self.conn.lock();
        let now = Utc::now().timestamp_millis();

        conn.execute(
            r#"
            UPDATE notes
            SET is_archived = 0,
                updated_at = ?1,
                sync_version = sync_version + 1,
                sync_state = 'pending'
            WHERE id = ?2 AND user_id = ?3 AND is_deleted = 0
            "#,
            params![now, id, user_id],
        )?;

        let queue_id = Uuid::new_v4().to_string();
        let payload = serde_json::json!({
            "id": id,
            "isArchived": false,
            "updatedAt": now
        })
        .to_string();

        let _ = conn.execute("DELETE FROM sync_queue WHERE note_id = ?1", params![id]);

        conn.execute(
            r#"
            INSERT INTO sync_queue (
                id, note_id, user_id, action, payload, status,
                retry_count, last_error, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
            "#,
            params![
                queue_id,
                id,
                user_id,
                "restore",
                payload,
                "pending",
                0,
                None::<String>,
                now,
                now,
            ],
        )?;

        Ok(())
    }

    pub fn delete_note_permanently(&self, id: &str, user_id: &str) -> Result<()> {
        let conn = self.conn.lock();
        let now = Utc::now().timestamp_millis();

        conn.execute(
            r#"
            UPDATE notes
            SET is_deleted = 1,
                deleted_at = ?1,
                updated_at = ?1,
                sync_version = sync_version + 1,
                sync_state = 'pending'
            WHERE id = ?2 AND user_id = ?3
            "#,
            params![now, id, user_id],
        )?;

        // Also clean up from FTS index
        conn.execute("DELETE FROM notes_fts WHERE id = ?1", [id])?;

        let queue_id = Uuid::new_v4().to_string();
        let payload = serde_json::json!({
            "id": id,
            "deleted": true,
            "deletedAt": now
        })
        .to_string();

        let _ = conn.execute("DELETE FROM sync_queue WHERE note_id = ?1", params![id]);

        conn.execute(
            r#"
            INSERT INTO sync_queue (
                id, note_id, user_id, action, payload, status,
                retry_count, last_error, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
            "#,
            params![
                queue_id,
                id,
                user_id,
                "delete",
                payload,
                "pending",
                0,
                None::<String>,
                now,
                now,
            ],
        )?;

        Ok(())
    }

    pub fn empty_trash(&self, user_id: &str) -> Result<usize> {
        let conn = self.conn.lock();
        let now = Utc::now().timestamp_millis();

        let mut stmt = conn.prepare(
            r#"
            SELECT id FROM notes
            WHERE user_id = ?1 AND is_archived = 1 AND is_deleted = 0
            "#,
        )?;

        let note_ids: Vec<String> = stmt
            .query_map([user_id], |row| row.get(0))?
            .filter_map(|r| r.ok())
            .collect();

        let count = note_ids.len();

        for id in &note_ids {
            conn.execute(
                r#"
                UPDATE notes
                SET is_deleted = 1,
                    deleted_at = ?1,
                    updated_at = ?1,
                    sync_version = sync_version + 1,
                    sync_state = 'pending'
                WHERE id = ?2 AND user_id = ?3
                "#,
                params![now, id, user_id],
            )?;

            conn.execute("DELETE FROM notes_fts WHERE id = ?1", [id])?;

            let queue_id = Uuid::new_v4().to_string();
            let payload = serde_json::json!({
                "id": id,
                "deleted": true,
                "deletedAt": now
            })
            .to_string();

            conn.execute(
                r#"
                INSERT INTO sync_queue (
                    id, note_id, user_id, action, payload, status,
                    retry_count, last_error, created_at, updated_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
                "#,
                params![
                    queue_id,
                    id,
                    user_id,
                    "delete",
                    payload,
                    "pending",
                    0,
                    None::<String>,
                    now,
                    now,
                ],
            )?;
        }

        Ok(count)
    }

    pub fn set_note_sync_mode(
        &self,
        id: &str,
        user_id: &str,
        is_local_only: bool,
    ) -> Result<LocalNote> {
        let conn = self.conn.lock();
        let now = Utc::now().timestamp_millis();
        let sync_state = if is_local_only { "local_only" } else { "pending" };

        conn.execute(
            "UPDATE notes SET sync_state = ?1, updated_at = ?2 WHERE id = ?3 AND user_id = ?4",
            params![sync_state, now, id, user_id],
        )?;

        if is_local_only {
            let _ = conn.execute("DELETE FROM sync_queue WHERE note_id = ?1", params![id]);
        } else if user_id != "local_vault" {
            let mut stmt = conn.prepare(
                "SELECT id, user_id, title, content, word_count, is_archived,
                        created_at, updated_at, remote_updated_at, sync_version,
                        sync_state, is_deleted, deleted_at
                 FROM notes WHERE id = ?1",
            )?;
            if let Ok(note) = stmt.query_row([id], Self::row_to_note) {
                let queue_id = Uuid::new_v4().to_string();
                let payload = serde_json::to_string(&note).unwrap_or_default();
                let _ = conn.execute(
                    "INSERT INTO sync_queue (id, note_id, user_id, action, payload, status, retry_count, last_error, created_at, updated_at)
                     VALUES (?1, ?2, ?3, 'create', ?4, 'pending', 0, NULL, ?5, ?5)",
                    params![queue_id, id, user_id, payload, now],
                );
            }
        }

        let mut stmt = conn.prepare(
            "SELECT id, user_id, title, content, word_count, is_archived,
                    created_at, updated_at, remote_updated_at, sync_version,
                    sync_state, is_deleted, deleted_at
             FROM notes WHERE id = ?1",
        )?;
        stmt.query_row([id], Self::row_to_note)
    }

    pub fn search_notes(
        &self,
        user_id: &str,
        query_text: &str,
        is_archived: bool,
    ) -> Result<Vec<LocalNote>> {
        let trimmed = query_text.trim();
        if trimmed.is_empty() {
            return self.list_notes(user_id, is_archived);
        }

        let conn = self.conn.lock();
        let archived_flag = if is_archived { 1 } else { 0 };

        // Clean user input for FTS5 prefix match
        // E.g. "rust notes" -> "rust* notes*"
        let sanitized_tokens: Vec<String> = trimmed
            .split_whitespace()
            .map(|word| {
                let clean = word
                    .chars()
                    .filter(|c| c.is_alphanumeric())
                    .collect::<String>();
                format!("\"{}\"*", clean)
            })
            .filter(|w| w.len() > 3) // length > 3 means more than just quotes and asterisk
            .collect();

        let fts_query = if sanitized_tokens.is_empty() {
            format!("\"{}\"*", trimmed.replace('\"', ""))
        } else {
            sanitized_tokens.join(" AND ")
        };

        let stmt = conn.prepare(
            r#"
            SELECT n.id, n.user_id, n.title, n.content, n.word_count, n.is_archived,
                   n.created_at, n.updated_at, n.remote_updated_at, n.sync_version,
                   n.sync_state, n.is_deleted, n.deleted_at
            FROM notes n
            JOIN notes_fts fts ON n.id = fts.id
            WHERE n.user_id = ?1 AND n.is_archived = ?2 AND n.is_deleted = 0
              AND notes_fts MATCH ?3
            ORDER BY bm25(notes_fts) ASC, n.updated_at DESC
            "#,
        );

        match stmt {
            Ok(mut query_stmt) => {
                let rows = query_stmt.query_map(
                    params![user_id, archived_flag, fts_query],
                    Self::row_to_note,
                );

                match rows {
                    Ok(mapped) => {
                        let mut results = Vec::new();
                        for note in mapped {
                            if let Ok(n) = note {
                                results.push(n);
                            }
                        }
                        Ok(results)
                    }
                    Err(_) => self.fallback_like_search(&conn, user_id, trimmed, archived_flag),
                }
            }
            Err(_) => self.fallback_like_search(&conn, user_id, trimmed, archived_flag),
        }
    }

    fn fallback_like_search(
        &self,
        conn: &Connection,
        user_id: &str,
        query: &str,
        archived_flag: i64,
    ) -> Result<Vec<LocalNote>> {
        let pattern = format!("%{}%", query);
        let mut stmt = conn.prepare(
            r#"
            SELECT id, user_id, title, content, word_count, is_archived,
                   created_at, updated_at, remote_updated_at, sync_version,
                   sync_state, is_deleted, deleted_at
            FROM notes
            WHERE user_id = ?1 AND is_archived = ?2 AND is_deleted = 0
              AND (title LIKE ?3 OR content LIKE ?3)
            ORDER BY updated_at DESC
            "#,
        )?;

        let rows = stmt.query_map(params![user_id, archived_flag, pattern], Self::row_to_note)?;
        let mut notes = Vec::new();
        for row in rows {
            notes.push(row?);
        }
        Ok(notes)
    }

    pub fn get_pending_sync_items(&self, limit: usize) -> Result<Vec<SyncQueueItem>> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(
            r#"
            SELECT id, note_id, user_id, action, payload, status,
                   retry_count, last_error, created_at, updated_at
            FROM sync_queue
            WHERE status = 'pending'
            ORDER BY created_at ASC
            LIMIT ?1
            "#,
        )?;

        let rows = stmt.query_map([limit as i64], |row| {
            Ok(SyncQueueItem {
                id: row.get("id")?,
                note_id: row.get("note_id")?,
                user_id: row.get("user_id")?,
                action: row.get("action")?,
                payload: row.get("payload")?,
                status: row.get("status")?,
                retry_count: row.get("retry_count")?,
                last_error: row.get("last_error")?,
                created_at: row.get("created_at")?,
                updated_at: row.get("updated_at")?,
            })
        })?;

        let mut items = Vec::new();
        for item in rows {
            items.push(item?);
        }
        Ok(items)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::DatabaseManager;

    fn setup_test_repo() -> NotesRepository {
        let db = DatabaseManager::new_in_memory().expect("Failed to initialize in-memory DB");
        NotesRepository::new(db.get_connection())
    }

    #[test]
    fn test_create_and_get_note() {
        let repo = setup_test_repo();
        let note = repo
            .create_note("user-1", "Test Title", "<p>Hello world content</p>", None)
            .expect("Failed to create note");

        assert_eq!(note.title, "Test Title");
        assert_eq!(note.content, "<p>Hello world content</p>");
        assert_eq!(note.word_count, 3);
        assert!(!note.is_archived);
        assert_eq!(note.sync_state, "pending");

        let fetched = repo.get_note(&note.id).expect("Failed to get note");
        assert!(fetched.is_some());
        let fetched_note = fetched.unwrap();
        assert_eq!(fetched_note.id, note.id);
        assert_eq!(fetched_note.title, "Test Title");
    }

    #[test]
    fn test_list_notes_and_archived_filtering() {
        let repo = setup_test_repo();
        let note1 = repo
            .create_note("user-1", "Active Note 1", "Content 1", None)
            .unwrap();
        let note2 = repo
            .create_note("user-1", "Active Note 2", "Content 2", None)
            .unwrap();

        let active_notes = repo.list_notes("user-1", false).unwrap();
        assert_eq!(active_notes.len(), 2);

        // Move note1 to trash
        repo.move_to_trash(&note1.id, "user-1").unwrap();

        let active_after = repo.list_notes("user-1", false).unwrap();
        assert_eq!(active_after.len(), 1);
        assert_eq!(active_after[0].id, note2.id);

        let archived = repo.list_notes("user-1", true).unwrap();
        assert_eq!(archived.len(), 1);
        assert_eq!(archived[0].id, note1.id);

        // Restore note1
        repo.restore_from_trash(&note1.id, "user-1").unwrap();
        let restored_active = repo.list_notes("user-1", false).unwrap();
        assert_eq!(restored_active.len(), 2);
    }

    #[test]
    fn test_update_note() {
        let repo = setup_test_repo();
        let note = repo
            .create_note("user-1", "Original Title", "Original Content", None)
            .unwrap();

        let updated = repo
            .update_note(
                &note.id,
                "user-1",
                Some("Updated Title"),
                Some("Updated Content with more words here"),
                None,
            )
            .unwrap();

        assert_eq!(updated.title, "Updated Title");
        assert_eq!(updated.content, "Updated Content with more words here");
        assert_eq!(updated.word_count, 6);
        assert_eq!(updated.sync_version, 2);

        let fetched = repo.get_note(&note.id).unwrap().unwrap();
        assert_eq!(fetched.title, "Updated Title");
    }

    #[test]
    fn test_empty_trash() {
        let repo = setup_test_repo();
        let n1 = repo.create_note("user-1", "Note 1", "C1", None).unwrap();
        let n2 = repo.create_note("user-1", "Note 2", "C2", None).unwrap();
        let _n3 = repo.create_note("user-1", "Note 3", "C3", None).unwrap();

        repo.move_to_trash(&n1.id, "user-1").unwrap();
        repo.move_to_trash(&n2.id, "user-1").unwrap();

        let purged = repo.empty_trash("user-1").unwrap();
        assert_eq!(purged, 2);

        let archived_after = repo.list_notes("user-1", true).unwrap();
        assert_eq!(archived_after.len(), 0);

        // Active note 3 is untouched
        let active = repo.list_notes("user-1", false).unwrap();
        assert_eq!(active.len(), 1);
    }

    #[test]
    fn test_fts5_full_text_search() {
        let repo = setup_test_repo();
        repo.create_note(
            "user-1",
            "Meeting with Alice",
            "Discussing quarterly roadmap and deliverables",
            None,
        )
        .unwrap();

        repo.create_note(
            "user-1",
            "Shopping list",
            "Buy organic milk, sourdough bread, and coffee beans",
            None,
        )
        .unwrap();

        repo.create_note(
            "user-1",
            "Rust Programming Tips",
            "Memory safety and zero cost abstractions in Rust",
            None,
        )
        .unwrap();

        // Search by title keyword
        let results = repo.search_notes("user-1", "Alice", false).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].title, "Meeting with Alice");

        // Search by content keyword
        let results_coffee = repo.search_notes("user-1", "coffee", false).unwrap();
        assert_eq!(results_coffee.len(), 1);
        assert_eq!(results_coffee[0].title, "Shopping list");

        // Search by prefix
        let results_prefix = repo.search_notes("user-1", "quarter", false).unwrap();
        assert_eq!(results_prefix.len(), 1);
        assert_eq!(results_prefix[0].title, "Meeting with Alice");

        // Search with no results
        let no_results = repo.search_notes("user-1", "nonexistent", false).unwrap();
        assert_eq!(no_results.len(), 0);
    }

    #[test]
    fn test_sync_queue_durability() {
        let repo = setup_test_repo();
        let note = repo
            .create_note("user-1", "Sync Test", "Sync payload", None)
            .unwrap();

        let queue_items = repo.get_pending_sync_items(10).unwrap();
        assert_eq!(queue_items.len(), 1);
        assert_eq!(queue_items[0].note_id, note.id);
        assert_eq!(queue_items[0].action, "create");
        assert_eq!(queue_items[0].status, "pending");

        // Update note
        repo.update_note(&note.id, "user-1", Some("Sync Test v2"), None, None)
            .unwrap();

        let queue_after_update = repo.get_pending_sync_items(10).unwrap();
        assert_eq!(queue_after_update.len(), 2);
        assert_eq!(queue_after_update[1].action, "update");
    }
}

