use tauri::Manager;
use tauri_plugin_autostart::ManagerExt;

#[tauri::command]
pub fn cmd_get_autostart_status(app: tauri::AppHandle) -> Result<bool, String> {
    match app.autolaunch().is_enabled() {
        Ok(enabled) => Ok(enabled),
        Err(e) => {
            eprintln!("[GPN Autostart] Query status notice (policy/permission): {}", e);
            Ok(false)
        }
    }
}

#[tauri::command]
pub fn cmd_set_autostart(app: tauri::AppHandle, enabled: bool) -> Result<bool, String> {
    if enabled {
        if let Err(e) = app.autolaunch().enable() {
            eprintln!("[GPN Autostart] Could not enable startup launch: {}", e);
            return Err("Startup permission was not granted by Windows.".to_string());
        }
    } else {
        if let Err(e) = app.autolaunch().disable() {
            eprintln!("[GPN Autostart] Could not disable startup launch: {}", e);
        }
    }
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
    unsafe {
        extern "system" {
            fn GetCurrentProcess() -> isize;
            fn SetProcessWorkingSetSize(
                hProcess: isize,
                dwMinimumWorkingSetSize: usize,
                dwMaximumWorkingSetSize: usize,
            ) -> i32;
        }
        let proc = GetCurrentProcess();
        SetProcessWorkingSetSize(proc, usize::MAX, usize::MAX);
    }
}

#[tauri::command]
pub fn cmd_minimize_to_background(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
        #[cfg(target_os = "windows")]
        trim_process_working_set();
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

    // Attempt 3: PowerShell Start-Process with -Verb runas
    let ps_status = std::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-WindowStyle",
            "Hidden",
            "-Command",
            &format!("Start-Process -FilePath '{}' -Verb runas", path_str.replace("'", "''")),
        ])
        .status();

    if let Ok(status) = ps_status {
        if status.success() {
            return Ok(());
        }
    }

    // Attempt 4: cmd /c start
    let cmd_status = std::process::Command::new("cmd")
        .args(["/c", "start", "", &path_str])
        .status();

    if let Ok(status) = cmd_status {
        if status.success() {
            return Ok(());
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
        let reg_query = std::process::Command::new("powershell")
            .args([
                "-NoProfile",
                "-Command",
                "$u = (Get-ItemProperty -Path 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Gaurav Personal Notes', 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Gaurav Personal Notes' -ErrorAction SilentlyContinue).UninstallString; if ($u) { Write-Output $u }",
            ])
            .output();

        if let Ok(out) = reg_query {
            let reg_str = String::from_utf8_lossy(&out.stdout).trim().trim_matches('"').to_string();
            if !reg_str.is_empty() {
                candidate_paths.push(std::path::PathBuf::from(reg_str));
            }
        }
    }

    // 3. Known default installation directories
    if let Ok(pf) = std::env::var("ProgramFiles") {
        candidate_paths.push(std::path::PathBuf::from(pf).join("Gaurav Personal Notes").join("uninstall.exe"));
    }
    candidate_paths.push(std::path::PathBuf::from("C:\\Program Files\\Gaurav Personal Notes\\uninstall.exe"));
    candidate_paths.push(std::path::PathBuf::from("C:\\Program Files (x86)\\Gaurav Personal Notes\\uninstall.exe"));

    if let Ok(local_app) = std::env::var("LOCALAPPDATA") {
        candidate_paths.push(std::path::PathBuf::from(&local_app).join("Gaurav Personal Notes").join("uninstall.exe"));
        candidate_paths.push(std::path::PathBuf::from(&local_app).join("Programs").join("Gaurav Personal Notes").join("uninstall.exe"));
    }

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
        let _ = std::process::Command::new("cmd")
            .args(["/c", "start", "ms-settings:appsfeatures"])
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
        let _ = std::process::Command::new("cmd")
            .args(["/c", "start", "ms-settings:appsfeatures"])
            .spawn()
            .map_err(|e| format!("Could not open Windows Settings: {}", e))?;
    }
    Ok(())
}