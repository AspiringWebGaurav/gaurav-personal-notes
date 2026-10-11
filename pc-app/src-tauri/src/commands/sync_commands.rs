use crate::sync::{SyncEngine, SyncStatusSummary, SyncWorker};
use crate::AppState;
use tauri::State;

#[tauri::command]
pub fn cmd_trigger_sync(state: State<'_, AppState>) -> Result<(), String> {
    SyncWorker::trigger_manual_sync(&state.sync_trigger, &state.manual_sync_trigger);
    Ok(())
}

#[tauri::command]
pub fn cmd_get_sync_status(state: State<'_, AppState>) -> Result<SyncStatusSummary, String> {
    let conn = state.db.get_connection();
    let conn_guard = conn.lock();
    let uid = state.active_user_id.read().clone();

    Ok(SyncEngine::get_sync_status(&conn_guard, &uid))
}
