# GPN PC Application — Architecture & Master Technical Specification

## 1. System Overview & Executive Summary

The **Gaurav Personal Notes (GPN) PC Application** is a native Windows 11 desktop application living within the existing `gaurav-personal-notes` repository under `pc-app/`. It operates side-by-side with the production Next.js web application without modifying or disturbing the web application's codebase or deployment.

### Fundamental Principle: Local-First Desktop Experience
The PC app operates with a **strict local-first architecture**:
- Every reading, writing, searching, and organizing action is executed synchronously against an embedded native **SQLite** database with **FTS5** (Full-Text Search).
- Normal application operations never block on network requests or Firebase latency.
- An asynchronous **Sync Engine** runs in native Rust to synchronize local SQLite state with Firebase Firestore in the background when network connectivity and user authentication are active.
- If Firebase or the internet is completely unavailable, GPN PC remains 100% operational, displaying "Saved locally".

```text
               +------------------------------------------------+
               |              GPN PC Desktop App                |
               |                                                |
               |   +-------------------+                        |
               |   |     React UI      | (Tiptap, Tailwind,     |
               |   |   (Presentation)  |  Zustand, Lucide)      |
               |   +---------+---------+                        |
               |             | Tauri IPC (Least Privilege)      |
               |             v                                  |
               |   +---------+---------+                        |
               |   |    Rust Core      |                        |
               |   |  - Database Mgr   |                        |
               |   |  - FTS5 Search    |                        |
               |   |  - Quick Capture  |                        |
               |   |  - Tray & Hotkeys |                        |
               |   +---------+---------+                        |
               |             |                                  |
               |             v                                  |
               |   +---------+---------+   Durable Queue        |
               |   |   SQLite (Local)  |--------------------+   |
               |   +-------------------+                    |   |
               +--------------------------------------------|---+
                                                            v
                                            +---------------+---------------+
                                            |   Rust Background Sync Engine |
                                            +---------------+---------------+
                                                            |
                                                            | HTTPS / REST
                                                            v
                                            +---------------+---------------+
                                            |       Firebase Firestore      |
                                            |   (Shared with GPN Web App)   |
                                            +---------------+---------------+
```

---

## 2. Decision Classification Matrix

Every architectural decision is explicitly categorized per project governance:

| Decision Area | Status | Evidence / Rationale |
| :--- | :--- | :--- |
| **Monorepo / Location** | `CONFIRMED` | Placed inside `pc-app/` in existing repository; no git submodule, no separate repo. |
| **Existing Web Protection** | `CONFIRMED` | Zero modifications to Next.js routes, components, or configurations in root `src/`. |
| **UI Framework** | `CONFIRMED` | React 19 + TypeScript + Vite + Tailwind CSS v4. |
| **Desktop Shell** | `CONFIRMED` | Tauri 2 (`@tauri-apps/cli` 2.12.1, `tauri` crate 2.x) running on Windows 11. |
| **Local Database** | `CONFIRMED` | `rusqlite` with `bundled` (embedding modern SQLite with FTS5 compiled natively). |
| **Data Model Compatibility** | `CONFIRMED` | Matches Firestore schema: `users/{userId}/notes/{noteId}`, `burn_notes`, `collab_rooms`. |
| **Collaboration Engine** | `CONFIRMED` | Yjs + Tiptap + WebRTC (signaling: `wss://signaling.yjs.dev`, Heroku fallback) matches web. |
| **Smart Burn Crypto** | `CONFIRMED` | AES-256-GCM 256-bit key hex format matches web `crypto.ts`. |
| **OAuth Flow for Desktop** | `PROPOSED` | Local loopback redirect (`127.0.0.1:port/callback`) + system browser Google Sign-In with token storage in Windows DPAPI / Credential Manager. |
| **Search Engine** | `CONFIRMED` | SQLite FTS5 with unicode61 & Porter stemmer; zero cloud dependency. |
| **Quick Capture** | `CONFIRMED` | Global hotkey `Ctrl+Shift+N` opening dedicated lightweight floating capture window. |
| **Auto-update System** | `CONFIRMED` | Official `@tauri-apps/plugin-updater` with signed release manifests. |

---

## 3. Technology Stack & Ecosystem Version Baseline

Carefully selected mutually compatible, latest stable versions:

### Native Desktop & Rust (Host)
- **Rust Toolchain**: `1.98.1` (Current installed stable)
- **Tauri Core**: `2.x` (CLI: `2.12.1`)
- **Tauri Plugins**:
  - `tauri-plugin-notification`: `2.x`
  - `tauri-plugin-autostart`: `2.x`
  - `tauri-plugin-global-shortcut`: `2.x`
  - `tauri-plugin-clipboard-manager`: `2.x`
  - `tauri-plugin-updater`: `2.x`
  - `tauri-plugin-process`: `2.x`
  - `tauri-plugin-dialog`: `2.x`
  - `tauri-plugin-fs`: `2.x`
  - `tauri-plugin-shell`: `2.x`
- **Database**: `rusqlite = "0.40.2"` with features `["bundled"]` (SQLite with FTS5 enabled).
- **Serialization**: `serde = "1.0"`, `serde_json = "1.0"`
- **Async Runtime**: `tokio = { version = "1.43", features = ["full"] }`
- **Networking**: `reqwest = { version = "0.12", features = ["json"] }`
- **Credentials/Security**: `keyring = "3.6"` (Windows Credential Manager integration)
- **UUID & Timestamps**: `uuid = { version = "1.15", features = ["v4", "serde"] }`, `chrono = { version = "0.4", features = ["serde"] }`

### Desktop Web Frontend (`pc-app/src`)
- **Bundler & Runtime**: `Vite` (v8.x / v6.x)
- **Language**: `TypeScript`
- **UI Library**: `React` (`^19.1.0`), `React DOM` (`^19.1.0`)
- **Styling**: `Tailwind CSS` (`^4.0.0`) via `@tailwindcss/vite`
- **State Management**: `zustand` (`^5.0.0`)
- **Icons**: `lucide-react` (`^1.52.0`)
- **Rich Text Editor**: `@tiptap/react` (`^2.27.3`), `@tiptap/starter-kit` (`^2.27.3`), `@tiptap/pm`
- **Collaboration**: `yjs` (`^13.6.33`), `y-webrtc` (`^10.3.0`), `y-indexeddb` (`^9.0.12`)
- **Schema Validation**: `zod` (`^3.24` / `^4.0`)
- **Firebase Client SDK**: `firebase` (`^12.19.0` for auth/presence when online)

---

## 4. Local Database Design (SQLite + FTS5)

The local SQLite database resides securely under:
`%APPDATA%/com.gpn.desktop/gpn_local.db` (or `%LOCALAPPDATA%`).

### Core Schema Migrations

```sql
-- Migration 001: Initial Core Schema
CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT 'Untitled Note',
    content TEXT NOT NULL DEFAULT '',
    word_count INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    remote_updated_at INTEGER NOT NULL DEFAULT 0,
    sync_version INTEGER NOT NULL DEFAULT 1,
    sync_state TEXT NOT NULL DEFAULT 'synced', -- 'synced', 'pending', 'syncing', 'conflict'
    is_deleted INTEGER NOT NULL DEFAULT 0,     -- Soft delete tombstone for syncing
    deleted_at INTEGER DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_user_archive ON notes(user_id, is_archived, is_deleted);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_sync_state ON notes(sync_state);

-- FTS5 Full-Text Search Virtual Table
CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
    id UNINDEXED,
    title,
    content,
    tokenize='porter unicode61'
);

-- FTS Triggers for Synchronous Index Updates
CREATE TRIGGER IF NOT EXISTS trg_notes_after_insert AFTER INSERT ON notes BEGIN
    INSERT INTO notes_fts(id, title, content)
    VALUES (new.id, new.title, new.content);
END;

CREATE TRIGGER IF NOT EXISTS trg_notes_after_update AFTER UPDATE ON notes BEGIN
    DELETE FROM notes_fts WHERE id = old.id;
    INSERT INTO notes_fts(id, title, content)
    VALUES (new.id, new.title, new.content);
END;

CREATE TRIGGER IF NOT EXISTS trg_notes_after_delete AFTER DELETE ON notes BEGIN
    DELETE FROM notes_fts WHERE id = old.id;
END;

-- Durable Sync Queue Table
CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY NOT NULL,
    note_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,       -- 'create', 'update', 'delete', 'archive', 'restore'
    payload TEXT NOT NULL,      -- JSON snapshot of the mutation
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'syncing', 'failed'
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT DEFAULT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, created_at);

-- Sync Metadata & App Settings
CREATE TABLE IF NOT EXISTS sync_metadata (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);
```

---

## 5. Sync Engine Specification

The native Rust sync engine handles two-way synchronization:

```text
Local CRUD Action (React)
          │
          ▼
   Tauri IPC Command
          │
          ▼
SQLite Transaction:
  1. Write/Update Note in `notes`
  2. Insert entry into `sync_queue` (status = 'pending')
  3. Commit
          │
          ▼
Return instant response to UI (< 5ms)
          │
          ▼ (Asynchronous)
Background Sync Worker:
  1. Check Online Status & Auth Credentials
  2. Pick oldest 'pending' items from `sync_queue`
  3. Mark status = 'syncing'
  4. Perform Firestore document operation:
     - create/update: setDoc(users/{uid}/notes/{id})
     - delete: deleteDoc(users/{uid}/notes/{id})
  5. On Success:
     - Delete queue item
     - Update note `sync_state` to 'synced' and `remote_updated_at`
  6. On Failure:
     - Increment `retry_count`
     - Apply exponential backoff (1s, 2s, 4s, 8s, 16s... max 5m)
     - Mark status = 'failed'
```

### Remote Pull (Downstream Sync)
- Pulls remote notes modified since `last_sync_timestamp`.
- Conflict resolution follows **Last-Write-Wins (LWW)** with safe loss prevention:
  - If remote `updatedAt` > local `updated_at`:
    - If local note has NO pending queue items: Overwrite local note with remote copy.
    - If local note HAS pending unpushed edits: Conflict detected!
      - Create a duplicate note titled `[Conflict Backup] <Original Title>` containing the local edits.
      - Apply remote changes to original note.
      - Notify user in UI that conflict was resolved cleanly without data loss.

---

## 6. Authentication Architecture (Windows Desktop)

1. **Authentication Mode**:
   - Google Sign-In via OAuth 2.0 loopback flow (`http://127.0.0.1:<random-port>/auth-callback`).
   - The user clicks "Sign In with Google", opening the system default browser.
   - Upon successful OAuth exchange with Firebase Auth endpoint, token response is returned to loopback server.
2. **Secure Token Storage**:
   - Refresh tokens and user session data are stored securely using **Windows DPAPI** or the Windows Credential Vault via the `keyring` crate.
   - Tokens are NEVER stored in plaintext JSON or standard SQLite unencrypted tables.
3. **Offline Auth Session**:
   - Desktop caches the authenticated user identity (`uid`, `email`, `displayName`).
   - If app opens offline, the cached profile is used immediately. Local notes are visible and editable with zero delay.

---

## 7. Tauri IPC Command Interface

Communication across the webview-to-Rust boundary is strictly typed and validated:

| IPC Command | Arguments | Returns | Description |
| :--- | :--- | :--- | :--- |
| `cmd_list_notes` | `{ is_archived: boolean }` | `Result<Vec<NoteItem>, String>` | Fast query with pagination support |
| `cmd_get_note` | `{ id: string }` | `Result<Option<NoteDetail>, String>` | Fetch single note by ID |
| `cmd_create_note` | `{ title: string, content: string }` | `Result<NoteDetail, String>` | Immediate local insert & queue |
| `cmd_update_note` | `{ id: string, title?: string, content?: string, word_count?: number }` | `Result<NoteDetail, String>` | Debounced local update & queue |
| `cmd_move_to_trash` | `{ id: string }` | `Result<(), String>` | Mark `is_archived = 1` |
| `cmd_restore_from_trash` | `{ id: string }` | `Result<(), String>` | Mark `is_archived = 0` |
| `cmd_delete_note_permanently` | `{ id: string }` | `Result<(), String>` | Soft delete tombstone & delete |
| `cmd_empty_trash` | `{}` | `Result<usize, String>` | Purge all archived notes |
| `cmd_search_notes` | `{ query: string, is_archived: boolean }` | `Result<Vec<NoteItem>, String>` | High-performance FTS5 query |
| `cmd_quick_capture` | `{ title: string, content: string }` | `Result<NoteItem, String>` | From global shortcut window |
| `cmd_get_sync_status` | `{}` | `Result<SyncStatus, String>` | Pending count, last sync time, status |
| `cmd_trigger_sync` | `{}` | `Result<(), String>` | Force sync cycle now |
| `cmd_get_app_settings` | `{}` | `Result<AppSettings, String>` | App preferences |
| `cmd_update_app_settings` | `{ settings: AppSettings }` | `Result<(), String>` | Save app preferences |

---

## 8. Quick Capture (`Ctrl + Shift + N`) Lifecycle

1. Global shortcut registered at application launch via `tauri-plugin-global-shortcut`.
2. When pressed:
   - Floating secondary window `quick-capture` is shown, centered and focused.
   - Auto-focused input box for instant typing.
3. User interaction:
   - `Enter` / `Ctrl+Enter`: Instantly saves note to SQLite via `cmd_quick_capture`, triggers sync queue, hides window.
   - `Escape`: Hides window immediately without writing.

---

## 9. Security & Privacy Architecture

- **Least Privilege Permissions**: Capabilities in `src-tauri/capabilities/default.json` restrict webview to only explicitly defined commands and plugins.
- **Sensitive Key Protection**:
  - Firebase Public API config is exposed only as public client keys (identical to web app).
  - Private tokens/sessions saved in Windows Credential Store.
- **Clipboard Monitor Privacy**:
  - Default: **Disabled**.
  - Enabled only via explicit user opt-in in Settings.
  - Never uploads clipboard content to the cloud without user explicit action.
- **Smart Burn Compatibility**:
  - Uses client-side Web Crypto AES-256-GCM identical to the web app (`src/features/notes/crypto.ts`).
  - Burn notes are view-once and destroyed upon read from `burn_notes/{token}`.

---

## 10. Implementation Phases Plan

- **Phase 0**: Discovery, architecture definition, master specification document (`pc-app/ARCHITECTURE.md`).
- **Phase 1**: Scaffolding Tauri 2 + Vite + React 19 + TypeScript + Tailwind CSS v4 in `pc-app/`. Update root `.gitignore` & `pc-app/.gitignore`. Verify git isolation.
- **Phase 2**: SQLite embedded engine (`rusqlite`), migrations system, note repositories, FTS5 full-text search.
- **Phase 3**: Authentication system with Google OAuth & Windows credential store.
- **Phase 4**: Background Sync Engine (durable queue, Firestore sync, conflict resolution, retry backoff).
- **Phase 5**: Desktop-first UI workspace (Linear/Notion-inspired calm slate design, Tiptap editor, split view).
- **Phase 6**: Quick Capture floating window (`Ctrl + Shift + N`).
- **Phase 7**: Co-op collaboration (Yjs + WebRTC) & Smart Burn view-once notes.
- **Phase 8**: System Tray, autostart with Windows, privacy-first clipboard helper, native notifications.
- **Phase 9**: Windows MSI / NSIS installer packaging & updater configuration.
- **Phase 10**: QA, end-to-end testing, documentation suite completion.
