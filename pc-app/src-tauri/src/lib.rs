pub mod auth;
pub mod commands;
pub mod db;
pub mod models;
pub mod repository;
pub mod supervisor;
pub mod sync;
pub mod tray;

use auth::SessionManager;
use commands::*;
use db::DatabaseManager;
use repository::NotesRepository;
use std::sync::Arc;
use sync::SyncWorker;
use tauri::Manager;
#[cfg(not(target_os = "windows"))]
use tauri_plugin_autostart::ManagerExt;
use tokio::sync::Notify;

static PENDING_WORKSPACE_ACTIVATION: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);
static PENDING_CAPTURE_ACTIVATION: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);

pub struct AppState {
    pub db: DatabaseManager,
    pub notes_repo: NotesRepository,
    pub active_user_id: Arc<parking_lot::RwLock<String>>,
    pub sync_trigger: Arc<Notify>,
    pub manual_sync_trigger: Arc<std::sync::atomic::AtomicBool>,
    pub pull_sync_trigger: Arc<std::sync::atomic::AtomicBool>,
    pub sync_cancel_token: tokio_util::sync::CancellationToken,
    pub _tray: Option<tauri::tray::TrayIcon>,
}

fn load_local_env() {
    if std::env::var("VITE_FIREBASE_API_KEY").is_ok() || std::env::var("NEXT_PUBLIC_FIREBASE_API_KEY").is_ok() {
        return;
    }

    let mut candidate_paths = vec![
        std::path::PathBuf::from(".env.local"),
        std::path::PathBuf::from(".env"),
    ];

    if let Ok(curr) = std::env::current_dir() {
        candidate_paths.push(curr.join(".env.local"));
        candidate_paths.push(curr.join(".env"));
        if let Some(parent) = curr.parent() {
            candidate_paths.push(parent.join(".env.local"));
            candidate_paths.push(parent.join(".env"));
        }
    }

    for path in &candidate_paths {
        if !path.exists() {
            continue;
        }
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
            break; // Stop scanning once environment variables are loaded
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    supervisor::init_panic_supervisor();
    load_local_env();
    supervisor::record_trace("BOOT", "Base v0.0.0 process initialized");

    let is_autostart_boot = std::env::args().any(|arg| arg == "--autostart" || arg == "--minimized");
    #[cfg(target_os = "windows")]
    if is_autostart_boot {
        // Run with BELOW_NORMAL_PRIORITY_CLASS so mouse cursor, DWM & foreground apps have 100% CPU priority
        crate::commands::set_process_priority_background(true);
    }

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
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            #[cfg(target_os = "windows")]
            crate::commands::set_process_priority_background(false);

            let is_quick_capture = argv.iter().any(|arg| arg == "--quick-capture");
            if app.try_state::<AppState>().is_some() {
                if is_quick_capture {
                    let _ = crate::tray::open_quick_capture(app);
                } else {
                    let _ = crate::tray::create_or_show_main_window(app);
                }
            } else {
                if is_quick_capture {
                    PENDING_CAPTURE_ACTIVATION.store(true, std::sync::atomic::Ordering::SeqCst);
                } else {
                    PENDING_WORKSPACE_ACTIVATION.store(true, std::sync::atomic::Ordering::SeqCst);
                }
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            Default::default(),
            Some(vec!["--autostart"]),
        ))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        #[cfg(target_os = "windows")]
                        crate::commands::set_process_priority_background(false);
                        let _ = crate::tray::open_quick_capture(app);
                    }
                })
                .build(),
        )
        .setup(|app| {
            // STEP 1: Register system tray icon immediately (0ms taskbar latency)
            let _tray = match tray::setup_system_tray(app.handle()) {
                Ok(t) => {
                    eprintln!("[GPN Setup] System tray icon registered immediately!");
                    Some(t)
                }
                Err(e) => {
                    eprintln!("[GPN Setup] Error setting up system tray: {:?}", e);
                    None
                }
            };

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

            // Process any previous crash post-mortem and persist to SQLite telemetry
            {
                let conn = db.get_connection();
                let guard = conn.lock();
                supervisor::inspect_and_store_previous_crash(&guard);
            }

            // Spawn continuous health supervisor (DSA ring-buffer traces + DB connection health)
            supervisor::spawn_health_monitor(db.clone());


            #[cfg(target_os = "windows")]
            unsafe {
                extern "system" {
                    fn RegisterApplicationRestart(pwzCommandLine: *const u16, dwFlags: u32) -> i32;
                }
                use std::os::windows::ffi::OsStrExt;
                let cmd: Vec<u16> = std::ffi::OsStr::new("--autostart")
                    .encode_wide()
                    .chain(std::iter::once(0))
                    .collect();
                let _ = RegisterApplicationRestart(cmd.as_ptr(), 0);
            }

            // Consolidated persistent autostart check (zero duplicate queries)
            {
                let autostart_pref: Option<String> = {
                    let conn = db.get_connection();
                    let guard = conn.lock();
                    guard
                        .query_row(
                            "SELECT value FROM app_settings WHERE key = 'autostart_enabled'",
                            [],
                            |row| row.get(0),
                        )
                        .ok()
                };
                let should_autostart = autostart_pref.as_deref() != Some("false");
                #[cfg(target_os = "windows")]
                {
                    crate::commands::sync_autostart_registry(should_autostart);
                }
                #[cfg(not(target_os = "windows"))]
                {
                    if should_autostart {
                        let is_active = app.autolaunch().is_enabled().unwrap_or(false);
                        if !is_active {
                            let _ = app.autolaunch().enable();
                        }
                    }
                }
            }

            // Synchronize Windows Installed Apps version (Settings > Apps > Installed apps)
            #[cfg(target_os = "windows")]
            {
                let running_ver = app.package_info().version.to_string();
                crate::commands::cmd_sync_windows_installed_version(app.handle().clone(), Some(running_ver.clone())).ok();
            }

            // Record active running version in persistent SQLite app_settings
            {
                let conn = db.get_connection();
                let guard = conn.lock();
                let now = chrono::Utc::now().timestamp_millis();
                let running_ver = app.package_info().version.to_string();
                let _ = guard.execute(
                    "INSERT INTO app_settings (key, value, updated_at) VALUES ('installed_app_version', ?1, ?2)
                     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
                    rusqlite::params![running_ver, now],
                );
            }

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
            let (worker, sync_trigger, manual_sync_trigger, pull_sync_trigger, sync_cancel_token) = SyncWorker::new(
                project_id,
                db.get_connection(),
                active_user_id.clone(),
            );

            // Start the background sync loop
            worker.start(Some(app.handle().clone()));

            // Trigger cloud mirror sync if user is already authenticated
            let is_autostart_boot = std::env::args().any(|arg| arg == "--autostart" || arg == "--minimized");
            {
                let uid = active_user_id.read().clone();
                if uid != "local_vault" && uid != "local-user" && !uid.is_empty() {
                    if is_autostart_boot {
                        // Defer initial sync by 4 seconds on system startup so Windows login settles smoothly
                        let s_trig = sync_trigger.clone();
                        let m_flag = manual_sync_trigger.clone();
                        tauri::async_runtime::spawn(async move {
                            tokio::time::sleep(std::time::Duration::from_secs(4)).await;
                            SyncWorker::trigger_manual_sync(&s_trig, &m_flag);
                        });
                    } else {
                        SyncWorker::trigger_manual_sync(&sync_trigger, &manual_sync_trigger);
                    }
                }
            }

            // Ensure main window is displayed unless started silently via Windows Startup
            let is_restart_after_update = std::env::args().any(|arg| {
                arg == "--restarted-after-update" || arg == "--foreground" || arg == "--update-failed-recovered"
            });
            let is_recovered_boot = std::env::args().any(|arg| arg == "--update-failed-recovered");

            if is_recovered_boot {
                eprintln!("[GPN Setup] Started in SELF-HEALING RECOVERY MODE (--update-failed-recovered). Previous version successfully preserved!");
            }

            if is_restart_after_update || !is_autostart_boot {
                eprintln!("[GPN Setup] Launching main workspace...");
                let _ = crate::tray::create_or_show_main_window(app.handle());
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(std::time::Duration::from_millis(300)).await;
                    let _ = crate::commands::cmd_bring_main_to_front(handle);
                });
            } else {
                eprintln!("[GPN Setup] Started silently via Windows Startup (--autostart): running background runtime in system tray with zero WebView2.");
            }

            // Self-cleaning: After app has run stably for 10 seconds, clean old update artifacts
            if !is_recovered_boot {
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(std::time::Duration::from_secs(10)).await;
                    let _ = crate::commands::cmd_clean_superseded_old_binaries();
                });
            }

            // Dispatch any activations that arrived while setup was initializing
            if PENDING_CAPTURE_ACTIVATION.swap(false, std::sync::atomic::Ordering::SeqCst) {
                let _ = crate::tray::open_quick_capture(app.handle());
            } else if PENDING_WORKSPACE_ACTIVATION.swap(false, std::sync::atomic::Ordering::SeqCst) {
                let _ = crate::tray::create_or_show_main_window(app.handle());
            }

            app.manage(AppState {
                db,
                notes_repo,
                active_user_id,
                sync_trigger,
                manual_sync_trigger,
                pull_sync_trigger,
                sync_cancel_token,
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
                {
                    crate::commands::trim_process_working_set();
                    crate::commands::set_process_priority_background(true);
                }
            }
            if let tauri::WindowEvent::Destroyed = event {
                if let Some(state) = window.try_state::<AppState>() {
                    state.sync_cancel_token.cancel();
                    state.db.checkpoint_wal_passive();
                }
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
            cmd_open_capture_window,
            cmd_hide_capture_window,
            cmd_bring_main_to_front,
            cmd_launch_uninstaller,
            cmd_open_app_folder,
            cmd_open_windows_app_settings,
            cmd_get_resolved_version,
            cmd_sync_windows_installed_version,
            cmd_clean_superseded_old_binaries,
            cmd_write_update_staging_file,
            cmd_apply_in_process_update,
            cmd_fetch_update_manifest,
            cmd_download_update_binary,
            cmd_get_clipboard_text,
            cmd_set_clipboard_text,
            cmd_get_diagnostics_traces,
            cmd_record_trace_event,
            cmd_get_machine_instance_id,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

