use super::models::UserSession;
use std::collections::HashMap;
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

pub struct OAuthServer;

impl OAuthServer {
    /// Starts an ephemeral loopback listener and opens the website login page:
    /// - Live custom domain: https://gpnotes.eu.cc/login?port=<port>&theme=<theme>
    /// - Custom override: set GPN_LOGIN_URL environment variable
    pub async fn listen_for_callback(
        timeout_duration: Duration,
        theme: Option<String>,
        mut cancel_rx: tokio::sync::oneshot::Receiver<()>,
    ) -> Result<(u16, UserSession), String> {
        let listener = TcpListener::bind("127.0.0.1:0")
            .await
            .map_err(|e| format!("Failed to bind local loopback listener: {}", e))?;

        let port = listener
            .local_addr()
            .map_err(|e| format!("Failed to get local port: {}", e))?
            .port();

        let theme_str = theme.unwrap_or_else(|| "light".to_string());

        // Production custom domain by default, overrideable in local dev via GPN_LOGIN_URL
        let base_url = if let Ok(custom) = std::env::var("GPN_LOGIN_URL") {
            custom
        } else {
            "https://gpnotes.eu.cc".to_string()
        };

        let auth_url = format!("{}/login?port={}&theme={}&prompt=select_account", base_url, port, theme_str);

        // Open the user's default browser directly to the website login page
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            let _ = std::process::Command::new("cmd")
                .args(["/C", "start", "", &auth_url])
                .creation_flags(0x08000000)
                .spawn();
        }
        #[cfg(not(target_os = "windows"))]
        {
            let _ = std::process::Command::new("open")
                .arg(&auth_url)
                .spawn();
        }

        // MPSC channels to receive UserSession or web cancellation
        let (session_tx, mut session_rx) = tokio::sync::mpsc::channel::<UserSession>(1);
        let (web_cancel_tx, mut web_cancel_rx) = tokio::sync::mpsc::channel::<()>(1);

        // Spawn non-blocking connection handler task
        let session_tx_clone = session_tx.clone();
        let web_cancel_tx_clone = web_cancel_tx.clone();
        let target_redirect = auth_url.clone();
        let loopback_port = port;

        let accept_handle = tokio::spawn(async move {
            while let Ok((mut socket, _)) = listener.accept().await {
                let tx = session_tx_clone.clone();
                let cancel_tx = web_cancel_tx_clone.clone();
                let theme_val = theme_str.clone();
                let redirect_url = target_redirect.clone();
                let port_val = loopback_port;

                tokio::spawn(async move {
                    let mut buffer = [0u8; 8192];
                    // Fast timeout so idle or speculative preconnect sockets don't hang
                    let bytes_read = match tokio::time::timeout(
                        Duration::from_secs(3),
                        socket.read(&mut buffer),
                    )
                    .await
                    {
                        Ok(Ok(n)) if n > 0 => n,
                        _ => {
                            let _ = socket.shutdown().await;
                            return;
                        }
                    };

                    let request = String::from_utf8_lossy(&buffer[..bytes_read]);

                    if let Some(first_line) = request.lines().next() {
                        // Immediately answer favicon requests without hanging
                        if first_line.starts_with("GET /favicon.ico") {
                            let resp = "HTTP/1.1 204 No Content\r\nConnection: close\r\n\r\n";
                            let _ = socket.write_all(resp.as_bytes()).await;
                            let _ = socket.flush().await;
                            let _ = socket.shutdown().await;
                            return;
                        }

                        // CORS pre-flight
                        if first_line.starts_with("OPTIONS ") {
                            let resp = "HTTP/1.1 204 No Content\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type\r\nConnection: close\r\n\r\n";
                            let _ = socket.write_all(resp.as_bytes()).await;
                            let _ = socket.flush().await;
                            let _ = socket.shutdown().await;
                            return;
                        }

                        // If user cancels from web page or hits /cancel
                        if first_line.starts_with("GET /cancel") {
                            let template = Self::get_cancel_response_html();
                            let html = template
                                .replace("{{THEME}}", &theme_val)
                                .replace("{{PORT}}", &port_val.to_string());

                            let response = format!(
                                "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=UTF-8\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, OPTIONS\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                                html.len(),
                                html
                            );

                            let _ = socket.write_all(response.as_bytes()).await;
                            let _ = socket.flush().await;
                            let _ = socket.shutdown().await;

                            let _ = cancel_tx.send(()).await;
                            return;
                        }

                        // If user visits /login or root on the loopback port, redirect to the website login page
                        if first_line.starts_with("GET /login") || first_line.starts_with("GET / ") {
                            let redirect_resp = format!(
                                "HTTP/1.1 302 Found\r\nLocation: {}\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n",
                                redirect_url
                            );
                            let _ = socket.write_all(redirect_resp.as_bytes()).await;
                            let _ = socket.flush().await;
                            let _ = socket.shutdown().await;
                            return;
                        }

                        // Callback with user credentials from website Google sign-in
                        if first_line.starts_with("GET /callback") {
                            let query_string = first_line
                                .split_whitespace()
                                .nth(1)
                                .and_then(|path| path.split('?').nth(1))
                                .unwrap_or_default();

                            let params = Self::parse_query_string(query_string);

                            let uid = params.get("uid").cloned().unwrap_or_default();
                            let email = params.get("email").cloned().unwrap_or_default();
                            let display_name = params.get("displayName").cloned();
                            let photo_url = params.get("photoUrl").cloned();
                            let id_token = params.get("idToken").cloned();
                            let refresh_token = params.get("refreshToken").cloned();

                            let display_name_val = display_name.clone().unwrap_or_else(|| "GPN Operator".to_string());
                            let email_val = email.clone();
                            let photo_url_val = photo_url.clone().unwrap_or_default();

                            let template = Self::get_response_html();
                            let html = template
                                .replace("{{THEME}}", &theme_val)
                                .replace("{{DISPLAY_NAME}}", &display_name_val)
                                .replace("{{EMAIL}}", &email_val)
                                .replace("{{PHOTO_URL}}", &photo_url_val)
                                .replace("{{PORT}}", &port_val.to_string());

                            let response = format!(
                                "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=UTF-8\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                                html.len(),
                                html
                            );

                            let _ = socket.write_all(response.as_bytes()).await;
                            let _ = socket.flush().await;
                            let _ = socket.shutdown().await;

                            if !uid.is_empty() && !email.is_empty() {
                                let _ = tx
                                    .send(UserSession {
                                        uid,
                                        email,
                                        display_name,
                                        photo_url,
                                        id_token,
                                        refresh_token,
                                        expires_at: Some(
                                            chrono::Utc::now().timestamp_millis() + 3600 * 1000,
                                        ),
                                    })
                                    .await;
                            }
                            return;
                        }
                    }

                    // Unknown route
                    let not_found = "HTTP/1.1 404 NOT FOUND\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
                    let _ = socket.write_all(not_found.as_bytes()).await;
                    let _ = socket.flush().await;
                    let _ = socket.shutdown().await;
                });
            }
        });

        // Await user session, explicit cancellation, web cancellation, or timeout
        let result = tokio::select! {
            session_opt = session_rx.recv() => {
                match session_opt {
                    Some(session) => Ok((port, session)),
                    None => Err("Auth callback channel closed".to_string()),
                }
            }
            _ = &mut cancel_rx => {
                Err("Login cancelled by user".to_string())
            }
            _ = web_cancel_rx.recv() => {
                Err("Login cancelled by user".to_string())
            }
            _ = tokio::time::sleep(timeout_duration) => {
                Err("OAuth login timed out or was cancelled".to_string())
            }
        };

        // Anti-looping cleanup: immediately abort the background listener task so the port is released instantly
        accept_handle.abort();

        result
    }

    fn get_response_html() -> &'static str {
        r##"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Signed In — Gaurav Personal Notes</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #ffffff;
            --text-primary: #18181b;
            --text-secondary: #71717a;
            --text-muted: #a1a1aa;
            --border: #e4e4e7;
            --border-subtle: #f4f4f5;
            --accent: #10b981;
            --btn-bg: #18181b;
            --btn-text: #ffffff;
            --btn-hover: #27272a;
            --badge-bg: #f4f4f5;
            --badge-text: #52525b;
            --kbd-bg: #f4f4f5;
            --kbd-border: #e4e4e7;
            --kbd-text: #71717a;
        }

        html.dark, body.dark {
            --bg: #09090b;
            --text-primary: #fafafa;
            --text-secondary: #a1a1aa;
            --text-muted: #71717a;
            --border: #27272a;
            --border-subtle: #18181b;
            --accent: #10b981;
            --btn-bg: #fafafa;
            --btn-text: #09090b;
            --btn-hover: #e4e4e7;
            --badge-bg: #18181b;
            --badge-text: #a1a1aa;
            --kbd-bg: #18181b;
            --kbd-border: #27272a;
            --kbd-text: #a1a1aa;
        }

        @media (prefers-color-scheme: dark) {
            html:not(.light), body:not(.light) {
                --bg: #09090b;
                --text-primary: #fafafa;
                --text-secondary: #a1a1aa;
                --text-muted: #71717a;
                --border: #27272a;
                --border-subtle: #18181b;
                --accent: #10b981;
                --btn-bg: #fafafa;
                --btn-text: #09090b;
                --btn-hover: #e4e4e7;
                --badge-bg: #18181b;
                --badge-text: #a1a1aa;
                --kbd-bg: #18181b;
                --kbd-border: #27272a;
                --kbd-text: #a1a1aa;
            }
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: var(--bg);
            color: var(--text-primary);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            transition: background-color 0.2s ease, color 0.2s ease;
            -webkit-font-smoothing: antialiased;
        }

        /* Webpage Header */
        .site-header {
            width: 100%;
            height: 3.5rem;
            border-bottom: 1px solid var(--border-subtle);
            padding: 0 clamp(1.25rem, 4vw, 3rem);
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: sticky;
            top: 0;
            background: var(--bg);
            z-index: 20;
        }

        .brand {
            display: flex;
            align-items: center;
            gap: 10px;
            text-decoration: none;
            color: var(--text-primary);
        }

        .brand-icon {
            width: 28px;
            height: 28px;
            border-radius: 7px;
            background: var(--text-primary);
            color: var(--bg);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .brand-name {
            font-size: 0.95rem;
            font-weight: 600;
            letter-spacing: -0.01em;
        }

        .header-right {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .header-status {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 5px 12px;
            border-radius: 9999px;
            background: var(--badge-bg);
            border: 1px solid var(--border);
            font-size: 0.8rem;
            font-weight: 500;
            color: var(--badge-text);
        }

        .status-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background-color: var(--accent);
            box-shadow: 0 0 8px var(--accent);
        }

        .theme-btn {
            width: 34px;
            height: 34px;
            border-radius: 8px;
            border: 1px solid var(--border);
            background: var(--bg);
            color: var(--text-primary);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .theme-btn:hover {
            background: var(--badge-bg);
            border-color: var(--text-muted);
        }

        /* Webpage Main Content */
        .main-content {
            flex: 1;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 3rem 1.5rem;
        }

        .hero {
            max-width: 440px;
            width: 100%;
            text-align: center;
            margin: 0 auto;
            animation: fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(12px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .avatar-container {
            position: relative;
            width: 72px;
            height: 72px;
            margin: 0 auto 1.5rem;
        }

        .avatar-img {
            width: 72px;
            height: 72px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid var(--border);
            display: block;
        }

        .avatar-fallback {
            width: 72px;
            height: 72px;
            border-radius: 50%;
            background: var(--badge-bg);
            border: 2px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--text-secondary);
        }

        .avatar-badge {
            position: absolute;
            bottom: -2px;
            right: -2px;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: var(--accent);
            border: 2px solid var(--bg);
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        h1 {
            font-size: 1.875rem;
            font-weight: 700;
            letter-spacing: -0.03em;
            margin-bottom: 0.65rem;
            color: var(--text-primary);
        }

        .description {
            font-size: 0.975rem;
            line-height: 1.6;
            color: var(--text-secondary);
            margin-bottom: 0.6rem;
        }

        .email-pill {
            display: inline-block;
            font-size: 0.85rem;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            padding: 4px 10px;
            border-radius: 6px;
            background: var(--badge-bg);
            border: 1px solid var(--border);
            color: var(--text-secondary);
            margin-bottom: 2.25rem;
        }

        .action-area {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
        }

        .btn-primary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 0.8rem 1.85rem;
            border-radius: 8px;
            background-color: var(--btn-bg);
            color: var(--btn-text);
            font-size: 0.925rem;
            font-weight: 600;
            text-decoration: none;
            border: none;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .btn-primary:hover {
            background-color: var(--btn-hover);
            transform: translateY(-1px);
        }

        .btn-primary:active {
            transform: translateY(0);
        }

        .btn-primary.success-state {
            background-color: var(--accent);
            color: #ffffff;
        }

        .hint-text {
            font-size: 0.825rem;
            color: var(--text-muted);
            margin-top: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            flex-wrap: wrap;
        }

        kbd {
            font-family: inherit;
            font-size: 0.775rem;
            padding: 2px 6px;
            border-radius: 4px;
            background: var(--kbd-bg);
            border: 1px solid var(--kbd-border);
            color: var(--kbd-text);
        }

        /* Webpage Footer */
        .site-footer {
            width: 100%;
            height: 3rem;
            border-top: 1px solid var(--border-subtle);
            padding: 0 clamp(1.25rem, 4vw, 3rem);
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 0.8rem;
            color: var(--text-muted);
            background: var(--bg);
        }
    </style>
</head>
<body>
    <header class="site-header">
        <div class="brand">
            <div class="brand-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
            </div>
            <span class="brand-name">Gaurav Personal Notes</span>
        </div>
        <div class="header-right">
            <div class="header-status">
                <span class="status-dot"></span>
                <span>Connected to Desktop</span>
            </div>
            <button type="button" class="theme-btn" id="themeToggle" onclick="toggleTheme()" aria-label="Toggle theme" title="Toggle theme">
                <svg id="sunIcon" style="display:none;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
                <svg id="moonIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
            </button>
        </div>
    </header>

    <main class="main-content">
        <div class="hero">
            <div class="avatar-container">
                <img id="userAvatar" class="avatar-img" src="{{PHOTO_URL}}" alt="Profile" referrerpolicy="no-referrer" crossorigin="anonymous" style="display:none;" />
                <div id="avatarFallback" class="avatar-fallback">
                    <span id="avatarInitial">G</span>
                </div>
                <div class="avatar-badge">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
            </div>

            <h1>You're signed in</h1>
            <p class="description">
                Welcome back, <strong id="valDisplayName">{{DISPLAY_NAME}}</strong>. Your account is connected and your notes will sync automatically with the desktop app.
            </p>
            <div class="email-pill" id="valEmail">{{EMAIL}}</div>

            <div class="action-area">
                <a href="https://gpnotes.eu.cc" class="btn-primary" id="homeBtn">
                    <span>Go to Website</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M5 12h14"></path>
                        <path d="m12 5 7 7-7 7"></path>
                    </svg>
                </a>
                <p class="hint-text" id="statusHint">
                    <span>You can safely close this tab</span>
                    <span>&bull;</span>
                    <span>or press <kbd id="kbdKey">Ctrl</kbd> + <kbd>W</kbd></span>
                </p>
            </div>
        </div>
    </main>

    <footer class="site-footer">
        <span>&copy; Gaurav Personal Notes</span>
        <span>Notes sync to your account</span>
    </footer>

    <script>
        // Pleasant, soft confirmation chime
        function playChime() {
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                const ctx = new AudioCtx();
                const now = ctx.currentTime;
                
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523.25, now); // C5
                osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.12); // E5
                
                gain.gain.setValueAtTime(0.001, now);
                gain.gain.linearRampToValueAtTime(0.04, now + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
                
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.start(now);
                osc.stop(now + 0.36);
            } catch(e) {}
        }

        window.addEventListener('load', () => {
            setTimeout(playChime, 80);
        });

        // Theme handling
        function applyTheme(theme) {
            const sunIcon = document.getElementById('sunIcon');
            const moonIcon = document.getElementById('moonIcon');
            if (theme === 'dark') {
                document.documentElement.className = 'dark';
                document.body.className = 'dark';
                if (sunIcon) sunIcon.style.display = 'block';
                if (moonIcon) moonIcon.style.display = 'none';
            } else {
                document.documentElement.className = 'light';
                document.body.className = 'light';
                if (sunIcon) sunIcon.style.display = 'none';
                if (moonIcon) moonIcon.style.display = 'block';
            }
        }

        function toggleTheme() {
            const isDark = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
            applyTheme(isDark ? 'light' : 'dark');
        }

        const params = new URLSearchParams(window.location.search);
        let currentTheme = params.get('theme') || '{{THEME}}';
        if (currentTheme !== 'dark' && currentTheme !== 'light') {
            currentTheme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
        }
        applyTheme(currentTheme);

        // Detect OS for shortcut
        const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
        const kbdKey = document.getElementById('kbdKey');
        if (kbdKey && isMac) {
            kbdKey.textContent = '⌘';
        }

        // Profile Picture & Name Population
        const qName = params.get('displayName');
        if (qName && qName !== 'null') {
            document.getElementById('valDisplayName').textContent = qName;
            const firstLetter = qName.trim().charAt(0).toUpperCase();
            if (firstLetter) document.getElementById('avatarInitial').textContent = firstLetter;
        }

        const qEmail = params.get('email');
        if (qEmail && qEmail !== 'null') {
            document.getElementById('valEmail').textContent = qEmail;
        }

        const photoUrl = params.get('photoUrl') || '{{PHOTO_URL}}';
        const imgEl = document.getElementById('userAvatar');
        const fallbackEl = document.getElementById('avatarFallback');

        if (photoUrl && photoUrl !== 'null' && photoUrl.trim() !== '' && photoUrl !== '{{PHOTO_URL}}') {
            imgEl.referrerPolicy = 'no-referrer';
            imgEl.crossOrigin = 'anonymous';
            imgEl.onload = () => {
                imgEl.style.display = 'block';
                fallbackEl.style.display = 'none';
            };
            imgEl.onerror = () => {
                imgEl.style.display = 'none';
                fallbackEl.style.display = 'flex';
            };
            imgEl.src = photoUrl;
        }


        // Silent graceful close attempt (if browser permits closing)
        setTimeout(() => {
            try {
                window.close();
            } catch(e) {}
        }, 900);
    </script>
</body>
</html>"##
    }

    fn get_cancel_response_html() -> &'static str {
        r##"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Sign-in Cancelled — Gaurav Personal Notes</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #ffffff;
            --text-primary: #18181b;
            --text-secondary: #71717a;
            --text-muted: #a1a1aa;
            --border: #e4e4e7;
            --border-subtle: #f4f4f5;
            --btn-bg: #18181b;
            --btn-text: #ffffff;
            --btn-hover: #27272a;
            --badge-bg: #f4f4f5;
            --badge-text: #52525b;
            --kbd-bg: #f4f4f5;
            --kbd-border: #e4e4e7;
            --kbd-text: #71717a;
        }

        html.dark, body.dark {
            --bg: #09090b;
            --text-primary: #fafafa;
            --text-secondary: #a1a1aa;
            --text-muted: #71717a;
            --border: #27272a;
            --border-subtle: #18181b;
            --btn-bg: #fafafa;
            --btn-text: #09090b;
            --btn-hover: #e4e4e7;
            --badge-bg: #18181b;
            --badge-text: #a1a1aa;
            --kbd-bg: #18181b;
            --kbd-border: #27272a;
            --kbd-text: #a1a1aa;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: var(--bg);
            color: var(--text-primary);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            transition: background-color 0.2s ease, color 0.2s ease;
            -webkit-font-smoothing: antialiased;
        }

        .site-header {
            width: 100%;
            height: 3.5rem;
            border-bottom: 1px solid var(--border-subtle);
            padding: 0 clamp(1.25rem, 4vw, 3rem);
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: sticky;
            top: 0;
            background: var(--bg);
            z-index: 20;
        }

        .brand {
            display: flex;
            align-items: center;
            gap: 10px;
            text-decoration: none;
            color: var(--text-primary);
        }

        .brand-icon {
            width: 28px;
            height: 28px;
            border-radius: 7px;
            background: var(--text-primary);
            color: var(--bg);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .brand-name {
            font-size: 0.95rem;
            font-weight: 600;
            letter-spacing: -0.01em;
        }

        .main-content {
            flex: 1;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 3rem 1.5rem;
        }

        .hero {
            max-width: 440px;
            width: 100%;
            text-align: center;
            margin: 0 auto;
            animation: fadeIn 0.25s ease forwards;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .avatar-container {
            width: 64px;
            height: 64px;
            margin: 0 auto 1.5rem;
            border-radius: 50%;
            background: var(--badge-bg);
            border: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--text-secondary);
        }

        h1 {
            font-size: 1.75rem;
            font-weight: 700;
            letter-spacing: -0.03em;
            margin-bottom: 0.65rem;
            color: var(--text-primary);
        }

        .description {
            font-size: 0.95rem;
            line-height: 1.6;
            color: var(--text-secondary);
            margin-bottom: 2rem;
        }

        .action-area {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
        }

        .btn-primary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 0.75rem 1.75rem;
            border-radius: 8px;
            background-color: var(--btn-bg);
            color: var(--btn-text);
            font-size: 0.9rem;
            font-weight: 600;
            text-decoration: none;
            border: none;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .btn-primary:hover {
            background-color: var(--btn-hover);
            transform: translateY(-1px);
        }

        .hint-text {
            font-size: 0.825rem;
            color: var(--text-muted);
            margin-top: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }

        kbd {
            font-family: inherit;
            font-size: 0.775rem;
            padding: 2px 6px;
            border-radius: 4px;
            background: var(--kbd-bg);
            border: 1px solid var(--kbd-border);
            color: var(--kbd-text);
        }

        .site-footer {
            width: 100%;
            height: 3rem;
            border-top: 1px solid var(--border-subtle);
            padding: 0 clamp(1.25rem, 4vw, 3rem);
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 0.8rem;
            color: var(--text-muted);
            background: var(--bg);
        }
    </style>
</head>
<body>
    <header class="site-header">
        <div class="brand">
            <div class="brand-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
            </div>
            <span class="brand-name">Gaurav Personal Notes</span>
        </div>
    </header>

    <main class="main-content">
        <div class="hero">
            <div class="avatar-container">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </div>

            <h1>Sign-in cancelled</h1>
            <p class="description">
                You cancelled the sign-in request. You can safely return to the desktop app.
            </p>

            <div class="action-area">
                <a href="https://gpnotes.eu.cc" class="btn-primary" id="homeBtn">
                    <span>Go to Website</span>
                </a>
                <p class="hint-text">
                    <span>You can safely close this tab</span>
                    <span>&bull;</span>
                    <span>or press <kbd id="kbdKey">Ctrl</kbd> + <kbd>W</kbd></span>
                </p>
            </div>
        </div>
    </main>

    <footer class="site-footer">
        <span>&copy; Gaurav Personal Notes</span>
        <span>Desktop app</span>
    </footer>

    <script>
        const params = new URLSearchParams(window.location.search);
        let currentTheme = params.get('theme') || '{{THEME}}';
        if (currentTheme === 'dark') {
            document.documentElement.className = 'dark';
            document.body.className = 'dark';
        }

        const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
        const kbdKey = document.getElementById('kbdKey');
        if (kbdKey && isMac) {
            kbdKey.textContent = '⌘';
        }

        setTimeout(() => {
            try {
                window.close();
            } catch(e) {}
        }, 900);
    </script>
</body>
</html>"##
    }

    fn parse_query_string(query: &str) -> HashMap<String, String> {
        let mut map = HashMap::new();
        for pair in query.split('&') {
            let mut parts = pair.splitn(2, '=');
            if let (Some(key), Some(val)) = (parts.next(), parts.next()) {
                map.insert(key.to_string(), Self::decode_component(val));
            }
        }
        map
    }

    pub fn decode_component(s: &str) -> String {
        let mut bytes = Vec::new();
        let s_bytes = s.as_bytes();
        let mut i = 0;
        while i < s_bytes.len() {
            if s_bytes[i] == b'%' && i + 2 < s_bytes.len() {
                if let Ok(byte) = u8::from_str_radix(
                    std::str::from_utf8(&s_bytes[i + 1..i + 3]).unwrap_or(""),
                    16,
                ) {
                    bytes.push(byte);
                    i += 3;
                    continue;
                }
            } else if s_bytes[i] == b'+' {
                bytes.push(b' ');
                i += 1;
                continue;
            }
            bytes.push(s_bytes[i]);
            i += 1;
        }
        String::from_utf8_lossy(&bytes).to_string()
    }
}
