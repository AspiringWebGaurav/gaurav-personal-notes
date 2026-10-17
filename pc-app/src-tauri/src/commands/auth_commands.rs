use crate::auth::{AuthStatus, OAuthServer, SessionManager, UserSession};
use crate::AppState;
use std::time::Duration;
use tauri::{Emitter, State};

static ACTIVE_LOGIN_CANCEL: parking_lot::Mutex<Option<tokio::sync::oneshot::Sender<()>>> =
    parking_lot::Mutex::new(None);

#[tauri::command]
pub async fn cmd_get_auth_status(state: State<'_, AppState>) -> Result<AuthStatus, String> {
    let conn = state.db.get_connection();
    let session_opt = {
        let conn_guard = conn.lock();
        SessionManager::get_session(&conn_guard)?
    };

    match session_opt {
        Some(mut user) => {
            // Check if token has expired or is expiring within 5 minutes (300,000 ms)
            let now = chrono::Utc::now().timestamp_millis();
            let is_expired_or_close = user.expires_at.map_or(true, |exp| exp <= now + 300_000);

            if is_expired_or_close {
                if let Some(ref refresh_tok) = user.refresh_token {
                    let api_key_env = std::env::var("NEXT_PUBLIC_FIREBASE_API_KEY")
                        .or_else(|_| std::env::var("FIREBASE_API_KEY"))
                        .or_else(|_| std::env::var("VITE_FIREBASE_API_KEY"))
                        .unwrap_or_default();
                    let api_key = api_key_env.trim();
                    if !api_key.is_empty() {
                        match SessionManager::refresh_firebase_token(refresh_tok, api_key).await {
                            Ok((new_id, new_refresh, new_expires)) => {
                                user.id_token = Some(new_id);
                                user.refresh_token = Some(new_refresh);
                                user.expires_at = Some(new_expires);

                                let conn_guard = conn.lock();
                                let _ = SessionManager::save_session(&conn_guard, &user);
                            }
                            Err(e) => {
                                eprintln!("[GPN Auth] Auto-refresh notice (offline or network error): {}", e);
                                // Offline tolerance: do not kick user out! The session stays intact.
                            }
                        }
                    }
                }
            }

            *state.active_user_id.write() = user.uid.clone();
            crate::sync::SyncWorker::trigger_manual_sync(&state.sync_trigger, &state.manual_sync_trigger);
            Ok(AuthStatus {
                is_authenticated: true,
                user: Some(user),
            })
        }
        None => {
            *state.active_user_id.write() = "local_vault".to_string();
            Ok(AuthStatus {
                is_authenticated: false,
                user: None,
            })
        }
    }
}

fn migrate_and_queue_local_notes(conn: &rusqlite::Connection, user_id: &str) {
    let now = chrono::Utc::now().timestamp_millis();
    // 1. Reassign any unsigned local notes to this user, preserving local_only preferences
    let _ = conn.execute(
        "UPDATE notes SET user_id = ?1 WHERE user_id = 'local_vault' OR user_id = 'local-user'",
        rusqlite::params![user_id],
    );

    // 2. Mark notes that are not local_only as pending
    let _ = conn.execute(
        "UPDATE notes SET sync_state = 'pending' WHERE user_id = ?1 AND sync_state != 'local_only'",
        rusqlite::params![user_id],
    );

    // 3. For any pending notes not yet in the queue, add them
    if let Ok(mut stmt) = conn.prepare(
        "SELECT id, user_id, title, content, word_count, is_archived,
                created_at, updated_at, remote_updated_at, sync_version,
                sync_state, is_deleted, deleted_at
         FROM notes
         WHERE user_id = ?1 AND is_deleted = 0 AND sync_state != 'local_only' AND id NOT IN (SELECT note_id FROM sync_queue WHERE user_id = ?1)",
    ) {
        let notes: Vec<crate::models::LocalNote> = stmt
            .query_map([user_id], |row| {
                let is_archived_int: i64 = row.get("is_archived")?;
                let is_deleted_int: i64 = row.get("is_deleted")?;
                Ok(crate::models::LocalNote {
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
            })
            .map(|iter| iter.filter_map(|r| r.ok()).collect())
            .unwrap_or_default();

        for note in notes {
            let queue_id = uuid::Uuid::new_v4().to_string();
            let payload = serde_json::to_string(&note).unwrap_or_default();
            let _ = conn.execute(
                "INSERT INTO sync_queue (id, note_id, user_id, action, payload, status, retry_count, last_error, created_at, updated_at)
                 VALUES (?1, ?2, ?3, 'create', ?4, 'pending', 0, NULL, ?5, ?5)",
                rusqlite::params![queue_id, note.id, user_id, payload, now],
            );
        }
    }
}

#[tauri::command]
pub fn cmd_get_offline_notes_count(state: State<'_, AppState>) -> Result<i64, String> {
    let conn = state.db.get_connection();
    let conn_guard = conn.lock();
    let count: i64 = conn_guard
        .query_row(
            "SELECT COUNT(*) FROM notes WHERE (user_id = 'local_vault' OR user_id = 'local-user') AND is_deleted = 0",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);
    Ok(count)
}

#[tauri::command]
pub fn cmd_set_auth_session(
    state: State<'_, AppState>,
    session: UserSession,
    migrate_local: Option<bool>,
) -> Result<AuthStatus, String> {
    let conn = state.db.get_connection();
    let conn_guard = conn.lock();

    *state.active_user_id.write() = session.uid.clone();
    SessionManager::save_session(&conn_guard, &session)?;

    // Handle offline notes migration choice:
    match migrate_local {
        Some(true) | None => {
            migrate_and_queue_local_notes(&conn_guard, &session.uid);
        }
        Some(false) => {
            // Discard offline scratchpad so user mirrors only online account notes cleanly
            let _ = conn_guard.execute_batch(
                r#"
                DELETE FROM notes WHERE user_id = 'local_vault' OR user_id = 'local-user';
                DELETE FROM notes_fts WHERE id NOT IN (SELECT id FROM notes);
                DELETE FROM sync_queue WHERE user_id = 'local_vault' OR user_id = 'local-user';
                "#,
            );
        }
    }

    crate::sync::SyncWorker::trigger_manual_sync(&state.sync_trigger, &state.manual_sync_trigger);

    Ok(AuthStatus {
        is_authenticated: true,
        user: Some(session),
    })
}

#[tauri::command]
pub async fn cmd_refresh_auth_token(
    state: State<'_, AppState>,
    api_key: String,
) -> Result<AuthStatus, String> {
    let conn = state.db.get_connection();
    let user_opt = {
        let conn_guard = conn.lock();
        SessionManager::get_session(&conn_guard)?
    };

    if let Some(mut user) = user_opt {
        if let Some(ref refresh_tok) = user.refresh_token {
            let (new_id, new_refresh, expires_at) =
                SessionManager::refresh_firebase_token(refresh_tok, &api_key).await?;

            user.id_token = Some(new_id);
            user.refresh_token = Some(new_refresh);
            user.expires_at = Some(expires_at);

            let conn_guard = conn.lock();
            SessionManager::save_session(&conn_guard, &user)?;

            return Ok(AuthStatus {
                is_authenticated: true,
                user: Some(user),
            });
        }
        return Err("No refresh token available to refresh".to_string());
    }

    Ok(AuthStatus {
        is_authenticated: false,
        user: None,
    })
}

#[tauri::command]
pub fn cmd_cancel_loopback_login() -> Result<bool, String> {
    let mut cancel_guard = ACTIVE_LOGIN_CANCEL.lock();
    if let Some(cancel_tx) = cancel_guard.take() {
        let _ = cancel_tx.send(());
        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub fn cmd_logout(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    keep_local_data: Option<bool>,
) -> Result<AuthStatus, String> {
    // Anti-looping: abort any in-flight loopback login listener first
    let _ = cmd_cancel_loopback_login();

    let conn = state.db.get_connection();
    let conn_guard = conn.lock();

    let current_uid = state.active_user_id.read().clone();
    let should_keep = keep_local_data.unwrap_or(true);

    if let Ok(Some(session)) = SessionManager::get_session(&conn_guard) {
        let _ = crate::auth::CredentialStore::delete_tokens(&session.email);
    }

    SessionManager::clear_session(&conn_guard)?;
    *state.active_user_id.write() = "local_vault".to_string();

    if should_keep && current_uid != "local_vault" && !current_uid.is_empty() {
        // Reassign notes to local_vault and isolate them as local_only
        let _ = conn_guard.execute(
            r#"
            UPDATE notes 
            SET user_id = 'local_vault', 
                sync_state = 'local_only', 
                remote_updated_at = 0 
            WHERE user_id = ?1;
            "#,
            rusqlite::params![current_uid],
        );

        let _ = conn_guard.execute(
            "DELETE FROM sync_queue WHERE user_id = ?1",
            rusqlite::params![current_uid],
        );
    } else {
        // Fresh local account: purge all notes, FTS indexes, and sync queues
        let _ = conn_guard.execute_batch(
            r#"
            DELETE FROM notes;
            DELETE FROM notes_fts;
            DELETE FROM sync_queue;
            VACUUM;
            "#,
        );
    }

    let status = AuthStatus {
        is_authenticated: false,
        user: None,
    };
    let _ = app.emit("auth-state-changed", &status);

    Ok(status)
}

#[tauri::command]
pub async fn cmd_start_loopback_login(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    timeout_seconds: Option<u64>,
    migrate_local: Option<bool>,
    theme: Option<String>,
) -> Result<AuthStatus, String> {
    // Anti-looping: abort any active loopback listener before launching a new one
    {
        let mut cancel_guard = ACTIVE_LOGIN_CANCEL.lock();
        if let Some(old_cancel) = cancel_guard.take() {
            let _ = old_cancel.send(());
        }
    }

    let (cancel_tx, cancel_rx) = tokio::sync::oneshot::channel::<()>();
    {
        let mut cancel_guard = ACTIVE_LOGIN_CANCEL.lock();
        *cancel_guard = Some(cancel_tx);
    }

    let duration = Duration::from_secs(timeout_seconds.unwrap_or(120));
    let listen_result = OAuthServer::listen_for_callback(duration, theme, cancel_rx).await;

    // Clear active cancel sender once finished
    {
        let mut cancel_guard = ACTIVE_LOGIN_CANCEL.lock();
        *cancel_guard = None;
    }

    match listen_result {
        Ok((_port, session)) => {
            let conn = state.db.get_connection();
            let conn_guard = conn.lock();

            *state.active_user_id.write() = session.uid.clone();
            SessionManager::save_session(&conn_guard, &session)?;

            match migrate_local {
                Some(true) | None => {
                    migrate_and_queue_local_notes(&conn_guard, &session.uid);
                }
                Some(false) => {
                    let _ = conn_guard.execute_batch(
                        r#"
                        DELETE FROM notes WHERE user_id = 'local_vault' OR user_id = 'local-user';
                        DELETE FROM notes_fts WHERE id NOT IN (SELECT id FROM notes);
                        DELETE FROM sync_queue WHERE user_id = 'local_vault' OR user_id = 'local-user';
                        "#,
                    );
                }
            }

            crate::sync::SyncWorker::trigger_manual_sync(&state.sync_trigger, &state.manual_sync_trigger);

            let status = AuthStatus {
                is_authenticated: true,
                user: Some(session),
            };
            let _ = app.emit("auth-state-changed", &status);

            Ok(status)
        }
        Err(e) if e == "Login cancelled by user" => {
            // Cancellation lifecycle: user aborted, return unauthenticated state cleanly without error toast
            let conn = state.db.get_connection();
            let conn_guard = conn.lock();
            let session_opt = SessionManager::get_session(&conn_guard).unwrap_or(None);
            Ok(AuthStatus {
                is_authenticated: session_opt.is_some(),
                user: session_opt,
            })
        }
        Err(e) => Err(e),
    }
}
