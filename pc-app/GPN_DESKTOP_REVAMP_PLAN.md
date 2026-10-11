# GPN Desktop Architecture & UI/UX Plan: Gaurav Industrial Design & Dual-State Encrypted Vault

This comprehensive specification outlines the architecture and design implementation of the **Gaurav Personal Notes (GPN)** Windows desktop application (`pc-app`), featuring the **Gaurav Industrial Design System** combined with an **Immutable Dual-State Vault**: a zero-cloud local encrypted vault when unsigned, and persistent cloud synchronization when signed in.

> [!IMPORTANT]
> **Strict Local Integrity**: All development and files remain strictly local. No git commits, pushes, or tags are executed. App version is maintained at `0.0.1`.

---

## 1. Dual-State Vault Lifecycle: Pure & Immutable Across Machine Restarts

The desktop application operates under two strictly isolated, immutable states with automatic lifecycle persistence:

```text
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │                            APPLICATION LIFECYCLE                                 │
 └────────────────────────┬─────────────────────────────────┬───────────────────────┘
                          │                                 │
                          ▼                                 ▼
 ┌─────────────────────────────────────────┐  ┌─────────────────────────────────────────┐
 │       STATE A: UNSIGNED / LOCAL         │  │        STATE B: SIGNED / CLOUD          │
 │         (100% Offline Vault)            │  │          (Account Synchronized)         │
 ├─────────────────────────────────────────┤  ├─────────────────────────────────────────┤
 │ • User ID: "local_vault"                │  │ • User ID: Firebase UID (<uid>)         │
 │ • Zero network calls, 0 telemetry       │  │ • Background bidirectional Firestore     │
 │ • Encrypted on disk (AES-256-GCM /      │  │ • Tokens in Windows Credential Store    │
 │   Windows DPAPI machine hardware key)   │  │ • LWW conflict resolution engine        │
 │ • UI Badge: [● LOCAL] / [● OFFLINE]     │  │ • UI Badge: [● LIVE] (Pulsating green)  │
 │ • Taskbar: "GPN — ○ Local"              │  │ • Taskbar: "GPN — ● Live"               │
 │ • Tray Tooltip: "Local Database Active" │  │ • Tray Tooltip: "Live • Cloud Synced"   │
 │ • Account Tab: "Local Encrypted Vault"  │  │ • Account Tab: User Profile & Cloud Sync│
 └─────────────────────────────────────────┘  └─────────────────────────────────────────┘
                          │                                 ▲
                          │    User Signs In with Google    │
                          └─────────────────────────────────┘
                               Migration & Sync Bridge:
               Local encrypted notes safely link to user account,
               push to sync queue, and sync to remote cloud.
```

### State A: Signed Out (Local Encrypted Vault) — 100% Immutable Offline
- **Persistence Across Reboots**: On machine startup, SQLite `app_settings` returns `active_user_id = 'local_vault'` and no session metadata. Windows Credential Store contains no tokens.
- **Privacy & Security**: Zero HTTP requests to Firebase/Google. All notes are saved under `user_id = 'local_vault'`.
- **UI Surface Synchronization**:
  - In-app badge: `[● LOCAL]` (or `[● OFFLINE]` if network adapter disconnected).
  - Taskbar window title: `Gaurav Personal Notes — ○ Local`.
  - Win32 system tray tooltip: `Gaurav Personal Notes — Local Encrypted Vault`.

### State B: Signed In (GPN Cloud Bridge) — 100% Immutable Across Reboots
- **Persistence Across Reboots**: On machine startup, SQLite `app_settings` stores the user's `uid` and profile metadata. Windows Credential Store securely stores `refresh_token` and `id_token`.
- **Automatic Token Refresh**: Firebase ID tokens expire every 60 minutes. On app boot or background sync cycle, if `expires_at` is near or passed, the backend automatically invokes the Google SecureToken API with the saved `refresh_token`, updates the Windows Credential Store, and continues syncing seamlessly.
- **Offline Resilience**: If the machine reboots without an internet connection, the session remains valid locally, active notes remain accessible, and the UI displays `[● OFFLINE]`. As soon as the network reconnects, background sync resumes automatically.
- **Clean Logout Transition**: Upon explicit sign out, tokens are purged from the Windows Credential Store, session metadata is wiped from `app_settings`, active user resets to `'local_vault'`, and notes reload cleanly.

---

## 2. Gaurav Industrial Design System (Original Tokens)

- **Typography**: Clean geometric grotesque with monospace accents (`Inter`, `system-ui`, and `font-mono`).
- **Brand Wordmark**: Lowercase geometric bold (`gpn`, size 22px, `font-bold tracking-tight text-zinc-950`).
- **Headings**: Semibold/Bold sans-serif with a **trailing period** (`Notes.`, `Database.`, `Account.`, `Permissions.`, `Trash.`), size 24–28px.
- **Category Overlines**: Uppercase monospace with wide tracking (`WORKSPACE`, `GAURAV ENGINE`, `OFFLINE VAULT` / `SIGNED IN`, `SYSTEM ACCESS`), size 10–11px.
- **Active Navigation**: Solid `#000000` block with `#FFFFFF` text and sharp `rounded-[2px]` industrial corners.
- **Controls**: High-contrast `[ ON | OFF ]` segmented buttons.
- **Borders & Dividers**: Crisp `#E5E7EB` (`zinc-200`) borders, subtle dashed horizontal dividers.
- **Status Indicators**:
  - `[● LOCAL]`: Muted zinc dot (`bg-zinc-400`).
  - `[● OFFLINE]`: Amber warning dot (`bg-amber-500`).
  - `[● LIVE]`: Pulsating emerald dot (`bg-emerald-500` with ping animation).

---

## 3. High-Impact Navigation Structure

```text
gpn  [● LIVE]
---------------------------- (dashed divider)
[■] Notes          (Notes count badge)
[ ] Database       (Gaurav Engine metrics, FTS5 re-indexer)
[ ] Account        (Cloud Bridge, identity, session management)
[ ] Permissions    (System DPAPI, global hotkeys, Windows autostart)
[ ] Trash          (Recycle bin, instant restore, auto-purge)
---------------------------- (solid divider)
(?) FAQ & Shortcuts (Ctrl+Shift+N, Ctrl+K, Ctrl+N)
(↻) Check updates   (Version 0.0.1)
(☀) Dark / Light mode
(⏻) Quit GPN
```

---

## 4. Multi-Surface Synchronization

| State | In-App Sidebar Badge | Win32 System Tray | Taskbar Window Title |
| :--- | :--- | :--- | :--- |
| **Signed Out (Online)** | `[● LOCAL]` | Gaurav Personal Notes — Local Vault | Gaurav Personal Notes — ○ Local |
| **Signed Out (No Net)** | `[● OFFLINE]` | Gaurav Personal Notes — Local Vault (Offline) | Gaurav Personal Notes — ○ Offline |
| **Signed In (Online)** | `[● LIVE]` (pulsating green) | Gaurav Personal Notes — Live (Synced) | Gaurav Personal Notes — ● Live |
| **Signed In (No Net)** | `[● OFFLINE]` | Gaurav Personal Notes — Offline (Sync Queued) | Gaurav Personal Notes — ○ Offline |
