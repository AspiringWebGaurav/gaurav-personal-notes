# Gaurav Personal Notes (GPN) — Windows Desktop Application

A production-grade, local-first Windows 11 desktop application for **Gaurav Personal Notes**, built with **Tauri 2, Rust, React 19, TypeScript, Vite, Tailwind CSS v4, and Tiptap**.

---

## 🚀 Key Features

- **⚡ Zero-Latency Local-First Core**: Every keystroke, search, and note creation commits synchronously to an embedded modern SQLite database with WAL mode and SQLite FTS5 full-text indexing. UI operations never block on network or Firebase latency ("Saved locally").
- **🔒 Windows Credential Manager Integration**: Auth tokens (ID token, refresh token) are securely stored in the Windows Credential Store using native Win32 APIs via the `keyring` crate. Offline session profile is cached in SQLite `app_settings`.
- **🔄 Bidirectional Firestore Sync Engine**: Background Rust worker polling a durable SQLite `sync_queue`. Pushes local changes to `users/{uid}/notes` and pulls remote updates. Resolves concurrent edits using Last-Write-Wins (LWW) while automatically generating `[Conflict Backup]` notes so you never lose data.
- **⚡ Quick Capture Global Hotkey**: Press `Ctrl + Shift + N` from anywhere in Windows to instantly bring up the floating scratchpad. Type thoughts and press `Ctrl + Enter` to commit to SQLite without leaving your workflow.
- **🔍 Instant SQLite FTS5 Command Palette**: Press `Ctrl + K` to search across all notes with BM25 relevance ranking and instant highlighted excerpts.
- **📝 Tiptap Rich-Text Editor**: Formatted headings, bold, italic, inline code, syntax blocks, task checkboxes, bullet/ordered lists, blockquotes, and real-time word and character counts.
- **🗑️ Trash Lifecycle & Restore**: Soft-delete to Trash, instant restoration, and permanent deletion / empty trash capabilities.
- **🔥 Smart Burn (View-Once Notes)**: Create self-destructing notes that are deleted from Firestore permanently upon first read.
- **🤝 Co-op Room Collaboration**: Compatible with GPN web app's Yjs room structure under `collab_rooms/{roomId}`.
- **💻 Windows 11 Fluent System Tray**: Minimizes to the Windows notification tray on close (`X`), with tray menu actions for quick note capture, sync trigger, restore window, and quit.

---

## 🛠️ Architecture

```text
pc-app/
├── src-tauri/                     # Rust Desktop Backend (Tauri 2)
│   ├── src/
│   │   ├── auth/                  # Windows Credential Manager & OAuth loopback
│   │   ├── db/                    # SQLite manager, WAL mode, FTS5 migrations
│   │   ├── models/                # LocalNote, SyncQueueItem, UserSession
│   │   ├── repository/            # NotesRepository (CRUD, Trash, FTS5)
│   │   ├── sync/                  # Firestore REST sync worker & LWW conflict engine
│   │   ├── commands/              # Tauri IPC command handlers
│   │   ├── tray.rs                # Windows System Tray & menu integration
│   │   └── lib.rs                 # Tauri builder, plugins, and startup hooks
│   └── Cargo.toml                 # Rust dependencies
├── src/                           # Modern React 19 Frontend
│   ├── components/                # Header, Sidebar, NoteEditor, SearchModal, QuickCaptureModal, SmartBurnModal
│   ├── services/                  # Tauri IPC service wrappers
│   ├── stores/                    # Zustand reactive state stores
│   ├── types/                     # TypeScript models
│   └── App.tsx                    # Main desktop application layout
```

---

## ⌨️ Desktop Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + Shift + N` | **Global Quick Capture** (accessible anywhere in Windows) |
| `Ctrl + K` | **FTS5 Full-Text Search Palette** |
| `Ctrl + N` | **New Note** |
| `Ctrl + Enter` | **Save & Dismiss Quick Capture** |
| `Ctrl + B` / `Ctrl + I` | **Bold / Italic formatting** in Tiptap editor |
| `Esc` | **Close modals / Discard** |

---

## 🏃 Getting Started

### Prerequisites

- **Node.js**: v18+ (tested on v26)
- **Rust Toolchain**: 1.78+ (`rustc` & `cargo`)
- **Windows 10/11**

### Running in Development

```bash
cd pc-app
npm install
npm run tauri dev
```

### Running Test Suites

```bash
# Frontend TypeScript build validation
cd pc-app
npm run build

# Rust backend unit tests (FTS5 search, CRUD, sync queue, auth, conflict resolution)
cd pc-app/src-tauri
cargo test --lib
```

### Building Windows Release Installer (NSIS)

```bash
cd pc-app
npm run tauri build
```

The resulting standalone Windows installer (`.exe`) is generated under `pc-app/src-tauri/target/release/bundle/nsis/`.
