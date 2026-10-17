use super::engine::SyncEngine;
use super::models::SyncStatusSummary;
use crate::auth::CredentialStore;
use rusqlite::Connection;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::sync::Notify;
use tokio_util::sync::CancellationToken;

fn compute_backoff_delay(consecutive_failures: u32) -> Duration {
    if consecutive_failures == 0 {
        return Duration::from_secs(0);
    }
    // Delay = min(60s, 2 * 2^min(n-1, 5)s) + rand(0, 1000ms)
    let exponent = (consecutive_failures - 1).min(5);
    let base_secs = (2u64 * (1u64 << exponent)).min(60);
    let jitter_ms = (chrono::Utc::now().timestamp_subsec_millis() as u64) % 1000;
    Duration::from_millis(base_secs * 1000 + jitter_ms)
}

pub struct SyncWorker {
    engine: SyncEngine,
    conn: Arc<parking_lot::Mutex<Connection>>,
    active_user_id: Arc<parking_lot::RwLock<String>>,
    trigger: Arc<Notify>,
    manual_flag: Arc<AtomicBool>,
    pull_flag: Arc<AtomicBool>,
    cancel_token: CancellationToken,
}

impl SyncWorker {
    pub fn new(
        project_id: String,
        conn: Arc<parking_lot::Mutex<Connection>>,
        active_user_id: Arc<parking_lot::RwLock<String>>,
    ) -> (Self, Arc<Notify>, Arc<AtomicBool>, Arc<AtomicBool>, CancellationToken) {
        let trigger = Arc::new(Notify::new());
        let manual_flag = Arc::new(AtomicBool::new(false));
        let pull_flag = Arc::new(AtomicBool::new(false));
        let cancel_token = CancellationToken::new();
        let engine = SyncEngine::new(project_id);

        let worker = Self {
            engine,
            conn,
            active_user_id,
            trigger: trigger.clone(),
            manual_flag: manual_flag.clone(),
            pull_flag: pull_flag.clone(),
            cancel_token: cancel_token.clone(),
        };

        (worker, trigger, manual_flag, pull_flag, cancel_token)
    }

    /// Triggers a quiet background push for pending mutations (0 Firestore reads)
    pub fn trigger_sync(trigger: &Arc<Notify>) {
        trigger.notify_one();
    }

    /// Triggers an explicit manual sync (user clicked "Sync Now" with visual UI indicator)
    pub fn trigger_manual_sync(trigger: &Arc<Notify>, manual_flag: &Arc<AtomicBool>) {
        manual_flag.store(true, Ordering::SeqCst);
        trigger.notify_one();
    }

    /// Triggers a quiet event-driven remote pull (e.g. window focus, app resume, online reconnect)
    pub fn trigger_pull_sync(trigger: &Arc<Notify>, pull_flag: &Arc<AtomicBool>) {
        pull_flag.store(true, Ordering::SeqCst);
        trigger.notify_one();
    }

    /// Starts the background sync loop (100% Event-Driven Emission, Zero Dumb Polling)
    pub fn start(self, app_handle: Option<AppHandle>) {
        let cancel_token = self.cancel_token.clone();

        tauri::async_runtime::spawn(async move {
            let mut consecutive_failures: u32 = 0;

            loop {
                // If previous attempt failed, apply exponential backoff before retrying
                if consecutive_failures > 0 {
                    let backoff = compute_backoff_delay(consecutive_failures);
                    tokio::select! {
                        _ = cancel_token.cancelled() => {
                            eprintln!("[GPN Sync] Graceful shutdown during backoff; exiting sync loop.");
                            break;
                        }
                        _ = tokio::time::sleep(backoff) => {}
                    }
                }

                // 100% EVENT-DRIVEN: Sleeps with zero CPU & zero network until an explicit event arrives
                tokio::select! {
                    _ = cancel_token.cancelled() => {
                        eprintln!("[GPN Sync] Graceful shutdown received; exiting sync loop.");
                        break;
                    }
                    _ = self.trigger.notified() => {}
                };

                let is_manual = self.manual_flag.swap(false, Ordering::SeqCst);
                let is_pull = self.pull_flag.swap(false, Ordering::SeqCst);

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
                        // EVENT-DRIVEN QUOTA ENGINE:
                        // 1. force_pull is true ONLY when explicitly requested (manual button OR window focus / resume event).
                        // 2. Local note editing notifications only execute the PUSH phase (0 Firestore reads!).
                        // 3. We NEVER emit the blinking "syncing" event for quiet background pushes or focus syncs.
                        let force_pull = is_manual || is_pull;

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

                        match res {
                            Ok(summary) => {
                                consecutive_failures = 0;
                                if let Some(ref handle) = app_handle {
                                    let _ = handle.emit("sync-status-changed", summary);
                                }
                            }
                            Err(err) => {
                                consecutive_failures = consecutive_failures.saturating_add(1);
                                let backoff = compute_backoff_delay(consecutive_failures);
                                eprintln!(
                                    "[GPN Sync] Cycle failure #{}: {}. Backing off for {:.2}s",
                                    consecutive_failures,
                                    err,
                                    backoff.as_secs_f32()
                                );
                                if is_manual {
                                    if let Some(ref handle) = app_handle {
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

