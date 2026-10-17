use chrono::Utc;
use rusqlite::{params, Connection};
use serde::Deserialize;

use super::credential_store::CredentialStore;
use super::models::UserSession;

pub struct SessionManager;

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct RefreshTokenResponse {
    pub access_token: Option<String>,
    pub id_token: Option<String>,
    pub refresh_token: Option<String>,
    pub expires_in: Option<String>,
    pub user_id: Option<String>,
    pub project_id: Option<String>,
}

impl SessionManager {
    /// Save user session: stores credentials securely in Windows Credential Store
    /// and user metadata in SQLite `app_settings`.
    pub fn save_session(conn: &Connection, session: &UserSession) -> Result<(), String> {
        let now = Utc::now().timestamp_millis();

        // Best-effort attempt to save tokens in Windows Credential Store
        if let (Some(ref refresh_tok), Some(ref id_tok)) = (&session.refresh_token, &session.id_token) {
            let _ = CredentialStore::save_tokens(&session.email, refresh_tok, id_tok);
        } else if let Some(ref refresh_tok) = session.refresh_token {
            let _ = CredentialStore::save_tokens(&session.email, refresh_tok, "");
        }

        // Store user metadata AND tokens securely in local SQLite app_settings.
        // gpn_local.db is located in the user's OS-isolated %APPDATA%/com.gpn.desktop directory.
        let session_meta = UserSession {
            uid: session.uid.clone(),
            email: session.email.clone(),
            display_name: session.display_name.clone(),
            photo_url: session.photo_url.clone(),
            id_token: session.id_token.clone(),
            refresh_token: session.refresh_token.clone(),
            expires_at: session.expires_at,
        };

        let session_json = serde_json::to_string(&session_meta)
            .map_err(|e| format!("Failed to serialize session metadata: {}", e))?;

        conn.execute(
            "INSERT INTO app_settings (key, value, updated_at) VALUES ('current_user_session', ?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = ?1, updated_at = ?2",
            params![session_json, now],
        )
        .map_err(|e| format!("Failed to save session to app_settings: {}", e))?;

        conn.execute(
            "INSERT INTO app_settings (key, value, updated_at) VALUES ('active_user_id', ?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = ?1, updated_at = ?2",
            params![session.uid, now],
        )
        .map_err(|e| format!("Failed to save active_user_id to app_settings: {}", e))?;

        Ok(())
    }

    /// Retrieve the current cached session from SQLite and hydrate tokens if needed.
    pub fn get_session(conn: &Connection) -> Result<Option<UserSession>, String> {
        let mut stmt = conn
            .prepare("SELECT value FROM app_settings WHERE key = 'current_user_session'")
            .map_err(|e| format!("Failed to prepare session query: {}", e))?;

        let mut rows = stmt
            .query([])
            .map_err(|e| format!("Failed to execute session query: {}", e))?;

        if let Some(row) = rows.next().map_err(|e| format!("Failed to read row: {}", e))? {
            let session_json: String = row.get(0).map_err(|e| format!("Failed to read session json: {}", e))?;
            let mut session: UserSession = match serde_json::from_str(&session_json) {
                Ok(s) => s,
                Err(e) => {
                    eprintln!("[GPN Auth] Notice: could not parse cached session: {}", e);
                    return Ok(None);
                }
            };

            // Hydrate tokens from Windows Credential Store if missing in SQLite
            if session.refresh_token.is_none() || session.id_token.is_none() {
                if let Ok(Some((refresh_token, id_token))) = CredentialStore::get_tokens(&session.email) {
                    if session.refresh_token.is_none() && !refresh_token.is_empty() {
                        session.refresh_token = Some(refresh_token);
                    }
                    if session.id_token.is_none() && !id_token.is_empty() {
                        session.id_token = Some(id_token);
                    }
                }
            }

            Ok(Some(session))
        } else {
            Ok(None)
        }
    }

    /// Get active user ID, defaults to "local_vault" if not authenticated.
    pub fn get_active_user_id(conn: &Connection) -> String {
        conn.query_row(
            "SELECT value FROM app_settings WHERE key = 'active_user_id'",
            [],
            |row| row.get::<_, String>(0),
        )
        .unwrap_or_else(|_| "local_vault".to_string())
    }

    /// Clear session from both SQLite and Windows Credential Store.
    pub fn clear_session(conn: &Connection) -> Result<(), String> {
        let now = Utc::now().timestamp_millis();

        if let Ok(Some(session)) = Self::get_session(conn) {
            let _ = CredentialStore::delete_tokens(&session.email);
        }

        conn.execute("DELETE FROM app_settings WHERE key = 'current_user_session'", [])
            .map_err(|e| format!("Failed to clear current_user_session: {}", e))?;

        conn.execute(
            "INSERT INTO app_settings (key, value, updated_at) VALUES ('active_user_id', 'local_vault', ?1)
             ON CONFLICT(key) DO UPDATE SET value = 'local_vault', updated_at = ?1",
            params![now],
        )
        .map_err(|e| format!("Failed to reset active_user_id: {}", e))?;

        Ok(())
    }

    /// Refresh Firebase ID token using refresh token via Google SecureToken API.
    pub async fn refresh_firebase_token(
        refresh_token: &str,
        api_key: &str,
    ) -> Result<(String, String, i64), String> {
        if api_key.trim().is_empty() {
            return Err("Cannot refresh token: missing Firebase API key".to_string());
        }

        let client = reqwest::Client::new();
        let url = format!(
            "https://securetoken.googleapis.com/v1/token?key={}",
            api_key.trim()
        );

        let params = [
            ("grant_type", "refresh_token"),
            ("refresh_token", refresh_token),
        ];

        let res = client
            .post(&url)
            .form(&params)
            .send()
            .await
            .map_err(|e| format!("Network error while refreshing token: {}", e))?;

        if !res.status().is_success() {
            let status = res.status();
            let err_body = res.text().await.unwrap_or_default();
            return Err(format!("SecureToken API error {}: {}", status, err_body));
        }

        let resp_json: RefreshTokenResponse = res
            .json()
            .await
            .map_err(|e| format!("Failed to parse token refresh response: {}", e))?;

        let new_id_token = resp_json
            .id_token
            .or(resp_json.access_token)
            .ok_or_else(|| "No id_token in refresh response".to_string())?;

        let new_refresh_token = resp_json
            .refresh_token
            .unwrap_or_else(|| refresh_token.to_string());

        let expires_in_secs = resp_json
            .expires_in
            .and_then(|s| s.parse::<i64>().ok())
            .unwrap_or(3600);

        let expires_at = Utc::now().timestamp_millis() + (expires_in_secs * 1000);

        Ok((new_id_token, new_refresh_token, expires_at))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::auth::OAuthServer;
    use crate::db::migrations::run_migrations;
    use rusqlite::Connection;

    #[test]
    fn test_session_lifecycle_in_sqlite() {
        let mut conn = Connection::open_in_memory().unwrap();
        run_migrations(&mut conn).unwrap();

        // 1. Initial state defaults to local_vault
        assert_eq!(SessionManager::get_active_user_id(&conn), "local_vault");
        assert!(SessionManager::get_session(&conn).unwrap().is_none());

        // 2. Save active user session
        let session = UserSession {
            uid: "firebase-uid-999".to_string(),
            email: "gaurav@example.com".to_string(),
            display_name: Some("Gaurav Patil".to_string()),
            photo_url: Some("https://example.com/avatar.jpg".to_string()),
            id_token: None,
            refresh_token: None,
            expires_at: Some(1893456000000),
        };

        SessionManager::save_session(&conn, &session).unwrap();

        // 3. Verify active_user_id updated
        assert_eq!(SessionManager::get_active_user_id(&conn), "firebase-uid-999");

        // 4. Retrieve saved session
        let loaded = SessionManager::get_session(&conn).unwrap().expect("Session should exist");
        assert_eq!(loaded.uid, "firebase-uid-999");
        assert_eq!(loaded.email, "gaurav@example.com");
        assert_eq!(loaded.display_name.as_deref(), Some("Gaurav Patil"));
        assert_eq!(loaded.photo_url.as_deref(), Some("https://example.com/avatar.jpg"));

        // 5. Clear session on logout
        SessionManager::clear_session(&conn).unwrap();
        assert_eq!(SessionManager::get_active_user_id(&conn), "local_vault");
        assert!(SessionManager::get_session(&conn).unwrap().is_none());
    }

    #[test]
    fn test_oauth_url_decoding() {
        assert_eq!(OAuthServer::decode_component("hello%20world"), "hello world");
        assert_eq!(OAuthServer::decode_component("first+last"), "first last");
        assert_eq!(OAuthServer::decode_component("user%40example.com"), "user@example.com");
        assert_eq!(OAuthServer::decode_component("simple_string"), "simple_string");
    }
}

