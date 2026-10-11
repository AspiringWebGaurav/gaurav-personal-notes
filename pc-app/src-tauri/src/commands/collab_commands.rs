use crate::auth::CredentialStore;
use crate::sync::FirestoreClient;
use crate::AppState;
use tauri::State;
use uuid::Uuid;

fn get_id_token(state: &State<'_, AppState>) -> Option<String> {
    let conn = state.db.get_connection();
    let conn_guard = conn.lock();
    let email = crate::auth::SessionManager::get_session(&conn_guard)
        .ok()
        .flatten()
        .map(|s| s.email)?;

    CredentialStore::get_tokens(&email)
        .ok()
        .flatten()
        .map(|(_, id_tok)| id_tok)
}

#[tauri::command]
pub async fn cmd_create_burn_note(
    state: State<'_, AppState>,
    content: String,
) -> Result<String, String> {
    let client = FirestoreClient::new("gaurav-personal-notes".to_string());
    let token = Uuid::new_v4().to_string();
    let id_token = get_id_token(&state);

    client
        .create_burn_note(&token, &content, id_token.as_deref())
        .await?;

    Ok(token)
}

#[tauri::command]
pub async fn cmd_read_and_burn_note(
    state: State<'_, AppState>,
    token: String,
) -> Result<Option<String>, String> {
    let client = FirestoreClient::new("gaurav-personal-notes".to_string());
    let id_token = get_id_token(&state);

    client
        .read_and_burn_note(&token, id_token.as_deref())
        .await
}

#[tauri::command]
pub async fn cmd_get_collab_room(
    state: State<'_, AppState>,
    room_id: String,
) -> Result<Option<String>, String> {
    let client = FirestoreClient::new("gaurav-personal-notes".to_string());
    let id_token = get_id_token(&state);

    client.get_collab_room(&room_id, id_token.as_deref()).await
}

#[tauri::command]
pub async fn cmd_update_collab_room(
    state: State<'_, AppState>,
    room_id: String,
    state_update: String,
) -> Result<(), String> {
    let client = FirestoreClient::new("gaurav-personal-notes".to_string());
    let id_token = get_id_token(&state);

    client
        .update_collab_room(&room_id, &state_update, id_token.as_deref())
        .await
}
