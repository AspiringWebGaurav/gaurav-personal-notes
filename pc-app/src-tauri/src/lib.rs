pub mod auth;
pub mod commands;
pub mod db;
pub mod models;
pub mod repository;
pub mod sync;
pub mod tray;

use auth::SessionManager;
use commands::*;
use db::DatabaseManager;
use repository::NotesRepository;
use std::sync::Arc;
use sync::SyncWorker;
use tauri::{Emitter, Manager};
use tokio::sync::Notify;

pub struct AppState {
    pub db: DatabaseManager,
    pub notes_repo: NotesRepository,
    pub active_user_id: Arc<parking_lot::RwLock<String>>,
    pub sync_trigger: Arc<Notify>,
    pub manual_sync_trigger: Arc<std::sync::atomic::AtomicBool>,
    pub _tray: Option<tauri::tray::TrayIcon>,
}

fn load_local_env() {
    let mut candidate_paths = vec![
        std::path::PathBuf::from(".env.local"),
        std::path::PathBuf::from(".env"),
        std::path::PathBuf::from("../.env.local"),
        std::path::PathBuf::from("../.env"),
        std::path::PathBuf::from("../../.env.local"),
        std::path::PathBuf::from("../../.env"),
    ];

    if let Ok(curr) = std::env::current_dir() {
        candidate_paths.push(curr.join(".env.local"));
        candidate_paths.push(curr.join(".env"));
        if let Some(parent) = curr.parent() {
            candidate_paths.push(parent.join(".env.local"));
            candidate_paths.push(parent.join(".env"));
            if let Some(grandparent) = parent.parent() {
                candidate_paths.push(grandparent.join(".env.local"));
                candidate_paths.push(grandparent.join(".env"));
            }
        }
    }

    for path in &candidate_paths {
        if let Ok(content) = std::fs::read_to_string(path) {
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.is_empty() || trimmed.starts_with('#') {
                    continue;
                }
                if let Some((key, val)) = trimmed.split_once('=') {
                    let key = key.trim();
                    let val = val.trim().trim_matches('"').trim_matches('\'');
                    if !key.is_empty() {
                        if std::env::var(key).is_err() {
                            std::env::set_var(key, val);
                        }
                        if key == "VITE_FIREBASE_API_KEY" {
                            if std::env::var("NEXT_PUBLIC_FIREBASE_API_KEY").is_err() {
                                std::env::set_var("NEXT_PUBLIC_FIREBASE_API_KEY", val);
                            }
                            if std::env::var("FIREBASE_API_KEY").is_err() {
                                std::env::set_var("FIREBASE_API_KEY", val);
                            }
                        }
                    }
                }
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    load_local_env();

    #[cfg(target_os = "windows")]
    {
        // Explicit Application User Model ID for Windows 10 & 11 Action Center & Taskbar
        use std::os::windows::ffi::OsStrExt;
        let aumid: Vec<u16> = std::ffi::OsStr::new("com.gpn.desktop")
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();
        extern "system" {
            fn SetCurrentProcessExplicitAppUserModelID(AppID: *const u16) -> i32;
        }
        unsafe {
            let _ = SetCurrentProcessExplicitAppUserModelID(aumid.as_ptr());
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            Default::default(),
            Some(vec!["--autostart"]),
        ))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        let main_win = app.get_webview_window("main");
                        let is_main_visible = main_win
                            .as_ref()
                            .and_then(|w| w.is_visible().ok())
                            .unwrap_or(false);

                        if is_main_visible {
                            if let Some(w) = main_win {
                                let _ = w.set_focus();
                                let _ = w.emit("open-quick-capture", false);
                            }
                        } else {
                            if let Some(cap_win) = app.get_webview_window("capture") {
                                let _ = cap_win.show();
                                let _ = cap_win.unminimize();
                                let _ = cap_win.set_always_on_top(true);
                                let _ = cap_win.set_focus();
                                let _ = cap_win.emit("open-quick-capture", true);
                            } else if let Some(w) = main_win {
                                let _ = w.show();
                                let _ = w.unminimize();
                                let _ = w.set_always_on_top(true);
                                let _ = w.set_focus();
                                let _ = w.emit("open-quick-capture", true);
                            }
                        }
                    }
                })
                .build(),
        )
        .setup(|app| {
            use tauri_plugin_global_shortcut::GlobalShortcutExt;
            let gs = app.global_shortcut();
            let _ = gs.unregister("ctrl+shift+n");
            let _ = gs.unregister("alt+shift+n");
            let _ = gs.unregister("ctrl+shift+c");
            let _ = gs.unregister("alt+shift+c");

            let reg_csn = gs.register("ctrl+shift+n");
            let reg_asn = gs.register("alt+shift+n");
            let reg_csc = gs.register("ctrl+shift+c");
            let reg_asc = gs.register("alt+shift+c");

            if reg_csn.is_ok() || reg_asn.is_ok() || reg_csc.is_ok() || reg_asc.is_ok() {
                eprintln!("[GPN Setup] Global capture shortcuts active (Ctrl+Shift+N / Ctrl+Shift+C).");
            } else {
                eprintln!("[GPN Setup] Warning: Could not register global shortcuts: {:?}", reg_csn.err());
            }
            let app_data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::path::PathBuf::from("."));
            let db_path = app_data_dir.join("gpn_local.db");

            // Multi-tier resilient database initialization:
            // 1. Primary AppData directory
            // 2. Temp directory fallback (if AppData write permission denied)
            // 3. In-memory database fallback (if all file writes restricted)
            let db = match DatabaseManager::new_at_path(&db_path) {
                Ok(database) => database,
                Err(err) => {
                    eprintln!(
                        "[GPN DB] Warning: Cannot open primary database at {:?}: {}. Falling back to temp directory...",
                        db_path, err
                    );
                    let temp_db_dir = std::env::temp_dir().join("com.gpn.desktop");
                    let _ = std::fs::create_dir_all(&temp_db_dir);
                    let temp_db_path = temp_db_dir.join("gpn_local.db");
                    match DatabaseManager::new_at_path(&temp_db_path) {
                        Ok(database) => {
                            eprintln!("[GPN DB] Resilient fallback: opened database at {:?}", temp_db_path);
                            database
                        }
                        Err(err2) => {
                            eprintln!(
                                "[GPN DB] Warning: Temp database also failed: {}. Falling back to in-memory database...",
                                err2
                            );
                            DatabaseManager::new_in_memory().unwrap_or_else(|_| {
                                panic!("Fatal: Could not initialize in-memory fallback database")
                            })
                        }
                    }
                }
            };
            let notes_repo = NotesRepository::new(db.get_connection());

            let initial_user_id = {
                let conn = db.get_connection();
                let guard = conn.lock();
                if let Ok(Some(session)) = SessionManager::get_session(&guard) {
                    session.uid
                } else {
                    SessionManager::get_active_user_id(&guard)
                }
            };
            let active_user_id = Arc::new(parking_lot::RwLock::new(initial_user_id));

            let project_id = "gaurav-personal-notes".to_string();
            let (worker, sync_trigger, manual_sync_trigger) = SyncWorker::new(
                project_id,
                db.get_connection(),
                active_user_id.clone(),
            );

            // Start the background sync loop
            worker.start(Some(app.handle().clone()));

            // Immediately trigger cloud mirror sync if user is already authenticated
            {
                let uid = active_user_id.read().clone();
                if uid != "local_vault" && uid != "local-user" && !uid.is_empty() {
                    SyncWorker::trigger_manual_sync(&sync_trigger, &manual_sync_trigger);
                }
            }

            // Setup system tray and keep it alive in state
            let _tray = match tray::setup_system_tray(app.handle()) {
                Ok(t) => {
                    eprintln!("[GPN Setup] System tray icon registered successfully!");
                    Some(t)
                }
                Err(e) => {
                    eprintln!("[GPN Setup] Error setting up system tray: {:?}", e);
                    None
                }
            };

            // Ensure main window is displayed unless started silently via Windows Startup
            let is_autostart_boot = std::env::args().any(|arg| arg == "--autostart" || arg == "--minimized");
            if let Some(window) = app.get_webview_window("main") {
                if !is_autostart_boot {
                    eprintln!("[GPN Setup] Normal launch: calling show() and set_focus()...");
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                } else {
                    eprintln!("[GPN Setup] Started via Windows Startup (--autostart): running silently in system tray.");
                    let _ = window.hide();
                }
            } else {
                eprintln!("[GPN Setup] 'main' window NOT found! Windows present: {:?}", app.webview_windows().keys().collect::<Vec<_>>());
            }

            app.manage(AppState {
                db,
                notes_repo,
                active_user_id,
                sync_trigger,
                manual_sync_trigger,
                _tray,
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Keep background services (tray, sync, Quick Capture) running lean
                api.prevent_close();
                let _ = window.hide();
                #[cfg(target_os = "windows")]
                crate::commands::trim_process_working_set();
            }
        })
        .invoke_handler(tauri::generate_handler![
            // Note CRUD & Search
            cmd_list_notes,
            cmd_get_note,
            cmd_create_note,
            cmd_update_note,
            cmd_move_to_trash,
            cmd_restore_from_trash,
            cmd_delete_note_permanently,
            cmd_empty_trash,
            cmd_search_notes,
            cmd_reindex_notes,
            cmd_clear_local_database,
            cmd_set_note_sync_mode,
            // Auth commands
            cmd_get_auth_status,
            cmd_get_offline_notes_count,
            cmd_set_auth_session,
            cmd_refresh_auth_token,
            cmd_logout,
            cmd_start_loopback_login,
            cmd_cancel_loopback_login,
            // Sync commands
            cmd_trigger_sync,
            cmd_get_sync_status,
            // Co-op & Smart Burn commands
            cmd_create_burn_note,
            cmd_read_and_burn_note,
            cmd_get_collab_room,
            cmd_update_collab_room,
            // System & Autostart commands
            cmd_get_autostart_status,
            cmd_set_autostart,
            cmd_set_tray_status,
            cmd_upload_to_gphost,
            cmd_delete_from_gphost,
            cmd_start_backup_download_server,
            cmd_save_backup_to_disk,
            cmd_show_in_folder,
            cmd_minimize_to_background,
            cmd_launch_uninstaller,
            cmd_open_app_folder,
            cmd_open_windows_app_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
