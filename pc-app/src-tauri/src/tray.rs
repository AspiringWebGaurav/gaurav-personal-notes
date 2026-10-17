use tauri::image::Image;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_autostart::ManagerExt;

pub fn build_tray_menu<R: tauri::Runtime>(app: &AppHandle<R>) -> Result<Menu<R>, Box<dyn std::error::Error>> {
    let show_item = MenuItem::with_id(app, "show", "Open Workspace", true, None::<&str>)?;
    let quick_capture_item =
        MenuItem::with_id(app, "quick_capture", "Capture Note", true, None::<&str>)?;
    let smart_burn_item =
        MenuItem::with_id(app, "smart_burn", "Smart Burn Note", true, None::<&str>)?;
    let sync_item = MenuItem::with_id(app, "sync", "Sync Notes", true, None::<&str>)?;
    let settings_item = MenuItem::with_id(app, "settings", "Desktop Settings", true, None::<&str>)?;

    #[cfg(target_os = "windows")]
    let is_autostart_enabled = crate::commands::is_autostart_registered();
    #[cfg(not(target_os = "windows"))]
    let is_autostart_enabled = app.autolaunch().is_enabled().unwrap_or(false);
    let quit_item = MenuItem::with_id(app, "quit", "Quit GPN", true, None::<&str>)?;

    if !is_autostart_enabled {
        // When autostart is OFF in backend, show "Launch on Windows Startup"
        let autostart_item = MenuItem::with_id(
            app,
            "autostart",
            "Launch on Windows Startup",
            true,
            None::<&str>,
        )?;

        Menu::with_items(
            app,
            &[
                &show_item,
                &quick_capture_item,
                &smart_burn_item,
                &PredefinedMenuItem::separator(app)?,
                &sync_item,
                &settings_item,
                &PredefinedMenuItem::separator(app)?,
                &autostart_item,
                &PredefinedMenuItem::separator(app)?,
                &quit_item,
            ],
        )
        .map_err(|e| e.into())
    } else {
        // When autostart is ON in backend, do NOT show "Launch on Windows Startup"
        Menu::with_items(
            app,
            &[
                &show_item,
                &quick_capture_item,
                &smart_burn_item,
                &PredefinedMenuItem::separator(app)?,
                &sync_item,
                &settings_item,
                &PredefinedMenuItem::separator(app)?,
                &quit_item,
            ],
        )
        .map_err(|e| e.into())
    }
}

pub fn update_tray_menu<R: tauri::Runtime>(app: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(tray) = app.tray_by_id("main-tray") {
        let menu = build_tray_menu(app)?;
        let _ = tray.set_menu(Some(menu));
    }
    Ok(())
}

pub fn setup_system_tray(app: &AppHandle) -> Result<TrayIcon, Box<dyn std::error::Error>> {
    let menu = build_tray_menu(app)?;

    let icon = if let Some(icon) = app.default_window_icon() {
        icon.clone()
    } else if let Ok(icon) = Image::from_app_icon_resource(32) {
        icon
    } else {
        // Fallback: 32x32 elegant indigo badge (#6366f1) so system tray is always visible
        let mut rgba = Vec::with_capacity(32 * 32 * 4);
        for _ in 0..(32 * 32) {
            rgba.extend_from_slice(&[99, 102, 241, 255]);
        }
        Image::new_owned(rgba, 32, 32)
    };

    let tray = TrayIconBuilder::with_id("main-tray")
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("Gaurav Personal Notes")
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "show" => {
                let _ = create_or_show_main_window(app);
            }
            "quick_capture" => {
                let _ = open_quick_capture(app);
            }
            "smart_burn" => {
                if let Ok(window) = create_or_show_main_window(app) {
                    let _ = window.emit("open-smart-burn", ());
                }
            }
            "sync" => {
                if let Some(state) = app.try_state::<crate::AppState>() {
                    crate::sync::SyncWorker::trigger_sync(&state.sync_trigger);
                }
            }
            "settings" => {
                if let Ok(window) = create_or_show_main_window(app) {
                    let _ = window.emit("open-settings", ());
                }
            }
            "autostart" => {
                if let Ok(_) = app.autolaunch().enable() {
                    if let Some(state) = app.try_state::<crate::AppState>() {
                        let conn = state.db.get_connection();
                        let conn_guard = conn.lock();
                        let now = chrono::Utc::now().timestamp_millis();
                        let _ = conn_guard.execute(
                            "INSERT INTO app_settings (key, value, updated_at) VALUES ('autostart_enabled', 'true', ?1)
                             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
                            rusqlite::params![now],
                        );
                    }
                    let _ = app.emit("autostart-status-changed", true);
                    let _ = update_tray_menu(app);
                }
            }
            "quit" => {
                if let Some(state) = app.try_state::<crate::AppState>() {
                    state.sync_cancel_token.cancel();
                    state.db.checkpoint_wal_passive();
                }
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            match event {
                // Clicking left mouse button on tray icon directly opens and focuses the app
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                }
                | TrayIconEvent::DoubleClick {
                    button: MouseButton::Left,
                    ..
                } => {
                    let app = tray.app_handle();
                    let _ = create_or_show_main_window(app);
                }
                _ => {}
            }
        })
        .build(app)?;

    Ok(tray)
}

pub fn create_or_show_main_window<R: tauri::Runtime>(app: &AppHandle<R>) -> Result<tauri::WebviewWindow<R>, Box<dyn std::error::Error>> {
    #[cfg(target_os = "windows")]
    crate::commands::set_process_priority_background(false);

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_always_on_top(true);
        let _ = window.set_focus();
        let _ = window.emit_to("main", "open-workspace", ());
        let w_clone = window.clone();
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_millis(300)).await;
            let _ = w_clone.set_always_on_top(false);
            let _ = w_clone.set_focus();
        });
        Ok(window)
    } else {
        let builder = tauri::WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::default())
            .title("Gaurav Personal Notes")
            .inner_size(920.0, 620.0)
            .min_inner_size(780.0, 520.0)
            .decorations(false)
            .transparent(false)
            .shadow(true)
            .center()
            .visible(true)
            .focused(true)
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");

        let window = builder.build()?;
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_always_on_top(true);
        let _ = window.set_focus();
        let w_clone = window.clone();
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(std::time::Duration::from_millis(400)).await;
            let _ = w_clone.set_always_on_top(false);
            let _ = w_clone.set_focus();
        });
        Ok(window)
    }
}

pub fn open_quick_capture<R: tauri::Runtime>(app: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(target_os = "windows")]
    crate::commands::set_process_priority_background(false);

    // 1. If dedicated capture window already exists, elevate and show it in front
    if let Some(cap_win) = app.get_webview_window("capture") {
        let _ = cap_win.show();
        let _ = cap_win.unminimize();
        let _ = cap_win.set_always_on_top(true);
        let _ = cap_win.set_focus();
        let _ = cap_win.emit_to("capture", "open-quick-capture", true);
        return Ok(());
    }

    // 2. Otherwise build the dedicated transparent floating capture window (never touch or elevate main!)
    let builder = tauri::WebviewWindowBuilder::new(app, "capture", tauri::WebviewUrl::default())
        .title("Gaurav Personal Notes Capture")
        .inner_size(740.0, 520.0)
        .decorations(false)
        .transparent(true)
        .shadow(false)
        .center()
        .visible(true)
        .always_on_top(true)
        .focused(true)
        .resizable(false);

    if let Ok(cap_win) = builder.build() {
        let _ = cap_win.show();
        let _ = cap_win.unminimize();
        let _ = cap_win.set_always_on_top(true);
        let _ = cap_win.set_focus();
        let _ = cap_win.emit_to("capture", "open-quick-capture", true);
    }

    Ok(())
}

