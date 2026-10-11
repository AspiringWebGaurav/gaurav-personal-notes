use keyring::Entry;

pub const SERVICE_NAME: &str = "com.gpn.desktop";

pub struct CredentialStore;

impl CredentialStore {
    pub fn save_tokens(
        email: &str,
        refresh_token: &str,
        id_token: &str,
    ) -> Result<(), String> {
        if let Ok(entry) = Entry::new(SERVICE_NAME, email) {
            // Windows Credential Manager CredWriteW generic credential blob has a 512-byte limit.
            // A Firebase idToken JWT alone is ~1.2KB. We store the persistent refreshToken (<150 bytes)
            // in keyring and only include id_token if it fits under 200 bytes.
            let payload = serde_json::json!({
                "refreshToken": refresh_token,
                "idToken": if id_token.len() <= 200 { id_token } else { "" }
            })
            .to_string();

            let _ = entry.set_password(&payload);
        }
        Ok(())
    }

    pub fn get_tokens(email: &str) -> Result<Option<(String, String)>, String> {
        let entry = match Entry::new(SERVICE_NAME, email) {
            Ok(e) => e,
            Err(_) => return Ok(None),
        };

        match entry.get_password() {
            Ok(json_str) => {
                let parsed: serde_json::Value = serde_json::from_str(&json_str)
                    .unwrap_or(serde_json::Value::Null);

                let refresh_token = parsed["refreshToken"].as_str().unwrap_or_default().to_string();
                let id_token = parsed["idToken"].as_str().unwrap_or_default().to_string();

                Ok(Some((refresh_token, id_token)))
            }
            _ => Ok(None),
        }
    }

    pub fn delete_tokens(email: &str) -> Result<(), String> {
        if let Ok(entry) = Entry::new(SERVICE_NAME, email) {
            let _ = entry.delete_credential();
        }
        Ok(())
    }
}
