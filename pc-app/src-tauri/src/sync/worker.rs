use super::engine::SyncEngine;
use super::models::SyncStatusSummary;
use crate::auth::CredentialStore;
use rusqlite::Connection;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::sync::Notify;

pub struct SyncWorker {
    engine: SyncEngine,
    conn: Arc<parking_lot::Mutex<Connection>>,
    active_user_id: Arc<parking_lot::RwLock<String>>,
    trigger: Arc<Notify>,
    manual_flag: Arc<AtomicBool>,
}

impl SyncWorker {
    pub fn new(
        project_id: String,
        conn: Arc<parking_lot::Mutex<Connection>>,
        active_user_id: Arc<parking_lot::RwLock<String>>,
    ) -> (Self, Arc<Notify>, Arc<AtomicBool>) {
        let trigger = Arc::new(Notify::new());
        let manual_flag = Arc::new(AtomicBool::new(false));
        let engine = SyncEngine::new(project_id);

        let worker = Self {
            engine,
            conn,
            active_user_id,
            trigger: trigger.clone(),
            manual_flag: manual_flag.clone(),
        };

        (worker, trigger, manual_flag)
    }

    /// Triggers a quiet background push for pending mutations (0 Firestore reads)
    pub fn trigger_sync(trigger: &Arc<Notify>) {
        trigger.notify_one();
    }

    /// Triggers an explicit manual sync (user clicked "Sync Now" or fresh login)
    pub fn trigger_manual_sync(trigger: &Arc<Notify>, manual_flag: &Arc<AtomicBool>) {
        manual_flag.store(true, Ordering::SeqCst);
        trigger.notify_one();
    }

    /// Starts the background sync loop
    pub fn start(self, app_handle: Option<AppHandle>) {
        tauri::async_runtime::spawn(async move {
            // Calm 5-minute interval to prevent burning CPU & Firestore read quota
            let mut interval = tokio::time::interval(Duration::from_secs(300));
            interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

            loop {
                let is_trigger_notification = tokio::select! {
                    _ = interval.tick() => false,
                    _ = self.trigger.notified() => true,
                };

                let is_manual = self.manual_flag.swap(false, Ordering::SeqCst);

                let uid = self.active_user_id.read().clone();
                if uid == "local_vault" || uid == "local-user" || uid.is_empty() {
                    // Running in local/offline mode, zero cloud sync needed
                    continue;
                }

                // Look up session with tokens directly from SQLite app_settings
                let session = {
                    let conn = self.conn.lock();
                    crate::auth::SessionManager::get_session(&conn)
                        .ok()
                        .flatten()
                };

                let (email, mut id_token, refresh_token) = match session {
                    Some(s) => (s.email, s.id_token, s.refresh_token),
                    None => continue,
                };

                // If id_token is missing or empty but refresh_token exists, refresh safely
                if id_token.is_none() || id_token.as_ref().map_or(true, |t| t.is_empty()) {
                    if let Some(ref ref_tok) = refresh_token {
                        let api_key_env = std::env::var("NEXT_PUBLIC_FIREBASE_API_KEY")
                            .or_else(|_| std::env::var("FIREBASE_API_KEY"))
                            .or_else(|_| std::env::var("VITE_FIREBASE_API_KEY"))
                            .unwrap_or_default();
                        if !api_key_env.trim().is_empty() {
                            if let Ok((new_id, new_ref, expires_at)) =
                                crate::auth::SessionManager::refresh_firebase_token(ref_tok, &api_key_env).await
                            {
                                let conn = self.conn.lock();
                                if let Ok(Some(mut session)) = crate::auth::SessionManager::get_session(&conn) {
                                    session.id_token = Some(new_id.clone());
                                    session.refresh_token = Some(new_ref);
                                    session.expires_at = Some(expires_at);
                                    let _ = crate::auth::SessionManager::save_session(&conn, &session);
                                }
                                id_token = Some(new_id);
                            }
                        }
                    }
                }

                if let Some(token) = id_token {
                    if !token.is_empty() {
                        // QUOTA & UI FIX:
                        // 1. force_pull is true ONLY for manual requests (e.g. Sync Now button) or periodic 5-minute ticks.
                        // 2. Local note editing notifications only execute the PUSH phase (0 Firestore reads!).
                        // 3. We NEVER emit the blinking "syncing" event for quiet background pushes.
                        let force_pull = is_manual || !is_trigger_notification;

                        if is_manual {
                            if let Some(ref handle) = app_handle {
                                let syncing_summary = SyncStatusSummary {
                                    state: "syncing".to_string(),
                                    pending_count: 0,
                                    last_synced_at: None,
                                    last_error: None,
                                    has_remote_changes: Some(false),
                                };
                                let _ = handle.emit("sync-status-changed", syncing_summary);
                            }
                        }

                        let mut res = self
                            .engine
                            .run_sync_cycle(self.conn.clone(), &uid, &token, force_pull)
                            .await;

                        // Automatic token refresh retry on unauthorized / 401
                        if let Err(ref err) = res {
                            if err.contains("401") || err.contains("UNAUTHENTICATED") || err.contains("Unauthorized") {
                                if let Some(ref ref_tok) = refresh_token {
                                    let api_key_env = std::env::var("NEXT_PUBLIC_FIREBASE_API_KEY")
                                        .or_else(|_| std::env::var("FIREBASE_API_KEY"))
                                        .or_else(|_| std::env::var("VITE_FIREBASE_API_KEY"))
                                        .unwrap_or_default();
                                    if !api_key_env.trim().is_empty() {
                                        if let Ok((new_id, new_ref, expires_at)) =
                                            crate::auth::SessionManager::refresh_firebase_token(ref_tok, &api_key_env).await
                                        {
                                            let _ = CredentialStore::save_tokens(&email, &new_ref, &new_id);
                                            {
                                                let conn = self.conn.lock();
                                                if let Ok(Some(mut session)) = crate::auth::SessionManager::get_session(&conn) {
                                                    session.id_token = Some(new_id.clone());
                                                    session.refresh_token = Some(new_ref);
                                                    session.expires_at = Some(expires_at);
                                                    let _ = crate::auth::SessionManager::save_session(&conn, &session);
                                                }
                                            }
                                            // Retry sync cycle with fresh ID token
                                            res = self
                                                .engine
                                                .run_sync_cycle(self.conn.clone(), &uid, &new_id, force_pull)
                                                .await;
                                        }
                                    }
                                }
                            }
                        }

                        if let Some(ref handle) = app_handle {
                            match res {
                                Ok(summary) => {
                                    let _ = handle.emit("sync-status-changed", summary);
                                }
                                Err(err) => {
                                    if is_manual {
                                        let summary = SyncStatusSummary {
                                            state: "error".to_string(),
                                            pending_count: 0,
                                            last_synced_at: None,
                                            last_error: Some(err),
                                            has_remote_changes: Some(false),
                                        };
                                        let _ = handle.emit("sync-status-changed", summary);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    }
}
