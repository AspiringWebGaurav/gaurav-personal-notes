use crate::models::LocalNote;
use crate::sync::SyncWorker;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub fn cmd_list_notes(
    state: State<'_, AppState>,
    is_archived: bool,
) -> Result<Vec<LocalNote>, String> {
    let user_id = state.active_user_id.read().clone();
    state
        .notes_repo
        .list_notes(&user_id, is_archived)
        .map_err(|e| format!("Failed to list notes: {}", e))
}

#[tauri::command]
pub fn cmd_get_note(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<LocalNote>, String> {
    state
        .notes_repo
        .get_note(&id)
        .map_err(|e| format!("Failed to get note: {}", e))
}

#[tauri::command]
pub fn cmd_create_note(
    state: State<'_, AppState>,
    title: String,
    content: String,
    custom_id: Option<String>,
) -> Result<LocalNote, String> {
    let user_id = state.active_user_id.read().clone();
    let note = state
        .notes_repo
        .create_note(&user_id, &title, &content, custom_id)
        .map_err(|e| format!("Failed to create note: {}", e))?;

    SyncWorker::trigger_sync(&state.sync_trigger);
    Ok(note)
}

#[tauri::command]
pub fn cmd_update_note(
    state: State<'_, AppState>,
    id: String,
    title: Option<String>,
    content: Option<String>,
    word_count: Option<i64>,
) -> Result<LocalNote, String> {
    let user_id = state.active_user_id.read().clone();
    let note = state
        .notes_repo
        .update_note(
            &id,
            &user_id,
            title.as_deref(),
            content.as_deref(),
            word_count,
        )
        .map_err(|e| format!("Failed to update note: {}", e))?;

    SyncWorker::trigger_sync(&state.sync_trigger);
    Ok(note)
}

#[tauri::command]
pub fn cmd_move_to_trash(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let user_id = state.active_user_id.read().clone();
    state
        .notes_repo
        .move_to_trash(&id, &user_id)
        .map_err(|e| format!("Failed to move note to trash: {}", e))?;

    SyncWorker::trigger_sync(&state.sync_trigger);
    Ok(())
}

#[tauri::command]
pub fn cmd_restore_from_trash(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let user_id = state.active_user_id.read().clone();
    state
        .notes_repo
        .restore_from_trash(&id, &user_id)
        .map_err(|e| format!("Failed to restore note: {}", e))?;

    SyncWorker::trigger_sync(&state.sync_trigger);
    Ok(())
}

#[tauri::command]
pub fn cmd_delete_note_permanently(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let user_id = state.active_user_id.read().clone();
    state
        .notes_repo
        .delete_note_permanently(&id, &user_id)
        .map_err(|e| format!("Failed to delete note permanently: {}", e))?;

    SyncWorker::trigger_sync(&state.sync_trigger);
    Ok(())
}

#[tauri::command]
pub fn cmd_empty_trash(state: State<'_, AppState>) -> Result<usize, String> {
    let user_id = state.active_user_id.read().clone();
    let count = state
        .notes_repo
        .empty_trash(&user_id)
        .map_err(|e| format!("Failed to empty trash: {}", e))?;

    SyncWorker::trigger_sync(&state.sync_trigger);
    Ok(count)
}

#[tauri::command]
pub fn cmd_search_notes(
    state: State<'_, AppState>,
    query: String,
    is_archived: bool,
) -> Result<Vec<LocalNote>, String> {
    let user_id = state.active_user_id.read().clone();
    state
        .notes_repo
        .search_notes(&user_id, &query, is_archived)
        .map_err(|e| format!("Failed to search notes: {}", e))
}

#[tauri::command]
pub fn cmd_clear_local_database(state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.get_connection();
    let conn_guard = conn.lock();
    conn_guard
        .execute_batch(
            r#"
            DELETE FROM notes;
            DELETE FROM notes_fts;
            DELETE FROM sync_queue;
            VACUUM;
            "#,
        )
        .map_err(|e| format!("Failed to clean database: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn cmd_set_note_sync_mode(
    state: State<'_, AppState>,
    id: String,
    is_local_only: bool,
) -> Result<LocalNote, String> {
    let user_id = state.active_user_id.read().clone();
    let note = state
        .notes_repo
        .set_note_sync_mode(&id, &user_id, is_local_only)
        .map_err(|e| format!("Failed to set note sync mode: {}", e))?;

    if !is_local_only {
        SyncWorker::trigger_sync(&state.sync_trigger);
    }

    Ok(note)
}

#[tauri::command]
pub fn cmd_reindex_notes(state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.db.get_connection();
    let conn_guard = conn.lock();
    conn_guard
        .execute_batch(
            r#"
            INSERT INTO notes_fts(notes_fts) VALUES('rebuild');
            "#,
        )
        .map_err(|e| format!("Failed to rebuild search index: {}", e))?;
    Ok(())
}

