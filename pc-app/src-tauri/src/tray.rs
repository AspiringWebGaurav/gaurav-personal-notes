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
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
            }
            "quick_capture" => {
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
            "smart_burn" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                    let _ = window.emit("open-smart-burn", ());
                }
            }
            "sync" => {
                if let Some(state) = app.try_state::<crate::AppState>() {
                    crate::sync::SyncWorker::trigger_sync(&state.sync_trigger);
                }
            }
            "settings" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                    let _ = window.emit("open-settings", ());
                }
            }
            "autostart" => {
                if let Ok(_) = app.autolaunch().enable() {
                    let _ = app.emit("autostart-status-changed", true);
                    let _ = update_tray_menu(app);
                }
            }
            "quit" => {
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
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = window.set_focus();
                    }
                }
                _ => {}
            }
        })
        .build(app)?;

    Ok(tray)
}
