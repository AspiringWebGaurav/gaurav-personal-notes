use tauri::Manager;
#[cfg(not(target_os = "windows"))]
use tauri_plugin_autostart::ManagerExt;

#[cfg(target_os = "windows")]
pub fn get_installed_or_current_exe_path() -> std::path::PathBuf {
    use winreg::enums::*;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    if let Ok(uninstall_key) = hkcu.open_subkey(r"Software\Microsoft\Windows\CurrentVersion\Uninstall\Gaurav Personal Notes") {
        if let Ok(install_loc) = uninstall_key.get_value::<String, _>("InstallLocation") {
            let canonical_exe = std::path::PathBuf::from(install_loc.trim_matches('"')).join("Gaurav Personal Notes.exe");
            if canonical_exe.exists() {
                return canonical_exe;
            }
        }
    }

    if let Ok(local_app) = std::env::var("LOCALAPPDATA") {
        let appdata_exe = std::path::PathBuf::from(local_app).join("Gaurav Personal Notes").join("Gaurav Personal Notes.exe");
        if appdata_exe.exists() {
            return appdata_exe;
        }
    }

    std::env::current_exe().unwrap_or_else(|_| std::path::PathBuf::from("Gaurav Personal Notes.exe"))
}

#[cfg(target_os = "windows")]
pub fn sync_autostart_registry(enabled: bool) {
    use winreg::enums::*;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let run_key_path = r"Software\Microsoft\Windows\CurrentVersion\Run";

    if let Ok((run_key, _)) = hkcu.create_subkey(run_key_path) {
        let app_name = "Gaurav Personal Notes";
        if enabled {
            // Check if user explicitly disabled GPN in Windows Task Manager / Windows Settings.
            // If the user deliberately disabled it in Task Manager, respect their decision during passive boot sync.
            let approved_path = r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run";
            let user_disabled_in_task_manager = if let Ok(approved_key) = hkcu.open_subkey(approved_path) {
                if let Ok(raw_val) = approved_key.get_raw_value(app_name) {
                    raw_val.bytes.first().map(|&b| b % 2 != 0).unwrap_or(false)
                } else {
                    false
                }
            } else {
                false
            };

            if user_disabled_in_task_manager {
                // User explicitly disabled in Task Manager; respect their choice and do not force-enable
                return;
            }

            let target_exe = get_installed_or_current_exe_path();
            let command = format!("\"{}\" --autostart", target_exe.to_string_lossy());
            let _ = run_key.set_value(app_name, &command);

            // Eliminate Windows Explorer artificial 10-second startup delay (0 ms) for instant launch
            let serialize_path = r"Software\Microsoft\Windows\CurrentVersion\Explorer\Serialize";
            if let Ok((ser_key, _)) = hkcu.create_subkey(serialize_path) {
                let delay: u32 = 0;
                let _ = ser_key.set_value("StartupDelayInMSec", &delay);
            }
        } else {
            let _ = run_key.delete_value(app_name);
            // Also mark as disabled in StartupApproved if present
            let approved_path = r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run";
            if let Ok((approved_key, _)) = hkcu.create_subkey(approved_path) {
                let val = winreg::RegValue {
                    vtype: REG_BINARY,
                    bytes: vec![3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                };
                let _ = approved_key.set_raw_value(app_name, &val);
            }
        }
    }
}

#[cfg(target_os = "windows")]
pub fn is_autostart_registered() -> bool {
    use winreg::enums::*;
    use winreg::RegKey;

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let run_key_path = r"Software\Microsoft\Windows\CurrentVersion\Run";
    let in_run = if let Ok(run_key) = hkcu.open_subkey(run_key_path) {
        run_key.get_value::<String, _>("Gaurav Personal Notes").is_ok()
    } else {
        false
    };

    if !in_run {
        return false;
    }

    // Check if disabled by user in Windows Task Manager (StartupApproved\Run)
    let approved_path = r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run";
    if let Ok(approved_key) = hkcu.open_subkey(approved_path) {
        if let Ok(raw_val) = approved_key.get_raw_value("Gaurav Personal Notes") {
            if let Some(&first_byte) = raw_val.bytes.first() {
                // In Windows StartupApproved:
                // 0x02 = Enabled
                // 0x03 or any odd number >= 0x03 = Disabled by user in Task Manager
                if first_byte % 2 != 0 {
                    return false;
                }
            }
        }
    }

    true
}

#[cfg(not(target_os = "windows"))]
pub fn sync_autostart_registry(_enabled: bool) {}

#[cfg(not(target_os = "windows"))]
pub fn is_autostart_registered() -> bool {
    false
}

#[tauri::command]
pub fn cmd_get_autostart_status(app: tauri::AppHandle) -> Result<bool, String> {
    // 1. Check persistent SQLite preference first
    let persisted_pref = if let Some(state) = app.try_state::<crate::AppState>() {
        let conn = state.db.get_connection();
        let conn_guard = conn.lock();
        conn_guard
            .query_row(
                "SELECT value FROM app_settings WHERE key = 'autostart_enabled'",
                [],
                |row| row.get::<_, String>(0),
            )
            .ok()
            .map(|val| val == "true")
    } else {
        None
    };

    #[cfg(target_os = "windows")]
    let os_status = is_autostart_registered();
    #[cfg(not(target_os = "windows"))]
    let os_status = app.autolaunch().is_enabled().unwrap_or(false);

    // If persistent SQLite says it should be enabled, ensure OS entry is synced
    if let Some(true) = persisted_pref {
        if !os_status {
            #[cfg(target_os = "windows")]
            sync_autostart_registry(true);
            #[cfg(not(target_os = "windows"))]
            let _ = app.autolaunch().enable();
            let _ = crate::tray::update_tray_menu(&app);
        }
        return Ok(true);
    } else if let Some(false) = persisted_pref {
        if os_status {
            #[cfg(target_os = "windows")]
            sync_autostart_registry(false);
            #[cfg(not(target_os = "windows"))]
            let _ = app.autolaunch().disable();
            let _ = crate::tray::update_tray_menu(&app);
        }
        return Ok(false);
    }

    // Default out-of-the-box: enabled by default!
    if !os_status {
        #[cfg(target_os = "windows")]
        sync_autostart_registry(true);
        #[cfg(not(target_os = "windows"))]
        let _ = app.autolaunch().enable();

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
        let _ = crate::tray::update_tray_menu(&app);
    }
    Ok(true)
}

#[tauri::command]
pub fn cmd_set_autostart(app: tauri::AppHandle, enabled: bool) -> Result<bool, String> {
    // 1. Persist user preference to SQLite app_settings
    if let Some(state) = app.try_state::<crate::AppState>() {
        let conn = state.db.get_connection();
        let conn_guard = conn.lock();
        let now = chrono::Utc::now().timestamp_millis();
        let val = if enabled { "true" } else { "false" };
        let _ = conn_guard.execute(
            "INSERT INTO app_settings (key, value, updated_at) VALUES ('autostart_enabled', ?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
            rusqlite::params![val, now],
        );
    }

    // 2. Set OS level autostart
    #[cfg(target_os = "windows")]
    {
        use winreg::enums::*;
        use winreg::RegKey;

        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let app_name = "Gaurav Personal Notes";
        if enabled {
            // When user explicitly clicks Enable in GPN settings, also update Task Manager to Enabled (0x02)
            let approved_path = r"Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run";
            if let Ok((approved_key, _)) = hkcu.create_subkey(approved_path) {
                let val = winreg::RegValue {
                    vtype: REG_BINARY,
                    bytes: vec![2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                };
                let _ = approved_key.set_raw_value(app_name, &val);
            }

            let target_exe = get_installed_or_current_exe_path();
            let command = format!("\"{}\" --autostart", target_exe.to_string_lossy());
            if let Ok((run_key, _)) = hkcu.create_subkey(r"Software\Microsoft\Windows\CurrentVersion\Run") {
                let _ = run_key.set_value(app_name, &command);
            }

            let serialize_path = r"Software\Microsoft\Windows\CurrentVersion\Explorer\Serialize";
            if let Ok((ser_key, _)) = hkcu.create_subkey(serialize_path) {
                let delay: u32 = 0;
                let _ = ser_key.set_value("StartupDelayInMSec", &delay);
            }
        } else {
            sync_autostart_registry(false);
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        if enabled {
            let _ = app.autolaunch().enable();
        } else {
            let _ = app.autolaunch().disable();
        }
    }

    #[cfg(target_os = "windows")]
    let status = is_autostart_registered();
    #[cfg(not(target_os = "windows"))]
    let status = app.autolaunch().is_enabled().unwrap_or(false);

    let _ = crate::tray::update_tray_menu(&app);
    Ok(status)
}

#[tauri::command]
pub fn cmd_set_tray_status(app: tauri::AppHandle, is_live: bool, is_online: bool) -> Result<(), String> {
    if let Some(tray) = app.tray_by_id("main-tray") {
        let tooltip = if !is_online {
            "Gaurav Personal Notes — [Offline • Local Vault]"
        } else if is_live {
            "Gaurav Personal Notes — [Live • Cloud Synced]"
        } else {
            "Gaurav Personal Notes — [Local Encrypted Vault]"
        };
        let _ = tray.set_tooltip(Some(tooltip));
    }
    Ok(())
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct GpHostUploadResponse {
    pub success: bool,
    #[serde(rename = "fileId", default)]
    pub file_id: Option<String>,
    #[serde(rename = "filename", default)]
    pub filename: Option<String>,
    #[serde(rename = "byteSize", default)]
    pub byte_size: Option<u64>,
    #[serde(rename = "mimeType", default)]
    pub mime_type: Option<String>,
    #[serde(rename = "downloadUrl", default)]
    pub download_url: Option<String>,
    #[serde(rename = "rawUrl", default)]
    pub raw_url: Option<String>,
    #[serde(rename = "expiresAt", default)]
    pub expires_at: Option<String>,
    #[serde(default)]
    pub error: Option<String>,
}

#[tauri::command]
pub async fn cmd_upload_to_gphost(
    api_key: String,
    file_bytes: Vec<u8>,
    filename: String,
    mime_type: Option<String>,
) -> Result<GpHostUploadResponse, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())?;

    let mime = mime_type.unwrap_or_else(|| "application/octet-stream".to_string());

    let part = reqwest::multipart::Part::bytes(file_bytes)
        .file_name(filename)
        .mime_str(&mime)
        .map_err(|e| format!("Invalid mime type: {}", e))?;

    let form = reqwest::multipart::Form::new().part("file", part);

    let res = client
        .post("https://gphost.eu.cc/api/v1/upload")
        .header("Authorization", format!("Bearer {}", api_key.trim()))
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Network request failed: {}", e))?;

    if !res.status().is_success() {
        let status = res.status();
        let err_body = res.text().await.unwrap_or_default();
        return Err(format!("GPHost returned HTTP {}: {}", status, err_body));
    }

    let parsed = res
        .json::<GpHostUploadResponse>()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(parsed)
}

#[tauri::command]
pub async fn cmd_delete_from_gphost(
    api_key: String,
    identifier: String,
) -> Result<bool, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| e.to_string())?;

    let clean_id = if identifier.starts_with("http://") || identifier.starts_with("https://") {
        identifier
            .split('/')
            .filter(|s| !s.is_empty())
            .last()
            .unwrap_or(&identifier)
            .to_string()
    } else {
        identifier.clone()
    };

    // 1. Direct attempt to GPHost upstream
    let _ = client
        .delete(format!("https://gphost.eu.cc/api/files/{}", clean_id))
        .header("Authorization", format!("Bearer {}", api_key.trim()))
        .header("x-api-key", api_key.trim())
        .send()
        .await;

    // 2. Centralized fallback proxy
    let _ = client
        .post("https://gaurav-personal-notes.vercel.app/api/gphost/delete")
        .header("Authorization", format!("Bearer {}", api_key.trim()))
        .header("Content-Type", "application/json")
        .body(format!(r#"{{"fileId":"{}"}}"#, clean_id))
        .send()
        .await;

    Ok(true)
}

static LAST_BACKUP_TIME: parking_lot::Mutex<Option<std::time::Instant>> = parking_lot::Mutex::new(None);

#[tauri::command]
pub async fn cmd_start_backup_download_server(
    zip_bytes: Vec<u8>,
    filename: String,
) -> Result<String, String> {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpListener;
    use std::time::Duration;

    // Minimum 2 seconds cooldown between starting new download servers
    {
        let mut last_time = LAST_BACKUP_TIME.lock();
        if let Some(t) = *last_time {
            if t.elapsed() < Duration::from_secs(2) {
                let remaining = 2 - t.elapsed().as_secs();
                return Err(format!("Please wait {} seconds before downloading another backup.", remaining));
            }
        }
        *last_time = Some(std::time::Instant::now());
    }

    let listener = TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| format!("Failed to bind local backup server: {}", e))?;

    let port = listener
        .local_addr()
        .map_err(|e| format!("Failed to get local port: {}", e))?
        .port();

    let token = uuid::Uuid::new_v4().to_string();
    let download_url = format!("http://127.0.0.1:{}/download?token={}", port, token);

    let zip_data = std::sync::Arc::new(zip_bytes);
    let valid_token = token.clone();
    let download_filename = filename.clone();

    // Spawn server with a generous 180s lifetime so download managers & multi-threaded chunking never fail
    tokio::spawn(async move {
        let timeout = Duration::from_secs(180);
        let start_time = tokio::time::Instant::now();

        while start_time.elapsed() < timeout {
            let accept_res = tokio::time::timeout(Duration::from_secs(5), listener.accept()).await;
            if let Ok(Ok((mut socket, _))) = accept_res {
                let data = zip_data.clone();
                let token_check = valid_token.clone();
                let fname = download_filename.clone();

                tokio::spawn(async move {
                    let mut buffer = [0u8; 4096];
                    if let Ok(Ok(n)) = tokio::time::timeout(Duration::from_secs(8), socket.read(&mut buffer)).await {
                        if n > 0 {
                            let req = String::from_utf8_lossy(&buffer[..n]);
                            if let Some(first_line) = req.lines().next() {
                                if first_line.contains(&format!("token={}", token_check)) {
                                    let method = first_line.split_whitespace().next().unwrap_or("GET");
                                    let total_len = data.len();

                                    // Parse HTTP Range header (supports segmented download managers like IDM, FDM)
                                    let mut range_bounds: Option<(usize, usize)> = None;
                                    for line in req.lines() {
                                        let line_lower = line.to_lowercase();
                                        if line_lower.starts_with("range:") {
                                            if let Some((_, val)) = line.split_once(':') {
                                                let val = val.trim();
                                                if val.to_lowercase().starts_with("bytes=") {
                                                    let spec = val[6..].trim();
                                                    if let Some((start_str, end_str)) = spec.split_once('-') {
                                                        let start = start_str.trim().parse::<usize>().unwrap_or(0);
                                                        let end = if end_str.trim().is_empty() {
                                                            total_len.saturating_sub(1)
                                                        } else {
                                                            end_str.trim().parse::<usize>().unwrap_or(total_len.saturating_sub(1))
                                                        };
                                                        let end = end.min(total_len.saturating_sub(1));
                                                        if start <= end && start < total_len {
                                                            range_bounds = Some((start, end));
                                                        }
                                                    }
                                                }
                                            }
                                            break;
                                        }
                                    }

                                    if let Some((start, end)) = range_bounds {
                                        let part_len = end - start + 1;
                                        let header = format!(
                                            "HTTP/1.1 206 Partial Content\r\n\
                                             Content-Type: application/zip\r\n\
                                             Content-Disposition: attachment; filename=\"{}\"\r\n\
                                             Content-Range: bytes {}-{}/{}\r\n\
                                             Content-Length: {}\r\n\
                                             Accept-Ranges: bytes\r\n\
                                             Connection: close\r\n\
                                             X-Content-Type-Options: nosniff\r\n\
                                             Cache-Control: no-cache, no-store, must-revalidate\r\n\r\n",
                                            fname,
                                            start,
                                            end,
                                            total_len,
                                            part_len
                                        );
                                        let _ = socket.write_all(header.as_bytes()).await;
                                        let _ = socket.flush().await;
                                        if method != "HEAD" {
                                            let _ = socket.write_all(&data[start..=end]).await;
                                            let _ = socket.flush().await;
                                        }
                                        let _ = socket.shutdown().await;
                                        return;
                                    } else {
                                        let header = format!(
                                            "HTTP/1.1 200 OK\r\n\
                                             Content-Type: application/zip\r\n\
                                             Content-Disposition: attachment; filename=\"{}\"\r\n\
                                             Content-Length: {}\r\n\
                                             Accept-Ranges: bytes\r\n\
                                             Connection: close\r\n\
                                             X-Content-Type-Options: nosniff\r\n\
                                             Cache-Control: no-cache, no-store, must-revalidate\r\n\r\n",
                                            fname,
                                            total_len
                                        );
                                        let _ = socket.write_all(header.as_bytes()).await;
                                        let _ = socket.flush().await;
                                        if method != "HEAD" {
                                            let _ = socket.write_all(&data).await;
                                            let _ = socket.flush().await;
                                        }
                                        let _ = socket.shutdown().await;
                                        return;
                                    }
                                }
                            }
                        }
                    }
                    let resp = "HTTP/1.1 403 Forbidden\r\nContent-Type: text/plain\r\nConnection: close\r\n\r\nInvalid or expired backup token.";
                    let _ = socket.write_all(resp.as_bytes()).await;
                    let _ = socket.flush().await;
                    let _ = socket.shutdown().await;
                });
            }
        }
    });

    Ok(download_url)
}

#[tauri::command]
pub async fn cmd_save_backup_to_disk(
    zip_bytes: Vec<u8>,
    filename: String,
) -> Result<String, String> {
    // 1. Determine download directory
    let download_dir = if let Ok(user_profile) = std::env::var("USERPROFILE") {
        let p = std::path::PathBuf::from(user_profile).join("Downloads");
        if p.exists() {
            p
        } else {
            std::env::temp_dir()
        }
    } else {
        std::env::temp_dir()
    };

    // 2. Safe unique filename in Downloads (avoid overwriting if duplicate exists)
    let stem = std::path::Path::new(&filename)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("gpn-vault-backup");
    let ext = std::path::Path::new(&filename)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("zip");

    let mut target_path = download_dir.join(&filename);
    let mut counter = 1;
    while target_path.exists() {
        let new_name = format!("{} ({}).{}", stem, counter, ext);
        target_path = download_dir.join(new_name);
        counter += 1;
        if counter > 100 {
            break;
        }
    }

    // 3. Write file directly to disk
    tokio::fs::write(&target_path, zip_bytes)
        .await
        .map_err(|e| format!("Failed to save backup file: {}", e))?;

    let saved_path_str = target_path.to_string_lossy().to_string();
    Ok(saved_path_str)
}

#[tauri::command]
pub fn cmd_show_in_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let _ = Command::new("explorer")
            .args(["/select,", &path])
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }
    Ok(())
}

#[cfg(target_os = "windows")]
pub fn trim_process_working_set() {
    // Intentionally no-op: SetProcessWorkingSetSize artificially pages memory to pagefile,
    // which induces page faults, disk I/O, and restoration latency on window reveal.
}

#[cfg(target_os = "windows")]
pub fn set_process_priority_background(background: bool) {
    unsafe {
        extern "system" {
            fn GetCurrentProcess() -> *mut std::ffi::c_void;
            fn SetPriorityClass(hProcess: *mut std::ffi::c_void, dwPriorityClass: u32) -> i32;
        }
        // BELOW_NORMAL_PRIORITY_CLASS = 0x00004000 (yields CPU to DWM & mouse interrupts during busy boot)
        // NORMAL_PRIORITY_CLASS = 0x00000020 (full interactive responsiveness when UI is active)
        let priority = if background { 0x00004000 } else { 0x00000020 };
        let _ = SetPriorityClass(GetCurrentProcess(), priority);
    }
}

#[cfg(not(target_os = "windows"))]
pub fn set_process_priority_background(_background: bool) {}

#[tauri::command]
pub fn cmd_minimize_to_background(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
        #[cfg(target_os = "windows")]
        {
            trim_process_working_set();
            set_process_priority_background(true);
        }
    }
    Ok(())
}

#[cfg(target_os = "windows")]
fn launch_uninstaller_windows(path: &std::path::Path) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    let path_str = path.to_string_lossy().to_string();
    let wide_path: Vec<u16> = std::ffi::OsStr::new(&path_str)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    let wide_verb_open: Vec<u16> = std::ffi::OsStr::new("open")
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    let wide_verb_runas: Vec<u16> = std::ffi::OsStr::new("runas")
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    extern "system" {
        fn ShellExecuteW(
            hwnd: *mut std::ffi::c_void,
            lpOperation: *const u16,
            lpFile: *const u16,
            lpParameters: *const u16,
            lpDirectory: *const u16,
            nShowCmd: i32,
        ) -> isize;
    }

    // Attempt 1: ShellExecuteW with "open" (handles elevation prompt natively)
    let res = unsafe {
        ShellExecuteW(
            std::ptr::null_mut(),
            wide_verb_open.as_ptr(),
            wide_path.as_ptr(),
            std::ptr::null(),
            std::ptr::null(),
            1, // SW_SHOWNORMAL
        )
    };

    if res > 32 {
        return Ok(());
    }

    // Attempt 2: ShellExecuteW with "runas" (explicit administrator elevation)
    let res_runas = unsafe {
        ShellExecuteW(
            std::ptr::null_mut(),
            wide_verb_runas.as_ptr(),
            wide_path.as_ptr(),
            std::ptr::null(),
            std::ptr::null(),
            1, // SW_SHOWNORMAL
        )
    };

    if res_runas > 32 {
        return Ok(());
    }

    // Attempt 3: cmd /c start
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let cmd_status = std::process::Command::new("cmd")
            .args(["/c", "start", "", &path_str])
            .creation_flags(0x08000000)
            .status();

        if let Ok(status) = cmd_status {
            if status.success() {
                return Ok(());
            }
        }
    }

    Err(format!("Could not execute uninstaller at '{}'", path_str))
}

#[tauri::command]
pub fn cmd_launch_uninstaller(app: tauri::AppHandle) -> Result<(), String> {
    let mut candidate_paths = Vec::new();

    // 1. Check directory of the running executable
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            candidate_paths.push(dir.join("uninstall.exe"));
        }
    }

    // 2. Query Windows Registry for exact registered UninstallString
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let reg_query = std::process::Command::new("reg")
            .args([
                "query",
                "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Gaurav Personal Notes",
                "/v",
                "UninstallString",
            ])
            .creation_flags(0x08000000)
            .output();

        if let Ok(out) = reg_query {
            let text = String::from_utf8_lossy(&out.stdout);
            for line in text.lines() {
                if line.trim().starts_with("UninstallString") {
                    let parts: Vec<&str> = line.split("REG_SZ").collect();
                    if parts.len() > 1 {
                        let uninst_path = parts[1].trim().trim_matches('"');
                        if !uninst_path.is_empty() {
                            candidate_paths.push(std::path::PathBuf::from(uninst_path));
                        }
                    }
                }
            }
        }
    }

    // 3. Known installation directories (canonical AppData prioritized)
    if let Ok(local_app) = std::env::var("LOCALAPPDATA") {
        candidate_paths.push(std::path::PathBuf::from(&local_app).join("Gaurav Personal Notes").join("uninstall.exe"));
        candidate_paths.push(std::path::PathBuf::from(&local_app).join("Programs").join("Gaurav Personal Notes").join("uninstall.exe"));
    }

    if let Ok(pf) = std::env::var("ProgramFiles") {
        candidate_paths.push(std::path::PathBuf::from(pf).join("Gaurav Personal Notes").join("uninstall.exe"));
    }
    candidate_paths.push(std::path::PathBuf::from("C:\\Program Files\\Gaurav Personal Notes\\uninstall.exe"));
    candidate_paths.push(std::path::PathBuf::from("C:\\Program Files (x86)\\Gaurav Personal Notes\\uninstall.exe"));

    for path in candidate_paths {
        if path.exists() {
            #[cfg(target_os = "windows")]
            {
                launch_uninstaller_windows(&path)?;
                let app_clone = app.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_millis(800));
                    app_clone.exit(0);
                });
                return Ok(());
            }
        }
    }

    // Fallback: open Windows Installed Apps settings
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let _ = std::process::Command::new("cmd")
            .args(["/c", "start", "ms-settings:appsfeatures"])
            .creation_flags(0x08000000)
            .spawn();
    }
    Ok(())
}

#[tauri::command]
pub fn cmd_open_app_folder() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let mut target_dir = None;
        if let Ok(exe) = std::env::current_exe() {
            if let Some(dir) = exe.parent() {
                if dir.exists() {
                    target_dir = Some(dir.to_path_buf());
                }
            }
        }
        if target_dir.is_none() {
            if let Ok(local_app) = std::env::var("LOCALAPPDATA") {
                let canonical = std::path::PathBuf::from(&local_app).join("Gaurav Personal Notes");
                if canonical.exists() {
                    target_dir = Some(canonical);
                }
            }
        }
        if target_dir.is_none() {
            let default_dir = std::path::PathBuf::from("C:\\Program Files\\Gaurav Personal Notes");
            if default_dir.exists() {
                target_dir = Some(default_dir);
            }
        }
        if let Some(dir) = target_dir {
            let _ = std::process::Command::new("explorer")
                .arg(dir)
                .spawn()
                .map_err(|e| format!("Could not open folder: {}", e))?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn cmd_open_windows_app_settings() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let _ = std::process::Command::new("cmd")
            .args(["/c", "start", "ms-settings:appsfeatures"])
            .creation_flags(0x08000000)
            .spawn()
            .map_err(|e| format!("Could not open Windows Settings: {}", e))?;
    }
    Ok(())
}
#[tauri::command]
pub fn cmd_hide_capture_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("capture") {
        let _ = window.set_always_on_top(false);
        let _ = window.hide();
        #[cfg(target_os = "windows")]
        {
            trim_process_working_set();
            set_process_priority_background(true);
        }
    }
    Ok(())
}

#[tauri::command]
pub fn cmd_open_capture_window(app: tauri::AppHandle) -> Result<(), String> {
    crate::tray::open_quick_capture(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn cmd_bring_main_to_front(app: tauri::AppHandle) -> Result<(), String> {
    let is_autostart_boot = std::env::args().any(|arg| arg == "--autostart" || arg == "--minimized");
    if is_autostart_boot {
        return Ok(());
    }

    #[cfg(target_os = "windows")]
    set_process_priority_background(false);

    if let Some(window) = app.get_webview_window("main") {
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
    } else {
        let _ = crate::tray::create_or_show_main_window(&app);
    }
    Ok(())
}

#[tauri::command]
pub fn cmd_get_resolved_version(app: tauri::AppHandle) -> Result<String, String> {
    Ok(app.package_info().version.to_string())
}

#[cfg(target_os = "windows")]
pub fn sync_windows_installed_version(new_version: &str) {
    use winreg::enums::*;
    use winreg::RegKey;

    let clean_ver = new_version.trim().trim_start_matches('v').to_string();
    if clean_ver.is_empty() {
        return;
    }

    // Purge any duplicate bundle-ID uninstall keys created by previous builds
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let _ = hkcu.delete_subkey(r"Software\Microsoft\Windows\CurrentVersion\Uninstall\com.gpn.desktop");

    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let _ = hklm.delete_subkey(r"Software\Microsoft\Windows\CurrentVersion\Uninstall\com.gpn.desktop");
    let _ = hklm.delete_subkey(r"Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\com.gpn.desktop");

    // Canonical NSIS Uninstall Registry Key (single unified entry)
    let canonical_subkey = r"Software\Microsoft\Windows\CurrentVersion\Uninstall\Gaurav Personal Notes";

    let parts: Vec<&str> = clean_ver.split('.').collect();
    let major = parts.get(0).and_then(|s| s.parse::<u32>().ok()).unwrap_or(0);
    let minor = parts.get(1).and_then(|s| s.parse::<u32>().ok()).unwrap_or(0);

    let current_exe = std::env::current_exe().ok();
    let current_dir = current_exe
        .as_ref()
        .and_then(|p| p.parent())
        .map(|p| p.to_string_lossy().to_string());
    let current_exe_str = current_exe.as_ref().map(|p| p.to_string_lossy().to_string());

    // 1. Current User Registry (Standard for NSIS currentUser install mode)
    if let Ok((key, _disp)) = hkcu.create_subkey(canonical_subkey) {
        let _ = key.set_value("DisplayVersion", &clean_ver);
        let _ = key.set_value("Version", &clean_ver);
        let _ = key.set_value("VersionMajor", &major);
        let _ = key.set_value("VersionMinor", &minor);

        // Populate essential fields if missing
        if key.get_value::<String, _>("DisplayName").is_err() {
            let _ = key.set_value("DisplayName", &"Gaurav Personal Notes");
            let _ = key.set_value("Publisher", &"Gaurav Patil");
            if let Some(ref exe) = current_exe_str {
                let _ = key.set_value("DisplayIcon", &format!("\"{}\",0", exe));
            }
            if let Some(ref dir) = current_dir {
                let _ = key.set_value("InstallLocation", dir);
            }
        }
        eprintln!("[GPN Registry] Updated HKCU\\{} DisplayVersion to {}", canonical_subkey, clean_ver);
    }

    // 2. Local Machine Registry (In case installed for all users / elevated)
    if let Ok(key) = hklm.open_subkey_with_flags(canonical_subkey, KEY_WRITE) {
        let _ = key.set_value("DisplayVersion", &clean_ver);
        let _ = key.set_value("Version", &clean_ver);
        let _ = key.set_value("VersionMajor", &major);
        let _ = key.set_value("VersionMinor", &minor);
        eprintln!("[GPN Registry] Updated HKLM\\{} DisplayVersion to {}", canonical_subkey, clean_ver);
    }

    // 3. WOW6432Node Local Machine
    let wow_subkey = r"Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\Gaurav Personal Notes";
    if let Ok(key) = hklm.open_subkey_with_flags(wow_subkey, KEY_WRITE) {
        let _ = key.set_value("DisplayVersion", &clean_ver);
        let _ = key.set_value("Version", &clean_ver);
        let _ = key.set_value("VersionMajor", &major);
        let _ = key.set_value("VersionMinor", &minor);
    }
}

#[tauri::command]
pub fn cmd_sync_windows_installed_version(app: tauri::AppHandle, version: Option<String>) -> Result<String, String> {
    let ver = version.unwrap_or_else(|| app.package_info().version.to_string());
    #[cfg(target_os = "windows")]
    {
        sync_windows_installed_version(&ver);
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = ver;
    }
    Ok(ver)
}

#[tauri::command]
pub fn cmd_write_update_staging_file(file_name: String, bytes: Vec<u8>) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::io::Write;
        let temp_dir = std::env::temp_dir().join("com.gpn.desktop");
        let _ = std::fs::create_dir_all(&temp_dir);
        let target_file = temp_dir.join(file_name);
        let mut file = std::fs::File::create(&target_file)
            .map_err(|e| format!("Could not create staging file: {}", e))?;
        file.write_all(&bytes)
            .map_err(|e| format!("Could not write staging file: {}", e))?;
        file.flush()
            .map_err(|e| format!("Could not flush staging file: {}", e))?;
        Ok(target_file.to_string_lossy().to_string())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (file_name, bytes);
        Err("Supported on Windows".to_string())
    }
}

#[tauri::command]
pub fn cmd_apply_in_process_update(
    app: tauri::AppHandle,
    binary_bytes: Option<Vec<u8>>,
    staging_path: Option<String>,
    target_version: Option<String>,
) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::io::Write;
        use std::os::windows::process::CommandExt;

        let bytes = if let Some(b) = binary_bytes {
            b
        } else if let Some(ref path_str) = staging_path {
            std::fs::read(path_str)
                .map_err(|e| format!("Could not read staged binary from '{}': {}", path_str, e))?
        } else {
            return Err("Neither binary_bytes nor staging_path was provided".to_string());
        };

        crate::supervisor::record_trace("UPDATE", format!("Starting in-process atomic update with {} payload bytes", bytes.len()));

        // Pre-sync Windows Installed Apps registry DisplayVersion
        if let Some(ref ver) = target_version {
            sync_windows_installed_version(ver);
        }

        // 1. Sanity check: payload must not be trivial
        if bytes.len() < 1024 * 512 {
            return Err("Invalid update payload: binary size is unexpectedly small".to_string());
        }

        // 2. Validate Windows PE signature (MZ header)
        if bytes.len() < 2 || bytes[0] != b'M' || bytes[1] != b'Z' {
            return Err("Invalid update payload: missing Windows executable PE header (MZ)".to_string());
        }

        // 3. Resolve currently executing file path
        let current_exe = std::env::current_exe()
            .map_err(|e| format!("Could not resolve current executable path: {}", e))?;

        let parent_dir = current_exe
            .parent()
            .ok_or_else(|| "Could not resolve executable directory".to_string())?;

        let file_name = current_exe
            .file_name()
            .ok_or_else(|| "Could not determine executable name".to_string())?
            .to_string_lossy();

        let old_exe = parent_dir.join(format!("{}.old", file_name));
        let tmp_exe = parent_dir.join(format!("{}.tmp", file_name));

        // Clean any leftover tmp or old file
        if tmp_exe.exists() {
            let _ = std::fs::remove_file(&tmp_exe);
        }
        if old_exe.exists() {
            let _ = std::fs::remove_file(&old_exe);
        }

        // 4. Stage verified binary into temporary staging file first
        {
            let mut file = std::fs::File::create(&tmp_exe)
                .map_err(|e| format!("Could not create staging update file: {}", e))?;
            file.write_all(&bytes)
                .map_err(|e| format!("Could not write update payload: {}", e))?;
            file.flush()
                .map_err(|e| format!("Could not flush update payload to disk: {}", e))?;
        }

        // 5. In-Process NTFS Atomic Shadow Swap:
        // Rename running .exe -> .exe.old
        std::fs::rename(&current_exe, &old_exe)
            .map_err(|e| {
                let _ = std::fs::remove_file(&tmp_exe);
                format!("NTFS rename of running executable failed: {}", e)
            })?;

        // Rename staged .tmp -> .exe
        if let Err(e) = std::fs::rename(&tmp_exe, &current_exe) {
            // Automatic Rollback on failure
            let _ = std::fs::rename(&old_exe, &current_exe);
            let _ = std::fs::remove_file(&tmp_exe);
            return Err(format!("Could not place new executable in-place: {}. Restored existing version.", e));
        }

        // Clean staging file if provided
        if let Some(ref path_str) = staging_path {
            let _ = std::fs::remove_file(path_str);
        }

        crate::supervisor::record_trace("UPDATE", "NTFS Atomic Swap successful! Spawning detached watchdog");
        eprintln!("[GPN Swapper] NTFS Atomic Swap successful! Spawning self-healing watchdog...");

        // 6. Spawn detached Windows self-healing launcher that:
        //    a) Waits for the old PID to completely terminate (releasing the single-instance mutex)
        //    b) Starts the new executable with foreground flags
        //    c) Monitors for 3 seconds: if the new binary crashes or fails to launch,
        //       it AUTOMATICALLY SELF-HEALS: rolls back to .exe.old and relaunches the safe version!
        let pid = std::process::id();
        let exe_path = current_exe.to_string_lossy().to_string();
        let old_exe_path = old_exe.to_string_lossy().to_string();
        let bad_exe_path = parent_dir
            .join(format!("{}.bad", file_name))
            .to_string_lossy()
            .to_string();
        let target_ver_escaped = target_version.as_deref().unwrap_or("").replace('\'', "''");

        let ps_script = format!(
            "Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase, System.Drawing -ErrorAction SilentlyContinue; \
            $pidToWait = {}; \
            $exe = '{}'; \
            $oldExe = '{}'; \
            $badExe = '{}'; \
            $window = $null; \
            try {{ \
                $xaml = '<Window xmlns=''http://schemas.microsoft.com/winfx/2006/xaml/presentation'' xmlns:x=''http://schemas.microsoft.com/winfx/2006/xaml'' Title=''Gaurav Personal Notes'' Height=''190'' Width=''330'' WindowStartupLocation=''CenterScreen'' WindowStyle=''None'' AllowsTransparency=''True'' Background=''Transparent'' Topmost=''True'' ShowInTaskbar=''False''><Border CornerRadius=''24'' Background=''#ffffff'' BorderBrush=''#e4e4e7'' BorderThickness=''1'' Padding=''22''><Border.Effect><DropShadowEffect BlurRadius=''32'' ShadowDepth=''4'' Opacity=''0.16'' Color=''#000000''/></Border.Effect><StackPanel HorizontalAlignment=''Center'' VerticalAlignment=''Center''><Border Width=''50'' Height=''50'' CornerRadius=''14'' Background=''#f4f4f5'' BorderBrush=''#e4e4e7'' BorderThickness=''1'' HorizontalAlignment=''Center'' Margin=''0,0,0,12''><Image Name=''AppIconImage'' Width=''30'' Height=''30'' HorizontalAlignment=''Center'' VerticalAlignment=''Center''/></Border><TextBlock Text=''Restarting services...'' FontSize=''13'' FontWeight=''SemiBold'' Foreground=''#09090b'' HorizontalAlignment=''Center'' Margin=''0,0,0,6''/><TextBlock Text=''Applying updates cleanly'' FontSize=''11'' Foreground=''#71717a'' HorizontalAlignment=''Center''/></StackPanel></Border></Window>'; \
                $window = [System.Windows.Markup.XamlReader]::Parse($xaml); \
                if (Test-Path $exe) {{ \
                    $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($exe); \
                    $bitmapSource = [System.Windows.Interop.Imaging]::CreateBitmapSourceFromHIcon( \
                        $icon.Handle, \
                        [System.Windows.Int32Rect]::Empty, \
                        [System.Windows.Media.Imaging.BitmapSizeOptions]::FromEmptyOptions() \
                    ); \
                    $img = $window.FindName('AppIconImage'); \
                    if ($img -and $bitmapSource) {{ $img.Source = $bitmapSource; }}; \
                }}; \
                $window.Show(); \
            }} catch {{}}; \
            function PumpEvents {{ \
                try {{ \
                    $frame = New-Object System.Windows.Threading.DispatcherFrame; \
                    [System.Windows.Threading.Dispatcher]::CurrentDispatcher.BeginInvoke( \
                        [System.Windows.Threading.DispatcherPriority]::Background, \
                        [System.Action[Object]]{{ param($f) $f.Continue = $false }}, \
                        $frame \
                    ) | Out-Null; \
                    [System.Windows.Threading.Dispatcher]::PushFrame($frame); \
                }} catch {{}}; \
            }}; \
            $startTime = [System.Diagnostics.Stopwatch]::StartNew(); \
            $waited = 0; \
            while ((Get-Process -Id $pidToWait -ErrorAction SilentlyContinue) -and ($waited -lt 100)) {{ \
                PumpEvents; \
                Start-Sleep -Milliseconds 40; \
                $waited++; \
            }}; \
            if (Get-Process -Id $pidToWait -ErrorAction SilentlyContinue) {{ \
                Stop-Process -Id $pidToWait -Force -ErrorAction SilentlyContinue; \
                Start-Sleep -Milliseconds 100; \
            }}; \
            while ($startTime.ElapsedMilliseconds -lt 5000) {{ \
                PumpEvents; \
                Start-Sleep -Milliseconds 40; \
            }}; \
            if ($window) {{ \
                try {{ $window.Close(); }} catch {{}}; \
            }}; \
            $pauseTimer = [System.Diagnostics.Stopwatch]::StartNew(); \
            while ($pauseTimer.ElapsedMilliseconds -lt 1500) {{ \
                Start-Sleep -Milliseconds 50; \
            }}; \
            $workDir = Split-Path -Parent $exe; \
            $p = Start-Process -FilePath $exe -WorkingDirectory $workDir -ArgumentList '--restarted-after-update','--foreground' -PassThru -ErrorAction SilentlyContinue; \
            if ($p) {{ \
                $crashed = $false; \
                for ($i = 0; $i -lt 30; $i++) {{ \
                    Start-Sleep -Milliseconds 100; \
                    if ($p.HasExited) {{ \
                        $crashed = $true; \
                        break; \
                    }} \
                }}; \
                if ($crashed -and (Test-Path $oldExe)) {{ \
                    Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue; \
                    Move-Item -Path $exe -Destination $badExe -Force -ErrorAction SilentlyContinue; \
                    Move-Item -Path $oldExe -Destination $exe -Force -ErrorAction SilentlyContinue; \
                    Start-Process -FilePath $exe -WorkingDirectory $workDir -ArgumentList '--update-failed-recovered','--foreground' -ErrorAction SilentlyContinue; \
                }} elseif (-not $crashed -and (Test-Path $oldExe)) {{ \
                    Remove-Item -Path $oldExe -Force -ErrorAction SilentlyContinue; \
                    if ('{}' -ne '') {{ \
                        Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Gaurav Personal Notes' -Name 'DisplayVersion' -Value '{}' -ErrorAction SilentlyContinue; \
                    }} \
                }} \
            }} else {{ \
                if (Test-Path $oldExe) {{ \
                    Move-Item -Path $exe -Destination $badExe -Force -ErrorAction SilentlyContinue; \
                    Move-Item -Path $oldExe -Destination $exe -Force -ErrorAction SilentlyContinue; \
                    Start-Process -FilePath $exe -WorkingDirectory $workDir -ArgumentList '--update-failed-recovered','--foreground' -ErrorAction SilentlyContinue; \
                }} \
            }}",
            pid,
            exe_path.replace('\'', "''"),
            old_exe_path.replace('\'', "''"),
            bad_exe_path.replace('\'', "''"),
            target_ver_escaped,
            target_ver_escaped
        );

        use base64::Engine;
        let utf16_bytes: Vec<u8> = ps_script.encode_utf16().flat_map(|u| u.to_le_bytes()).collect();
        let encoded_cmd = base64::engine::general_purpose::STANDARD.encode(&utf16_bytes);

        // Spawn powershell.exe DIRECTLY with -EncodedCommand and CREATE_NO_WINDOW
        // Using Stdio::null() isolates child handles from parent lifecycle termination,
        // while CREATE_NO_WINDOW (0x08000000) prevents any flashing console/terminal popup
        let spawn_result = std::process::Command::new("powershell.exe")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-WindowStyle",
                "Hidden",
                "-EncodedCommand",
                &encoded_cmd,
            ])
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .creation_flags(0x08000000) // CREATE_NO_WINDOW (100% silent windowless execution)
            .spawn();

        match spawn_result {
            Ok(_) => {
                eprintln!("[GPN Swapper] Self-healing watchdog spawned for PID {}. Terminating current process.", pid);
                // Immediately hide all windows so the app is gone from screen instantly
                for (_label, window) in app.webview_windows() {
                    let _ = window.hide();
                }
                let app_clone = app.clone();
                std::thread::spawn(move || {
                    // Graceful 150ms delay allows the IPC Ok response to reach WebView2 before exit
                    std::thread::sleep(std::time::Duration::from_millis(150));
                    if let Some(state) = app_clone.try_state::<crate::AppState>() {
                        state.sync_cancel_token.cancel();
                        state.db.checkpoint_wal_passive();
                    }
                    app_clone.exit(0);
                    std::process::exit(0);
                });
                Ok(())
            }
            Err(e) => {
                crate::supervisor::record_trace("UPDATE", format!("ERROR: Failed to spawn watchdog launcher: {}. Executing rollback.", e));
                // Rollback if detached launcher couldn't spawn
                let _ = std::fs::remove_file(&current_exe);
                let _ = std::fs::rename(&old_exe, &current_exe);
                Err(format!("Could not spawn restart watcher: {}. Restored previous version.", e))
            }
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (app, binary_bytes, staging_path, target_version);
        Err("In-process atomic swap is supported on Windows".to_string())
    }
}

#[tauri::command]
pub fn cmd_clean_superseded_old_binaries() -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        if let Ok(current_exe) = std::env::current_exe() {
            if let Some(parent) = current_exe.parent() {
                if let Some(file_name) = current_exe.file_name() {
                    let old_exe = parent.join(format!("{}.old", file_name.to_string_lossy()));
                    if old_exe.exists() {
                        let _ = std::fs::remove_file(old_exe);
                    }
                    let bad_exe = parent.join(format!("{}.bad", file_name.to_string_lossy()));
                    if bad_exe.exists() {
                        let _ = std::fs::remove_file(bad_exe);
                    }
                }
                let legacy_old = parent.join("Gaurav Personal Notes.exe.old");
                if legacy_old.exists() {
                    let _ = std::fs::remove_file(legacy_old);
                }
            }
        }
    }
    Ok(true)
}


#[tauri::command]
pub fn cmd_get_clipboard_text() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        use std::ffi::c_void;
        extern "system" {
            fn OpenClipboard(hWndNewOwner: *mut c_void) -> i32;
            fn CloseClipboard() -> i32;
            fn GetClipboardData(uFormat: u32) -> *mut c_void;
            fn IsClipboardFormatAvailable(uFormat: u32) -> i32;
            fn GlobalLock(hMem: *mut c_void) -> *mut c_void;
            fn GlobalUnlock(hMem: *mut c_void) -> i32;
        }

        const CF_UNICODETEXT: u32 = 13;

        unsafe {
            if IsClipboardFormatAvailable(CF_UNICODETEXT) == 0 {
                return Ok(String::new());
            }

            if OpenClipboard(std::ptr::null_mut()) == 0 {
                // Retry once after 25ms if clipboard was momentarily locked by another application
                std::thread::sleep(std::time::Duration::from_millis(25));
                if OpenClipboard(std::ptr::null_mut()) == 0 {
                    return Ok(String::new());
                }
            }

            let handle = GetClipboardData(CF_UNICODETEXT);
            if handle.is_null() {
                let _ = CloseClipboard();
                return Ok(String::new());
            }

            let ptr = GlobalLock(handle) as *const u16;
            if ptr.is_null() {
                let _ = CloseClipboard();
                return Ok(String::new());
            }

            // Find null terminator for wide string
            let mut len = 0;
            while *ptr.add(len) != 0 {
                len += 1;
            }

            let slice = std::slice::from_raw_parts(ptr, len);
            let result = String::from_utf16_lossy(slice);

            let _ = GlobalUnlock(handle);
            let _ = CloseClipboard();

            return Ok(result);
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(String::new())
    }
}

#[tauri::command]
pub fn cmd_set_clipboard_text(text: String) -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        use std::ffi::c_void;
        use std::os::windows::ffi::OsStrExt;

        extern "system" {
            fn OpenClipboard(hWndNewOwner: *mut c_void) -> i32;
            fn CloseClipboard() -> i32;
            fn EmptyClipboard() -> i32;
            fn SetClipboardData(uFormat: u32, hMem: *mut c_void) -> *mut c_void;
            fn GlobalAlloc(uFlags: u32, dwBytes: usize) -> *mut c_void;
            fn GlobalLock(hMem: *mut c_void) -> *mut c_void;
            fn GlobalUnlock(hMem: *mut c_void) -> i32;
            fn GlobalFree(hMem: *mut c_void) -> *mut c_void;
        }

        const CF_UNICODETEXT: u32 = 13;
        const GMEM_MOVEABLE: u32 = 0x0002;

        let wide: Vec<u16> = std::ffi::OsStr::new(&text)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();
        let bytes_len = wide.len() * std::mem::size_of::<u16>();

        unsafe {
            if OpenClipboard(std::ptr::null_mut()) == 0 {
                std::thread::sleep(std::time::Duration::from_millis(25));
                if OpenClipboard(std::ptr::null_mut()) == 0 {
                    return Err("Failed to open clipboard".to_string());
                }
            }

            if EmptyClipboard() == 0 {
                let _ = CloseClipboard();
                return Err("Failed to empty clipboard".to_string());
            }

            let h_mem = GlobalAlloc(GMEM_MOVEABLE, bytes_len);
            if h_mem.is_null() {
                let _ = CloseClipboard();
                return Err("Failed to allocate memory".to_string());
            }

            let ptr = GlobalLock(h_mem) as *mut u16;
            if ptr.is_null() {
                let _ = GlobalFree(h_mem);
                let _ = CloseClipboard();
                return Err("Failed to lock memory".to_string());
            }

            std::ptr::copy_nonoverlapping(wide.as_ptr(), ptr, wide.len());
            let _ = GlobalUnlock(h_mem);

            if SetClipboardData(CF_UNICODETEXT, h_mem).is_null() {
                let _ = GlobalFree(h_mem);
                let _ = CloseClipboard();
                return Err("Failed to set clipboard data".to_string());
            }

            let _ = CloseClipboard();
            return Ok(true);
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = text;
        Ok(true)
    }
}

#[tauri::command]
pub async fn cmd_fetch_update_manifest(url: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .user_agent("curl/8.4.0")
        .connect_timeout(std::time::Duration::from_secs(8))
        .timeout(std::time::Duration::from_secs(12))
        .build()
        .map_err(|e| e.to_string())?;

    let res = client
        .get(&url)
        .header("Cache-Control", "no-cache")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch update manifest: {}", e))?;

    if res.status() == reqwest::StatusCode::NOT_FOUND || res.status() == reqwest::StatusCode::NO_CONTENT {
        // GPHost server reached successfully: confirms no active release is published
        return Ok(r#"{"no_release":true}"#.to_string());
    }

    if !res.status().is_success() {
        return Err(format!("Update server returned HTTP {}", res.status()));
    }

    res.text()
        .await
        .map_err(|e| format!("Failed to read manifest body: {}", e))
}

#[tauri::command]
pub async fn cmd_download_update_binary(url: String) -> Result<Vec<u8>, String> {
    let client = reqwest::Client::builder()
        .user_agent("curl/8.4.0")
        .connect_timeout(std::time::Duration::from_secs(15))
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;

    let res = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to download update binary: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Update download returned HTTP {}", res.status()));
    }

    let bytes = res
        .bytes()
        .await
        .map_err(|e| format!("Failed to read binary stream: {}", e))?;

    Ok(bytes.to_vec())
}

#[tauri::command]
pub fn cmd_get_diagnostics_traces() -> Result<Vec<crate::supervisor::TraceEvent>, String> {
    Ok(crate::supervisor::get_recent_traces())
}

#[tauri::command]
pub fn cmd_record_trace_event(category: String, message: String) -> Result<(), String> {
    crate::supervisor::record_trace(&category, message);
    Ok(())
}

#[tauri::command]
pub fn cmd_get_machine_instance_id(app: tauri::AppHandle) -> Result<String, String> {
    let state = app.try_state::<crate::AppState>().ok_or("AppState not available")?;
    let conn = state.db.get_connection();
    let guard = conn.lock();
    let id: Option<String> = guard
        .query_row(
            "SELECT value FROM app_settings WHERE key = 'machine_instance_id'",
            [],
            |row| row.get(0),
        )
        .ok();

    if let Some(machine_id) = id {
        Ok(machine_id)
    } else {
        let new_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp_millis();
        let _ = guard.execute(
            "INSERT INTO app_settings (key, value, updated_at) VALUES ('machine_instance_id', ?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
            rusqlite::params![new_id, now],
        );
        Ok(new_id)
    }
}



