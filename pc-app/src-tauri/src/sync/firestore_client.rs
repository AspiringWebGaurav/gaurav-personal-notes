use super::models::RemoteNote;
use reqwest::Client;
use serde_json::Value;

pub struct FirestoreClient {
    client: Client,
    project_id: String,
}

impl FirestoreClient {
    pub fn new(project_id: String) -> Self {
        Self {
            client: Client::builder()
                .connect_timeout(std::time::Duration::from_secs(15))
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .unwrap_or_else(|_| Client::new()),
            project_id,
        }
    }

    fn base_url(&self) -> String {
        format!(
            "https://firestore.googleapis.com/v1/projects/{}/databases/(default)/documents",
            self.project_id
        )
    }

    pub(crate) fn parse_firestore_timestamp(v: Option<&Value>, fallback: i64) -> i64 {
        if let Some(val) = v {
            if let Some(s) = val.get("integerValue").and_then(|x| x.as_str()) {
                if let Ok(n) = s.parse::<i64>() {
                    return n;
                }
            }
            if let Some(n) = val.get("integerValue").and_then(|x| x.as_i64()) {
                return n;
            }
            if let Some(f) = val.get("doubleValue").and_then(|x| x.as_f64()) {
                return f as i64;
            }
            if let Some(s) = val.get("timestampValue").and_then(|x| x.as_str()) {
                if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(s) {
                    return dt.timestamp_millis();
                }
            }
            if let Some(s) = val.get("stringValue").and_then(|x| x.as_str()) {
                if let Ok(n) = s.parse::<i64>() {
                    return n;
                }
                if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(s) {
                    return dt.timestamp_millis();
                }
            }
        }
        fallback
    }

    /// Convert RemoteNote to Firestore REST API document format
    pub(crate) fn note_to_firestore_doc(note: &RemoteNote) -> Value {
        serde_json::json!({
            "fields": {
                "title": { "stringValue": note.title },
                "content": { "stringValue": note.content },
                "wordCount": { "integerValue": note.word_count.to_string() },
                "isArchived": { "booleanValue": note.is_archived },
                "createdAt": { "integerValue": note.created_at.to_string() },
                "updatedAt": { "integerValue": note.updated_at.to_string() }
            }
        })
    }

    /// Parse a Firestore REST document into RemoteNote
    pub(crate) fn firestore_doc_to_note(doc: &Value) -> Option<RemoteNote> {
        let name = doc.get("name")?.as_str()?;
        let id = name.rsplit('/').next()?.to_string();

        let fields = doc.get("fields")?;

        let title = fields
            .get("title")
            .and_then(|v| v.get("stringValue"))
            .and_then(|v| v.as_str())
            .unwrap_or("Untitled Note")
            .to_string();

        let content = if let Some(s) = fields.get("content").and_then(|v| v.get("stringValue")).and_then(|v| v.as_str()) {
            s.to_string()
        } else if let Some(val) = fields.get("content") {
            val.to_string()
        } else {
            String::new()
        };

        let word_count = fields
            .get("wordCount")
            .and_then(|v| {
                v.get("integerValue")
                    .and_then(|s| s.as_str())
                    .and_then(|s| s.parse::<i64>().ok())
                    .or_else(|| v.get("integerValue").and_then(|i| i.as_i64()))
            })
            .unwrap_or(0);

        let is_archived = fields
            .get("isArchived")
            .and_then(|v| v.get("booleanValue"))
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        let now = chrono::Utc::now().timestamp_millis();
        let created_at = Self::parse_firestore_timestamp(fields.get("createdAt"), now);
        let updated_at = Self::parse_firestore_timestamp(fields.get("updatedAt"), created_at);

        Some(RemoteNote {
            id,
            title,
            content,
            word_count,
            is_archived,
            created_at,
            updated_at,
        })
    }

    /// List all notes for a user from Firestore
    pub async fn list_notes(
        &self,
        uid: &str,
        id_token: &str,
    ) -> Result<Vec<RemoteNote>, String> {
        let url = format!("{}/users/{}/notes?pageSize=300", self.base_url(), uid);

        let res = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", id_token))
            .send()
            .await
            .map_err(|e| format!("Firestore list request failed: {}", e))?;

        if !res.status().is_success() {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            return Err(format!("Firestore error {}: {}", status, body));
        }

        let body: Value = res
            .json()
            .await
            .map_err(|e| format!("Failed to parse Firestore response: {}", e))?;

        let mut notes = Vec::new();
        if let Some(docs) = body.get("documents").and_then(|d| d.as_array()) {
            for doc in docs {
                if let Some(note) = Self::firestore_doc_to_note(doc) {
                    notes.push(note);
                }
            }
        }

        Ok(notes)
    }

    /// Upsert (create or patch) a note in Firestore
    pub async fn upsert_note(
        &self,
        uid: &str,
        id_token: &str,
        note: &RemoteNote,
    ) -> Result<(), String> {
        let url = format!("{}/users/{}/notes/{}", self.base_url(), uid, note.id);
        let payload = Self::note_to_firestore_doc(note);

        let res = self
            .client
            .patch(&url)
            .header("Authorization", format!("Bearer {}", id_token))
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Firestore upsert request failed: {}", e))?;

        if !res.status().is_success() {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            return Err(format!("Firestore upsert error {}: {}", status, body));
        }

        Ok(())
    }

    /// Delete a note from Firestore
    pub async fn delete_note(
        &self,
        uid: &str,
        id_token: &str,
        note_id: &str,
    ) -> Result<(), String> {
        let url = format!("{}/users/{}/notes/{}", self.base_url(), uid, note_id);

        let res = self
            .client
            .delete(&url)
            .header("Authorization", format!("Bearer {}", id_token))
            .send()
            .await
            .map_err(|e| format!("Firestore delete request failed: {}", e))?;

        if !res.status().is_success() && res.status() != reqwest::StatusCode::NOT_FOUND {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            return Err(format!("Firestore delete error {}: {}", status, body));
        }

        Ok(())
    }

    /// Create a view-once Smart Burn note in Firestore
    pub async fn create_burn_note(
        &self,
        token: &str,
        content: &str,
        id_token: Option<&str>,
    ) -> Result<(), String> {
        let url = format!("{}/burn_notes/{}", self.base_url(), token);
        let now = chrono::Utc::now().timestamp_millis();
        let payload = serde_json::json!({
            "fields": {
                "content": { "stringValue": content },
                "createdAt": { "integerValue": now.to_string() }
            }
        });

        let mut req = self.client.patch(&url).json(&payload);
        if let Some(tok) = id_token {
            req = req.header("Authorization", format!("Bearer {}", tok));
        }

        let res = req
            .send()
            .await
            .map_err(|e| format!("Failed to create burn note: {}", e))?;

        if !res.status().is_success() {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            return Err(format!("Firestore burn note error {}: {}", status, body));
        }

        Ok(())
    }

    /// Read and immediately burn (delete) a view-once note
    pub async fn read_and_burn_note(
        &self,
        token: &str,
        id_token: Option<&str>,
    ) -> Result<Option<String>, String> {
        let url = format!("{}/burn_notes/{}", self.base_url(), token);

        let mut req = self.client.get(&url);
        if let Some(tok) = id_token {
            req = req.header("Authorization", format!("Bearer {}", tok));
        }

        let res = req
            .send()
            .await
            .map_err(|e| format!("Failed to read burn note: {}", e))?;

        if res.status() == reqwest::StatusCode::NOT_FOUND {
            return Ok(None);
        }

        if !res.status().is_success() {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            return Err(format!("Firestore burn read error {}: {}", status, body));
        }

        let body: Value = res
            .json()
            .await
            .map_err(|e| format!("Failed to parse burn note: {}", e))?;

        let content = body
            .get("fields")
            .and_then(|f| f.get("content"))
            .and_then(|c| c.get("stringValue"))
            .and_then(|s| s.as_str())
            .map(|s| s.to_string());

        // Immediately burn it (delete)
        let mut del_req = self.client.delete(&url);
        if let Some(tok) = id_token {
            del_req = del_req.header("Authorization", format!("Bearer {}", tok));
        }
        let _ = del_req.send().await;

        Ok(content)
    }

    /// Retrieve a real-time Co-op room state update from Firestore
    pub async fn get_collab_room(
        &self,
        room_id: &str,
        id_token: Option<&str>,
    ) -> Result<Option<String>, String> {
        let url = format!("{}/collab_rooms/{}", self.base_url(), room_id);

        let mut req = self.client.get(&url);
        if let Some(tok) = id_token {
            req = req.header("Authorization", format!("Bearer {}", tok));
        }

        let res = req
            .send()
            .await
            .map_err(|e| format!("Failed to get collab room: {}", e))?;

        if res.status() == reqwest::StatusCode::NOT_FOUND {
            return Ok(None);
        }

        if !res.status().is_success() {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            return Err(format!("Firestore collab error {}: {}", status, body));
        }

        let body: Value = res
            .json()
            .await
            .map_err(|e| format!("Failed to parse collab room: {}", e))?;

        let state_update = body
            .get("fields")
            .and_then(|f| f.get("stateUpdate"))
            .and_then(|s| s.get("stringValue"))
            .and_then(|s| s.as_str())
            .map(|s| s.to_string());

        Ok(state_update)
    }

    /// Update Co-op room state in Firestore
    pub async fn update_collab_room(
        &self,
        room_id: &str,
        state_update: &str,
        id_token: Option<&str>,
    ) -> Result<(), String> {
        let url = format!("{}/collab_rooms/{}", self.base_url(), room_id);
        let now = chrono::Utc::now().timestamp_millis();
        let payload = serde_json::json!({
            "fields": {
                "stateUpdate": { "stringValue": state_update },
                "updatedAt": { "integerValue": now.to_string() },
                "deleted": { "booleanValue": false }
            }
        });

        let mut req = self.client.patch(&url).json(&payload);
        if let Some(tok) = id_token {
            req = req.header("Authorization", format!("Bearer {}", tok));
        }

        let res = req
            .send()
            .await
            .map_err(|e| format!("Failed to update collab room: {}", e))?;

        if !res.status().is_success() {
            let status = res.status();
            let body = res.text().await.unwrap_or_default();
            return Err(format!("Firestore collab update error {}: {}", status, body));
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_firestore_doc_roundtrip() {
        let original = RemoteNote {
            id: "note-abc-123".to_string(),
            title: "Architecture Decisions".to_string(),
            content: "Local-first with SQLite FTS5".to_string(),
            word_count: 4,
            is_archived: false,
            created_at: 1710000000000,
            updated_at: 1710000050000,
        };

        let json_doc = FirestoreClient::note_to_firestore_doc(&original);

        // Simulate Firestore REST response with name
        let firestore_resp = serde_json::json!({
            "name": format!("projects/p1/databases/(default)/documents/users/u1/notes/{}", original.id),
            "fields": json_doc["fields"]
        });

        let parsed = FirestoreClient::firestore_doc_to_note(&firestore_resp).expect("Failed to parse");

        assert_eq!(parsed.id, original.id);
        assert_eq!(parsed.title, original.title);
        assert_eq!(parsed.content, original.content);
        assert_eq!(parsed.word_count, original.word_count);
        assert_eq!(parsed.is_archived, original.is_archived);
        assert_eq!(parsed.created_at, original.created_at);
        assert_eq!(parsed.updated_at, original.updated_at);
    }
}

