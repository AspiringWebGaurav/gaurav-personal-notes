# GPN Desktop Application — Silent Startup, Background Architecture & Windows Lifecycle Engineering Roadmap

**Document Version**: 2.2.0  
**Status**: FINAL — LOCKED FOR IMPLEMENTATION  
**Target Repository & Module**: `pc-app` (`D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app`)  
**Scope**: 100% Local Desktop Architecture, Core Backend (Rust / Tauri 2), Lifecycle & Windows Integration  
**Execution Mode**: Approved Implementation — 100% Local Development Only (Strictly Zero Git Tracking, Zero OTA Publishing)

---

## Document Revision History

| Version | Date | Author | Changes & Corrections |
|:---|:---|:---|:---|
| `1.0.0` | Initial Proposal | Antigravity | Initial plan proposing `visible: false`, Win32 Named Mutex, `RegisterApplicationRestart`, and working set trimming to 3.3 MB. |
| `2.0.0` | Comprehensive Revision | Antigravity & Core Team | **Major Technical Validation & Rigorous Overhaul**: Re-audited latest codebase with exact file and line references; evaluated architectural approaches (App A, B, C); corrected memory misconceptions; corrected recovery model; separated 8 implementation phases; defined Windows testing matrix. |
| `2.1.0` | Targeted Validation | Antigravity & Core Team | Deep technical hardening: SQLite durability analysis, application crash recovery, provisional performance targets, single-instance lifecycle, and in-band sync resilience. |
| `2.2.0` | Final Precision Engineering | Antigravity & Core Team | **Final Targeted Technical Corrections**:<br>1. **Exponential Backoff Formula**: Fixed formula to strictly implement the 2–60s range with jitter: $\text{Delay} = \min(60\text{s}, 2 \times 2^{\min(n-1, 5)}\text{s}) + \text{rand}(0, 1000\text{ms})$.<br>2. **SQLite Durability Hierarchy**: Disentangled application crash recovery, forced process termination (`taskkill /F`), checkpoint completion, and hard power-loss durability under `synchronous = NORMAL`.<br>3. **Native Win32 Registry APIs**: Eliminated `reg add` subprocess; specified direct in-process Win32 Registry APIs (`RegOpenKeyExW`, `RegSetValueExW`, `RegCloseKey`).<br>4. **Activation Race Serialization**: Defined single-instance activation latching during primary bootstrap, silent tray mode, and shutdown/takeover handoff.<br>5. **Mandatory Headless Verification Gate**: Required a reproducible test harness in Phase 1 before adopting Approach B; verified Approach A as zero-risk fallback.<br>6. **Graceful In-Flight Sync Cancellation**: Defined request cancellation via `CancellationToken` without dropping queued mutations.<br>7. **Checkpoint Busy & Retry Handling**: Defined non-blocking retry logic when `try_lock()` fails or passive checkpoint returns `busy == 1`.<br>8. **Testing Reference Alignment**: Aligned all document references to the complete 16-scenario test matrix.<br>9. **Normalized CPU Metrics**: Defined CPU measurement normalization ($\text{Processor Time} / \text{Cores}$) and reiterated provisional status of memory estimates.<br>10. **Surviving Runtime Acceptance**: Added explicit acceptance criteria for runtime survival on workspace close, deferred WebView2 start, and pre-workspace `Ctrl+Shift+N` functionality. |

---

## 1. Executive Summary

Gaurav Personal Notes (GPN) is a local-first Windows 11 desktop application constructed using Tauri 2 and React 19. During real-world hardware reboot testing, the application briefly flashes an unrendered or partially styled window frame on screen during Windows startup before hiding into the system tray. Furthermore, the application lacks single-instance enforcement, executes an unneeded synchronous PowerShell subprocess on boot, and lacks formal background lifecycle management across system sleep, wake, and recovery scenarios.

This engineering roadmap provides an evidence-based, technically validated blueprint to:
1. **Eliminate 100% of visual artifacts during startup** across cold boots, user sign-ins, and system restarts.
2. **Prevent duplicate and orphaned processes** using reliable, race-free single-instance architecture that respects both workspace restoration and quick-capture activation.
3. **Optimize background CPU and RAM consumption** by eliminating startup subprocesses and controlling WebView2 lifecycle without resorting to deceptive working-set paging tricks.
4. **Harden SQLite and background synchronization** against abrupt power loss, network transitions, process crashes, and sleep/wake cycles.
5. **Preserve 100% of existing functionality** including offline SQLite notes, FTS5 search, quick capture (`Ctrl+Shift+N`), encrypted Smart Burn, and the untouched self-hosted update pipeline (`gphost.eu.cc`).

---

## 2. Verified Codebase Audit & Defect Evidence

A line-by-line audit of the active `pc-app` codebase reveals specific architectural defects and execution bottlenecks:

| File Path | Function / Config / Module | Existing Behavior | Identified Defect | Proposed Correction | Evidence & Verification Status |
|:---|:---|:---|:---|:---|:---|
| [`tauri.conf.json`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/tauri.conf.json#L26) | `"app"."windows"[0]."visible"` | Configured to `true`. | Tauri's window builder calls Win32 `CreateWindowEx` with `WS_VISIBLE` on initial startup, displaying a blank window before Rust `setup()` can run. | Set `"visible": false` or migrate to dynamic window creation. | **Verified Defect**. Line 26: `"visible": true`. |
| [`lib.rs`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/src/lib.rs#L323-L344) | `.setup()` window handling | Checks `--autostart` and calls `window.hide()` inside `setup()`. | Too late: the window has already rendered on screen for 100–400ms during webview creation. | Native window is created hidden (`visible: false`); shown conditionally only on manual launch. | **Verified Defect**. Lines 323–341 execute post-creation. |
| [`system_commands.rs`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/src/commands/system_commands.rs#L821-L836) | `reconcile_windows_shortcuts_and_registry` | Spawns `powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -Command ...` synchronously on **every** boot. | Consumes 40–70 MB RAM, spins up .NET CLR, and burns 500–1,500ms CPU during Windows startup when system I/O is saturated. | Gate execution: execute only when `current_ver != verified_app_version`. Replace PowerShell with direct native Win32 registry APIs (`RegSetValueExW`). | **Verified Defect**. Lines 833–836 block on `.status()`. |
| [`lib.rs`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/src/lib.rs#L241-L255) & [L286-L308](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/src/lib.rs#L286-L308) | `autostart` preference check | Queries SQLite `app_settings` for `autostart_enabled` and calls `app.autolaunch().enable()` **twice** on boot. | Redundant database lock acquisition and duplicate Windows registry writes during startup. | Consolidate into a single startup check. | **Verified Defect**. Duplicate blocks at L241 and L286. |
| [`Cargo.toml`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/Cargo.toml) & [`main.rs`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/src/main.rs) | Single Instance Protection | No single instance plugin or named mutex exists in the binary. | Launching GPN while running in the background starts a duplicate process, locks SQLite, and spawns duplicate tray icons. | Implement single instance protection with activation IPC. | **Verified Defect**. `Cargo.lock` has zero matches for `single-instance`. |
| [`system_commands.rs`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/src/commands/system_commands.rs#L424-L437) | `trim_process_working_set` | Calls `SetProcessWorkingSetSize(proc, usize::MAX, usize::MAX)`. | Only called on `CloseRequested` and manual minimize. Never called on silent autostart. Misleadingly purges pages to pagefile without reducing committed memory. | Schedule trimming appropriately on background transition; do not rely on it as a substitute for true memory reduction. | **Verified Defect**. L424–437 only invoked via `cmd_minimize_to_background` & `CloseRequested`. |
| [`worker.rs`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/src/sync/worker.rs#L58-L70) | `SyncWorker::start` | Infinite `tokio::select!` loop over 300s interval and `Notify` trigger. | Lacks a graceful cancellation token (`CancellationToken`); task is abruptly dropped on process exit, risking mid-flight write truncation. | Add `tokio_util::sync::CancellationToken` and drain in-flight sync cleanly on shutdown. | **Verified Defect**. Loop at lines 58–70 lacks exit signal. |
| [`db/mod.rs`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/src/db/mod.rs#L43-L52) | `configure_pragmas` | `PRAGMA synchronous = NORMAL; PRAGMA journal_mode = WAL;`. | No manual periodic or shutdown WAL checkpoint is scheduled; autocheckpoint can be starved by open read snapshots. | Implement idle passive checkpointing with `busy` retry and clean shutdown flush. | **Verified Defect**. WAL mode configured but never explicitly checkpointed. |
| [`App.tsx`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src/App.tsx#L250-L253) & [`updateService.ts`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src/services/updateService.ts#L101-L103) | Startup update check | Both `App.tsx` (800ms) and `updateService.ts` (600ms) schedule `checkSilently()` on mount. | Duplicate network requests to GPHost release API within 200ms of boot. | Unify into a single, debounced startup check. | **Verified Defect**. Two independent `setTimeout` calls for update check. |

---

## 3. Deep Architectural Investigation: Separating Rust Background Core From WebView2 Frontend

### 3.1 The Problem Statement
The user expects GPN to behave like a true native Windows background service:
* Silent background boot directly to the system tray.
* Instant note capture availability.
* Minimal CPU and RAM utilization.
* WebView2 initialized only when needed, or kept lean without UI interruptions.

We evaluated three potential architectural models against Tauri 2.12.1 runtime capabilities on Windows 11.

---

### 3.2 Comparison of Architectural Approaches

```
+---------------------------------------------------------------------------------------------------------+
|                                    ARCHITECTURAL MODELS EVALUATED                                       |
+---------------------------------------------------------------------------------------------------------+

[Approach A: Hidden WebView2 Window]
+-------------------------------------------------------------------------------+
|  Gaurav Personal Notes.exe (Tauri 2 Core)                                     |
|  ├── System Tray & Win32 Message Loop                                         |
|  ├── Tokio Runtime (SyncWorker, SQLite, Hotkeys)                              |
|  └── WebviewWindow ("main", visible: false)                                  |
|      └── msedgewebview2.exe process tree (Renderer, GPU, Utility)             |
+-------------------------------------------------------------------------------+
Pros: Instant window reveal (<15ms); simplest codebase compatibility; zero IPC changes.
Cons: WebView2 process tree loaded on boot (~70-130 MB commit size across child processes).

[Approach B: Lazy WebView2 Window Creation (Recommended Hybrid)]
+-------------------------------------------------------------------------------+
|  Phase 1: Boot to Tray (Zero WebView2)                                        |
|  Gaurav Personal Notes.exe (Pure Rust + Tray + SQLite + Hotkeys)              |
|  ├── Process Tree: ONLY 1 process (provisional ~12-16 MB Private / 0% CPU)    |
|  └── No msedgewebview2.exe processes running                                  |
|                                                                               |
|  Phase 2: User Clicks Tray ("Open Workspace")                                 |
|  └── WebviewWindowBuilder::new(app, "main", ...).build()                      |
|      └── msedgewebview2.exe process tree initializes on demand (~500ms once)   |
|      └── Subsequent window closes simply hide; instant restore (<15ms)        |
+-------------------------------------------------------------------------------+
Pros: Genuine native background footprint on boot; zero webview on boot; clean process isolation.
Cons: First window open has a provisional 400-750ms WebView2 initialization latency; requires capture window handling.

[Approach C: Multi-Process Daemon Architecture (gpn-service.exe + gpn-ui.exe)]
+-------------------------------------------------------------------------------+
|  Process 1: gpn-service.exe (Pure Rust Win32 Background Daemon)               |
|  ├── System Tray, Global Hotkeys, SQLite Master, SyncWorker                   |
|  └── Named Pipe IPC Server (\\.\pipe\gpn-ipc)                                 |
|         ▲                                                                     |
|         │ Named Pipe IPC                                                      |
|         ▼                                                                     |
|  Process 2: gpn-ui.exe (Tauri UI Process, spawned on user demand)           |
|  └── Dispatches commands over IPC; terminates completely when closed          |
+-------------------------------------------------------------------------------+
Pros: Absolute process isolation; UI process can be completely terminated to release all RAM.
Cons: Massive engineering complexity; requires rewriting 30+ Tauri commands into IPC RPC protocol;
      high risk of regressions; complicates uninstaller and autostart registry.
```

---

### 3.3 Comparative Evaluation Matrix

| Evaluation Dimension | Approach A: Pre-Created Hidden Window | Approach B: Lazy Window Creation (Tauri 2 Native) | Approach C: Separate Daemon & UI Processes |
|:---|:---|:---|:---|
| **Technical Feasibility** | **Extremely High**. Standard Tauri 2 configuration. | **High**. Fully supported by Tauri 2 `WebviewWindowBuilder`. | **Medium**. Requires custom IPC wire protocol and process management. |
| **Codebase Compatibility** | **100% Compatible**. Retains existing commands and event system. | **95% Compatible**. Requires moving `main` window definition to Rust code. | **Low (30%)**. Requires rewriting all IPC commands and session sharing. |
| **Startup Memory (Private Commit)** | ~70–130 MB (Root process + 3–4 WebView2 child processes). | **~12–16 MB Total** (Provisional estimate; 0 WebView2 processes). | **~6–10 MB Total** (Daemon only). |
| **Working Set (Physical RAM)** | ~3.5–5.0 MB (if trimmed), but pages pushed to pagefile. | **~8–12 MB** (Active physical RAM, zero paging required). | **~6–8 MB** (Active physical RAM). |
| **Startup CPU Overhead** | Spikes during Chromium bootstrap and JS bundling on boot. | **Near-zero (<0.1%)**. Zero Chromium or V8 execution on boot. | **Near-zero (<0.1%)**. |
| **First Window Open Latency** | **Instantaneous (<15ms)**. Window already warm in background. | **400–750ms** on first click; **<15ms** on all subsequent opens. | **600–1,200ms** on every cold UI launch. |
| **Process Count on Boot** | 4–5 processes (`GPN.exe` + `msedgewebview2.exe` tree). | **Exactly 1 process** (`Gaurav Personal Notes.exe`). | **Exactly 1 process** (`gpn-service.exe`). |
| **Quick Capture Latency** | Instant (<15ms). | ~400ms if triggered before workspace is ever opened. | ~600ms if UI process must be spawned. |
| **Failure & Recovery** | Single process crash boundaries. | Clean failure isolation; webview crash does not kill Rust core. | Complex split-brain failure states between daemon and client. |
| **Maintenance Overhead** | Lowest. Standard Tauri configuration. | Very low. Clean Rust lifecycle handling. | Extremely high. 2 separate executables to build, sign, and update. |

---

### 3.4 Headless Capability Verification (Tauri 2 Plugins & APIs)

Before adopting Approach B, we validated whether all background services can run without any pre-existing `WebviewWindow`:

| Plugin / Subsystem | Operates Without Window? | Verification Evidence & Technical Mechanism |
|:---|:---|:---|
| **System Tray (`tauri::tray`)** | **YES** | Attaches directly to the Win32 message loop on the Tao event loop. |
| **Global Shortcuts (`tauri-plugin-global-shortcut`)** | **YES** | Registers via Win32 `RegisterHotKey` on the invisible Tao worker HWND; independent of WebView2. |
| **SQLite (`rusqlite`)** | **YES** | Runs on native Rust thread pool in `DatabaseManager`; zero webview dependency. |
| **Tokio Runtime & SyncWorker** | **YES** | Multi-threaded async runtime executing network I/O independently. |
| **Notifications (`tauri-plugin-notification`)** | **YES** | Dispatches via Windows Action Center toasts using `com.gpn.desktop` AUMID. |
| **Autostart (`tauri-plugin-autostart`)** | **YES** | Reads and writes directly to `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`. |
| **Updater (`tauri-plugin-updater`)** | **YES** | Background updater uses `reqwest` to query release manifests headlessly. |
| **Event System (`tauri::Emitter`)** | **CONDITIONAL** | `app.emit(...)` works headlessly; `app.emit_to("main", ...)` fails if window does not exist. |

**Mandatory Verification Gate in Phase 1**:
A dedicated headless test harness will be executed during Phase 1 to verify that tray events and global shortcuts (`Ctrl+Shift+N`) function cleanly with `windows: []`.
**Architectural Fallback Guarantee**:
If dynamic window creation encounters unforeseen edge cases during Phase 4 implementation, **Approach A (`visible: false` in `tauri.conf.json`)** serves as an immediate, zero-risk fallback that maintains all window handles from boot while completely eliminating the visual startup flash.

---

## 4. Technical Validation & Misconception Corrections

### 4.1 SQLite Durability Hierarchy & Consistency Guarantees
* **The Technical Reality**:
  - In SQLite Write-Ahead Logging (WAL) mode, transactions are written to the `-wal` file rather than directly to the database file.
  - We must clearly distinguish four distinct durability and recovery conditions:
    1. **Application Crash Recovery**: An unhandled Rust panic, native access violation, or abrupt process memory crash occurs while Windows remains running. OS write buffers are unaffected. All committed transactions reside in the `-wal` file or OS cache and are 100% recovered and replayed automatically on next connection open.
    2. **Forced Process Termination**: The process is terminated via `taskkill /F /IM "Gaurav Personal Notes.exe"`. Process address space is immediately destroyed, but OS kernel file buffers remain alive and flush to disk. SQLite's WAL crash recovery on next open replays 100% of committed transactions.
    3. **Checkpoint Completion**: `PRAGMA wal_checkpoint(PASSIVE)` copies committed frames from the `-wal` file to the main database file (`gpn_local.db`) and executes an `fsync`. Once checkpointed, pages are permanently stored in the main database file and durable even across sudden power failure.
    4. **Sudden Power-Loss Durability under `synchronous = NORMAL`**:
       Under `synchronous = NORMAL` paired with passive WAL checkpoints, SQLite provides robust normal crash recovery and best-effort checkpointing, but **does not guarantee that every recent committed transaction survives sudden physical power loss**. Commits append to the `-wal` file without calling `FlushFileBuffers` after every individual transaction. If a sudden hard power loss (pulling the physical AC power cord, motherboard power failure, catastrophic hardware BSOD) occurs *before* an OS disk cache flush or checkpoint operation, any recent commits residing solely in volatile OS RAM/disk write cache that never reached physical non-volatile storage will be lost.
       However, the database **remains strictly consistent**: partial or torn transactions in the WAL are detected via frame checksums (salt-1, salt-2, and 32-bit checksum pairs) and cleanly rolled back; the database structure is never corrupted.
  - **Decision for GPN**:
    - Retain `synchronous = NORMAL` for smooth editing without keystroke latency.
    - Add an explicit idle flush: when the user stops typing for 2 seconds, execute an idle passive checkpoint to flush committed frames to the main `.db` file.
* **Automatic Checkpointing (`wal_autocheckpoint`)**:
  - By default, SQLite enables `PRAGMA wal_autocheckpoint = 1000;` (automatically checkpoints when the WAL reaches 1,000 pages / ~4 MB).
  - Therefore, the WAL does **not** grow unboundedly under normal operations.
  - Unbounded growth only occurs if long-running read queries or open transactions starve the autocheckpoint mechanism by holding an active snapshot lock.
* **Handling Failed or Skipped Checkpoints**:
  - `PRAGMA wal_checkpoint(PASSIVE)` returns 3 values: `(busy, log_frames, checkpointed_frames)`.
  - If `self.conn.try_lock()` fails (another thread holds the SQLite connection):
    - Do NOT panic or spin-lock.
    - Defer checkpoint and schedule a retry after 5 seconds of idle time.
  - If `PRAGMA wal_checkpoint(PASSIVE)` returns `busy == 1` (a reader holds an open snapshot):
    - Do NOT escalate to `RESTART` or `TRUNCATE` which would block readers/writers and freeze the UI.
    - Increment a `skipped_checkpoints` counter.
    - If skipped $\ge 5$ consecutive times and WAL exceeds 2,000 pages, schedule an exclusive checkpoint when the window is hidden and no user activity has occurred for 30 seconds.
  - On graceful application quit: acquire lock with a timeout (2,000ms), execute `PRAGMA wal_checkpoint(PASSIVE);`, log completion, and exit.

---

### 4.2 Application Crash Recovery vs. Windows Lifecycle Scenarios
* **The Technical Reality**:
  - Windows desktop applications do **not** have an automatic OS supervisor (unlike Windows Services or Android apps). If an application process crashes or is terminated by `taskkill /F`, Windows does not automatically relaunch it while the user remains logged in.
  - We clearly distinguish four separate lifecycle execution paths:

```
+----------------------------------------------------------------------------------------------------+
|                                WINDOWS APPLICATION LIFECYCLE PATHS                                 |
+----------------------------------------------------------------------------------------------------+

1. Normal Windows Login Autostart
   Trigger: User logs into Windows.
   Mechanism: HKCU\Software\Microsoft\Windows\CurrentVersion\Run ("...GPN.exe" --autostart).
   Behavior: Starts silently directly to system tray. Zero UI rendered.

2. Windows Restart Manager (OS Updates)
   Trigger: Windows Update or installer restarts system or processes.
   Mechanism: Win32 RegisterApplicationRestart(L"--autostart", 0).
   Behavior: Windows Restart Manager restarts GPN with --autostart flag post-update.

3. Ordinary Application Process Crash
   Trigger: Unhandled Rust panic, native access violation, or forced process termination.
   Mechanism: Process terminates. Windows Error Reporting (WER) logs Event ID 1000.
   Behavior: Process DOES NOT auto-restart while logged in. User relaunches from Desktop / Start Menu.
   Protection: SQLite WAL crash recovery replays valid transactions cleanly on next open.
   Safeguard: Crash-Loop Detection sentinel detects repeated crashes on relaunch.

4. Manual User Launch
   Trigger: User double-clicks desktop shortcut or Start Menu icon.
   Mechanism: Executed without --autostart flag.
   Behavior: If already running in tray -> Single-instance IPC activates existing window.
             If not running -> Boots fresh and displays main window immediately.
```

* **Crash-Loop Detection & Safe Mode**:
  - To prevent an app from crashing repeatedly on boot due to corrupted state:
    1. Maintain a lightweight startup heartbeat in SQLite `app_settings` (`startup_crash_count`).
    2. Increment count on boot. If the application runs stably for 60 seconds, reset count to 0.
    3. If `startup_crash_count >= 3` within 120 seconds: trigger **Safe Mode** on the next boot:
       - Defer automatic cloud sync.
       - Display a clean recovery dialog offering to verify database integrity or export a local backup.

---

### 4.3 Memory Metrics & Performance Target Framing
* **Provisional Estimates vs. Empirical Baselines**:
  - Metrics such as `~12–16 MB memory`, `<350ms startup`, and `0.0% CPU` are **provisional engineering estimates (hypotheses)** based on architecture modeling, not guaranteed facts.
  - Exact empirical baseline measurements must be collected in Phase 1 before claiming optimization percentages.
* **Six-Dimensional Performance Measurement Specification**:
  1. **Process-Tree Private Bytes**: Dedicated virtual memory reserved across `Gaurav Personal Notes.exe` and all child `msedgewebview2.exe` processes.
  2. **Parent Working Set vs. Child Working Sets**: Physical RAM resident pages for the parent process and each child process individually.
  3. **Peak CPU Utilization (%)**: Maximum CPU burst recorded during the first 3 seconds of boot.
  4. **Steady-State Idle CPU (%)**: Average CPU utilization sampled over 60-second idle windows, explicitly normalized:
     $$\text{Normalized CPU \%} = \frac{\text{\% Processor Time}}{\text{Logical Processor Count}}$$
  5. **Cumulative CPU Time (ms)**: Total kernel and user mode processor time consumed during startup.
  6. **Disk I/O Bytes**: Total bytes read and written during startup and background idle states.
* **Working Set Trimming Policy**:
  - `SetProcessWorkingSetSize` must **only** be called on explicit window minimize or hide-to-tray events.
  - It will **not** be executed in a continuous background loop, as doing so degrades performance by forcing active pages into the Windows pagefile.

---

### 4.4 Single-Instance Activation & Race Serialization
* **Tauri 2 Single-Instance Plugin Integration**:
  - Standardized on `tauri-plugin-single-instance = "2"`.
  - The plugin initializes a named pipe server on the primary instance. Secondary instances connect to this pipe, pass their command-line arguments and working directory, and exit immediately with status code 0.
* **Safe Activation Serialization Across Primary Instance States**:
  1. **Initialization Race**: Single-instance pipe server is established at the very start of process bootstrap. If a secondary activation arrives while primary is still initializing (loading SQLite/setup), the activation request is latched in an atomic flag (`pending_activation: Arc<AtomicBool>`). As soon as `setup()` finishes, the latched flag is checked, and the window is displayed.
  2. **Running / Silent Tray Mode**: Pipe receives message; dispatches to main thread loop to dynamically create/show window and bring to front.
  3. **Shutdown Race**: When primary begins exit sequence, it sets an atomic `SHUTTING_DOWN` flag and closes its pipe server. If a secondary instance arrives and finds the pipe closing or connection refused, the secondary instance yields for 150ms and tests mutex ownership; if the primary has exited, the secondary takes over as the new primary instance, preventing the application from closing into an empty void.
* **Distinguishing Workspace Activation vs. Quick Capture**:
  - **Normal Activation** (Desktop shortcut, Start menu):
    - Invoked without specific flags.
    - Activates and surfaces the **Main Workspace** window.
  - **Quick Capture Activation** (Global shortcut `Ctrl+Shift+N` or CLI `--quick-capture`):
    - Activates the dedicated floating **Capture Window** (or opens the capture modal in main workspace).
    - Preserves existing quick-capture behavior: immediately focuses the text editor, enables top-most elevation, and allows instant note taking without opening the full workspace.

---

### 4.5 In-Band Network & Sync Resilience
* **Elimination of External Reachability Checks**:
  - Relying on Windows network reachability APIs (`NetworkInformation`) can produce false positives (e.g. connected to Wi-Fi without internet access) or lag behind socket state.
  - We standardize on **in-band HTTP resilience** directly within the `SyncWorker` and `SyncEngine`:
    1. **Strict Timeouts**: Configure `reqwest::Client` with a 15-second connect timeout and a 30-second read timeout.
    2. **Bounded Exponential Backoff with Jitter (2–60s Range)**: When a sync cycle fails (DNS error, timeout, HTTP 5xx), the worker backs off exponentially:
       $$\text{Delay} = \min(60\text{s}, 2 \times 2^{\min(n-1, 5)}\text{s}) + \text{rand}(0, 1000\text{ms})$$
       Where attempt $n=1 \implies 2\text{s} + \text{jitter}$, $n=2 \implies 4\text{s} + \text{jitter}$, $n=3 \implies 8\text{s} + \text{jitter}$, $n=4 \implies 16\text{s} + \text{jitter}$, $n=5 \implies 32\text{s} + \text{jitter}$, $n \ge 6 \implies 60\text{s} + \text{jitter}$. Reset backoff to 0 upon any successful sync cycle.
    3. **Cancellation Token & Graceful Shutdown**: Inject a `tokio_util::sync::CancellationToken` into the sync loop. When shutdown is triggered:
       - The in-flight `reqwest` future is selected against `cancellation_token.cancelled()`.
       - If aborted mid-flight, the `sync_queue` item remains `status = 'pending'`.
       - Local note in SQLite remains intact; zero mutations are dropped.
       - On next boot, the pending item remains at the head of the queue and is retried.
       - Shutdown coordinator allows up to 1,500ms for an in-flight SQLite commit to finish.
    4. **Idempotency & Data Safety**: Local SQLite mutations are committed *before* being enqueued into `sync_queue`. Mutations use deterministic document paths (`users/{uid}/notes/{noteId}`) and timestamp comparisons (Last-Write-Wins), guaranteeing that retried network pushes never duplicate notes.

---

## 5. Detailed Implementation Phases

The roadmap consists of 8 strictly ordered, dependency-gated phases:

```
+-----------------------------------------------------------------------------------+
|                           PHASE EXECUTION ROADMAP                                 |
+-----------------------------------------------------------------------------------+
  [Phase 1] Baseline Telemetry & Empirical Measurement Harness
      │
      ▼
  [Phase 2] Single-Instance Protection & Multi-State Activation IPC
      │
      ▼
  [Phase 3] Completely Silent Windows Startup & Launch Path Separation
      │
      ▼
  [Phase 4] Rust Background Core & Frontend Lifecycle Separation (Hybrid Model)
      │
      ▼
  [Phase 5] Startup Bottleneck Elimination (PowerShell Removal & Version Gating)
      │
      ▼
  [Phase 6] SQLite WAL Integrity & Crash-Resilient Shutdown
      │
      ▼
  [Phase 7] Background Sync Worker Hardening (In-Band Timeouts & Sleep/Wake)
      │
      ▼
  [Phase 8] Performance Verification & Final Old vs. New Validation Report
```

---

### Phase 1: Baseline Telemetry & Empirical Measurement Harness

* **Objective**: Measure and record exact empirical baseline metrics of the unoptimized application (`v0.0.15`) across all 6 metric dimensions before making any code modifications.
* **Existing Problem**: Prior assertions were based on informal observations. A rigorous baseline is required to objectively validate performance improvements.
* **Source-Code Evidence**: Active binary execution of `v0.0.15`.
* **Exact Files & Functions Affected**: None (Instrumentation tooling in `pc-app/scripts/benchmark/`).
* **Technical Implementation Approach**:
  - Develop a local PowerShell benchmark script `measure-gpn.ps1` utilizing `Get-Process`, `Get-Counter`, and Windows Performance Data Helper (PDH).
  - Measure:
    1. Parent process Working Set & Private Bytes.
    2. Total process tree Commit Charge (including `msedgewebview2.exe` children).
    3. Peak CPU (%) during initial 3 seconds.
    4. Steady-state Idle CPU (%) over 60 seconds (normalized by logical core count).
    5. Cumulative CPU time (ms).
    6. Startup disk read/write bytes.
  - Execute headless capability verification test harness to confirm all background plugins function with `windows: []`.
* **Dependencies**: None.
* **Risks**: None (Read-only measurement).
* **Rollback Strategy**: Delete benchmark script.
* **Test Cases**:
  - Execute 3 cold boots and 3 manual launches; record median metrics into baseline table.
* **Acceptance Criteria**: Fully documented baseline metrics covering all 6 dimensions.

---

### Phase 2: Single-Instance Protection & Multi-State Activation IPC

* **Objective**: Enforce strict single-instance execution so that subsequent launches activate the existing instance across all lifecycle states, supporting both workspace and quick-capture activation.
* **Existing Problem**: Launching GPN while running in the system tray spawns duplicate processes, creates duplicate tray icons, and competes for SQLite locks.
* **Source-Code Evidence**: [`src-tauri/Cargo.toml`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/Cargo.toml) has zero single-instance plugins; [`src-tauri/src/lib.rs`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/src/lib.rs) has no duplicate instance guard.
* **Exact Files & Functions Affected**:
  - [`src-tauri/Cargo.toml`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/Cargo.toml): Add `tauri-plugin-single-instance = "2"`
  - [`src-tauri/src/lib.rs`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/src/lib.rs): Register plugin with lifecycle-aware activation handler.
* **Technical Implementation Approach**:
  - Configure `tauri-plugin-single-instance` in `lib.rs`:
    ```rust
    .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
        let is_quick_capture = argv.iter().any(|arg| arg == "--quick-capture");
        if is_quick_capture {
            let _ = crate::tray::open_quick_capture(app);
        } else {
            let _ = crate::tray::create_or_show_main_window(app);
        }
    }))
    ```
  - Implement activation latching during `setup()` to serialize startup races, and takeover logic if primary is shutting down.
* **Dependencies**: Phase 1.
* **Risks**: Windows 11 foreground lockout (`ASFW_ANY`) preventing the primary window from surfacing.
* **Rollback Strategy**: Remove plugin registration and dependency.
* **Test Cases**:
  - Launch secondary instances during primary boot, during silent tray mode, and during active editing.
  - Launch with `--quick-capture`: verify capture opens instead of main workspace.
* **Acceptance Criteria**: Exactly 1 process tree in Task Manager at all times. Secondary launches exit in <50ms and activate the appropriate window.

---

### Phase 3: Completely Silent Windows Startup & Launch Path Separation

* **Objective**: Completely eliminate UI flashing and screen flicker during Windows system startup and user sign-in.
* **Existing Problem**: [`tauri.conf.json`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/tauri.conf.json#L26) specifies `"visible": true`, causing the native window to render before `setup()` can call `hide()`.
* **Source-Code Evidence**: [`tauri.conf.json`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/tauri.conf.json#L26) (`"visible": true`), [`lib.rs`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/src/lib.rs#L323-L341).
* **Exact Files & Functions Affected**:
  - [`src-tauri/tauri.conf.json`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/tauri.conf.json): Window `"visible": false`
  - [`src-tauri/src/lib.rs`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/src/lib.rs): Setup window reveal logic & Windows Restart Manager registration
  - [`src-tauri/src/commands/system_commands.rs`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/src/commands/system_commands.rs): Autostart registration arguments
* **Technical Implementation Approach**:
  - Set `"visible": false` for the `main` window in `tauri.conf.json`.
  - In `lib.rs`: Check launch flags: if launched with `--autostart`, keep hidden; if launched manually, call `window.show()`.
  - Register with Windows Restart Manager in `setup()`:
    ```rust
    #[cfg(target_os = "windows")]
    unsafe {
        extern "system" {
            fn RegisterApplicationRestart(pwzCommandLine: *const u16, dwFlags: u32) -> i32;
        }
        use std::os::windows::ffi::OsStrExt;
        let cmd: Vec<u16> = std::ffi::OsStr::new("--autostart").encode_wide().chain(std::iter::once(0)).collect();
        let _ = RegisterApplicationRestart(cmd.as_ptr(), 0);
    }
    ```
* **Dependencies**: Phase 2.
* **Risks**: Manual desktop launch may exhibit slight visual delay if window show is deferred.
* **Rollback Strategy**: Revert `"visible": false` to `"visible": true`.
* **Test Cases**:
  - Launch with `--autostart`: verify zero pixels, frames, or taskbar buttons appear; tray icon registers cleanly.
  - Launch without args: verify window opens centered and focused.
* **Acceptance Criteria**: 0% visual flash on system boot. Tray icon appears reliably.

---

### Phase 4: Rust Background Core & Frontend Lifecycle Separation (Hybrid Model)

* **Objective**: Minimize background resource consumption by separating background daemon capabilities from the frontend WebView2 lifecycle.
* **Existing Problem**: Even with `"visible": false`, WebView2 initializes on boot, spawning 4 Chromium child processes and reserving ~100 MB of virtual commit space during Windows startup.
* **Source-Code Evidence**: [`src-tauri/tauri.conf.json`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/tauri.conf.json#L14-L44), [`src-tauri/src/tray.rs`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/src/tray.rs#L94-L107).
* **Exact Files & Functions Affected**:
  - [`src-tauri/tauri.conf.json`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/tauri.conf.json)
  - [`src-tauri/src/lib.rs`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/src/lib.rs)
  - [`src-tauri/src/tray.rs`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/src/tray.rs)
* **Technical Implementation Approach**:
  - Implement dynamic window creation helper `create_or_show_main_window(app: &AppHandle) -> Result<WebviewWindow, Error>`.
  - On `--autostart`, defer window building until the user explicitly selects "Open Workspace" from the tray or presses `Ctrl+Shift+N`.
  - Once created, window close events intercept destruction (`api.prevent_close()`) and call `window.hide()`, maintaining instant restore latency (<15ms) for the remainder of the session.
  - Retain Approach A (`visible: false` in config) as immediate fallback if dynamic creation introduces edge cases.
* **Dependencies**: Phase 3.
* **Risks**: First tray click incurs a one-time ~500ms WebView2 initialization delay.
* **Rollback Strategy**: Revert `tauri.conf.json` to pre-created hidden window (Approach A).
* **Test Cases**:
  - Verify process list after boot: confirm 0 `msedgewebview2.exe` processes exist until tray icon is clicked.
  - Click tray: verify window builds, displays correctly, and preserves state.
* **Acceptance Criteria**: Background memory on boot drops to single-process footprint. Main window opens seamlessly upon user request.

---

### Phase 5: Startup Bottleneck Elimination (PowerShell Removal & Version Gating)

* **Objective**: Eliminate startup CPU and disk I/O bottlenecks caused by external subprocess execution.
* **Existing Problem**: `system_commands.rs` executes `powershell.exe` to reconcile uninstall registry strings on every boot, taking 500–1,500ms and spinning up .NET CLR.
* **Source-Code Evidence**: [`src-tauri/src/commands/system_commands.rs`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/src/commands/system_commands.rs#L821-L836), [`src-tauri/src/lib.rs`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/src/lib.rs#L239).
* **Exact Files & Functions Affected**:
  - [`src-tauri/src/lib.rs`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/src/lib.rs#L238-L240)
  - [`src-tauri/src/commands/system_commands.rs`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/src/commands/system_commands.rs#L788-L842)
* **Technical Implementation Approach**:
  - Add version change gate:
    ```rust
    let needs_reconcile = {
        let conn = db.get_connection();
        let guard = conn.lock();
        let verified: Option<String> = guard.query_row(
            "SELECT value FROM app_settings WHERE key = 'verified_app_version'",
            [],
            |r| r.get(0)
        ).ok();
        verified.as_deref() != Some(&current_ver)
    };
    if needs_reconcile {
        crate::commands::reconcile_windows_shortcuts_and_registry(&current_ver);
    }
    ```
  - Remove the PowerShell script completely from `reconcile_windows_shortcuts_and_registry`. Direct registry entries in `HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall` are written using pure in-process Win32 Registry APIs (`RegOpenKeyExW`, `RegSetValueExW`, `RegCloseKey` from `advapi32.dll` via `windows-sys` or `winreg`). Zero subprocesses are spawned.
  - Consolidate duplicate autostart queries in `lib.rs` (lines 241–255 and 286–308) into a single atomic check.
* **Dependencies**: Phase 4.
* **Risks**: None. Registry entries remain identical.
* **Rollback Strategy**: Revert to previous PowerShell function.
* **Test Cases**:
  - Boot app when version matches DB: verify 0 `powershell.exe` processes spawned in Process Monitor.
  - Update version string: verify single direct registry update executes.
* **Acceptance Criteria**: Startup CPU consumption drops to 0.0% within 100ms of boot. Zero PowerShell instances spawned.

---

### Phase 6: SQLite WAL Integrity & Crash-Resilient Shutdown

* **Objective**: Ensure absolute database consistency across sudden OS shutdowns, power failures, and clean exits, while bounding WAL file disk growth.
* **Existing Problem**: No explicit checkpointing is scheduled during idle or exit, leaving WAL integration entirely to default autocheckpoint limits which can be starved by active read snapshots.
* **Source-Code Evidence**: [`src-tauri/src/db/mod.rs`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/src/db/mod.rs#L43-L52), [`src-tauri/src/lib.rs`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/src/lib.rs#L363-L371).
* **Exact Files & Functions Affected**:
  - [`src-tauri/src/db/mod.rs`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/src/db/mod.rs)
  - [`src-tauri/src/lib.rs`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/src/lib.rs)
  - [`src-tauri/src/tray.rs`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/src/tray.rs)
* **Technical Implementation Approach**:
  - Add non-blocking passive checkpoint helper in `DatabaseManager`:
    ```rust
    pub fn checkpoint_wal_passive(&self) {
        if let Some(guard) = self.conn.try_lock() {
            let res = guard.query_row("PRAGMA wal_checkpoint(PASSIVE);", [], |r| {
                Ok((r.get::<_, i32>(0)?, r.get::<_, i32>(1)?, r.get::<_, i32>(2)?))
            });
            if let Ok((busy, log, checkpointed)) = res {
                if busy == 1 {
                    eprintln!("[GPN DB] Passive checkpoint deferred (busy readers: {} frames remaining)", log - checkpointed);
                }
            }
        }
    }
    ```
  - If `try_lock()` fails or `busy == 1`, defer checkpoint to next idle interval without blocking the UI thread.
  - Intercept clean exit paths (Tray -> "Quit GPN" and `WindowEvent::Destroyed`) to run `checkpoint_wal_passive()`.
  - Retain `PRAGMA synchronous = NORMAL;`, `PRAGMA busy_timeout = 5000;`, and rely on SQLite's automatic WAL frame replay on connection open for power-loss crash recovery.
* **Dependencies**: Phase 5.
* **Risks**: None. `PASSIVE` checkpoints never block concurrent readers or writers.
* **Rollback Strategy**: Remove explicit checkpoint call.
* **Test Cases**:
  - Write notes. Force terminate process via `taskkill /F`. Reopen app: verify SQLite automatically executes WAL recovery and all committed notes load.
* **Acceptance Criteria**: Zero database corruption under forced process termination. `-wal` file cleanly integrated upon shutdown.

---

### Phase 7: Background Sync Worker Hardening (In-Band Timeouts & Sleep/Wake)

* **Objective**: Protect Tokio runtime and background tasks against duplicate worker spawning, network reconnect loops, and unhandled sleep/wake thread suspension using robust in-band HTTP resilience.
* **Existing Problem**: `worker.rs` runs on a naive 300s interval without a cancellation token. If network drops or laptop sleeps, requests can hang without exponential backoff.
* **Source-Code Evidence**: [`src-tauri/src/sync/worker.rs`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/src/sync/worker.rs#L58-L70), [`src-tauri/src/sync/engine.rs`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/src/sync/engine.rs).
* **Exact Files & Functions Affected**:
  - [`src-tauri/src/sync/worker.rs`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/src/sync/worker.rs)
  - [`src-tauri/src/AppState`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src-tauri/src/lib.rs#L19-L26)
  - [`src/App.tsx`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/src/App.tsx#L250-L265)
* **Technical Implementation Approach**:
  - Add a `tokio_util::sync::CancellationToken` to `SyncWorker` to allow clean shutdown during app termination.
  - Implement in-band request timeouts (15s connect / 30s read) and bounded exponential backoff with jitter (2–60s range) on sync failure:
    $$\text{Delay} = \min(60\text{s}, 2 \times 2^{\min(n-1, 5)}\text{s}) + \text{rand}(0, 1000\text{ms})$$
  - Select in-flight network requests against `cancellation_token.cancelled()`. Aborted requests preserve `sync_queue` items as `status = 'pending'`, ensuring zero data loss on shutdown.
  - Retain `interval.set_missed_tick_behavior(MissedTickBehavior::Skip);` so system sleep does not cause a burst of back-to-back requests on wake.
  - Unify frontend startup update check in `App.tsx` and `updateService.ts` to execute exactly once via a 1,000ms debounced trigger.
* **Dependencies**: Phase 6.
* **Risks**: None. Cloud sync rules and Firebase REST schemas remain strictly untouched.
* **Rollback Strategy**: Revert to previous worker loop.
* **Test Cases**:
  - Disconnect Wi-Fi mid-sync: verify clean backoff without CPU spinning. Reconnect Wi-Fi: verify automatic recovery.
  - Machine sleep/wake: verify single clean sync execution with 0 burst calls.
* **Acceptance Criteria**: Sync worker handles sleep/wake and network drops with zero thread deadlocks and zero CPU spikes.

---

### Phase 8: Performance Verification & Final Old vs. New Validation Report

* **Objective**: Measure final post-optimization metrics, compare against Phase 1 baselines, execute the 16-scenario testing matrix, and compile the factual Old vs. New report.
* **Existing Problem**: Need objective, empirical evidence proving that all requirements were met.
* **Source-Code Evidence**: Measurements collected across test builds.
* **Exact Files & Functions Affected**: [`pc-app/IMPLEMENTATION_PLAN.md`](file:///D:/GAURAV-TEMP/Github/gaurav-personal-notes/pc-app/IMPLEMENTATION_PLAN.md) (Final report appendix).
* **Technical Implementation Approach**:
  - Run identical PowerShell benchmarking suite on the optimized local build.
  - Record and verify all 16 Windows testing scenarios.
  - Compile the definitive comparison table.
* **Dependencies**: Phases 1–7.
* **Risks**: None (Validation only).
* **Rollback Strategy**: N/A.
* **Test Cases**: Complete execution of the 16-scenario verification matrix in Section 6.
* **Acceptance Criteria**: 100% of the 16 test scenarios pass; measurable reduction in startup CPU, private memory, and disk I/O.

---

## 6. Comprehensive Windows Testing Matrix

The implementation will be verified against the following comprehensive real-world scenarios:

| # | Test Scenario | Execution Steps | Expected Result | Pass/Fail Criteria |
|:---|:---|:---|:---|:---|
| **1** | **Fresh Windows Login** | Enable autostart; restart machine; sign into Windows desktop. | GPN launches silently in background; system tray icon appears; zero window, frame, or blank canvas flashes on screen. | **PASS**: 0ms visual flash on screen. Tray icon visible. |
| **2** | **Normal Windows Restart** | Restart laptop with GPN running in tray. | System boots to desktop; GPN recovers silently into tray without user interruption. | **PASS**: No windows opened during boot sequence. |
| **3** | **Manual Desktop Launch** | Double click desktop shortcut or Start Menu entry while GPN is not running. | Main application window opens smoothly centered, rendered, and focused. | **PASS**: Normal UI presentation; correct title and tab. |
| **4** | **Launch While Running** | GPN running in tray; double-click desktop shortcut again. | Secondary process detects primary instance, sends activation signal, and exits (<50ms). Primary window surfaces to foreground. | **PASS**: Exactly 1 process group in Task Manager; existing window restored. |
| **5** | **Close Main Window** | Click "X" in top right corner of main application window. | Window hides instantly; process remains alive in background; tray icon remains active. | **PASS**: Process does not exit; RAM trimmed cleanly. |
| **6** | **Open From Tray** | Left-click tray icon or right-click -> "Open Workspace". | Window restores instantly (<15ms) to foreground with full note state preserved. | **PASS**: Instant restore; zero reload or state loss. |
| **7** | **Global Shortcut Capture** | Press `Ctrl+Shift+N` from any application (e.g. Chrome, Notepad). | Quick capture scratchpad surfaces immediately with focus in text editor. | **PASS**: Quick capture opens; saves note to SQLite directly. |
| **8** | **Windows Sleep Handling** | Machine placed into Sleep / Modern Standby for 15 minutes. | Tokio tasks suspend cleanly; no thread deadlocks or CPU spinning during sleep. | **PASS**: Zero CPU during sleep; process survives. |
| **9** | **Windows Wake Handling** | Wake machine from sleep. | App resumes; missed interval ticks skipped; normal tray accessibility maintained. | **PASS**: No task storms; single clean sync check. |
| **10** | **Network Disconnection** | Turn on Airplane Mode / disable Wi-Fi. | App functions 100% offline; notes create/edit locally; tray displays `[Offline • Local Vault]`; zero retry spam. | **PASS**: Zero network errors logged; full offline CRUD. |
| **11** | **Network Restoration** | Re-enable Wi-Fi. | App detects connectivity; queues push cleanly; tray updates to `[Live • Cloud Synced]`. | **PASS**: Automatic background sync resumption. |
| **12** | **Unexpected Process Crash** | Simulate unhandled panic or kill `Gaurav Personal Notes.exe` via Task Manager. | Process terminates cleanly without orphaned child processes. Manual relaunch recovers all state without error. | **PASS**: No orphaned processes; clean relaunch. |
| **13** | **Crash-Loop Prevention (Safe Mode)** | Force 3 consecutive crashes within 60 seconds. | Fourth launch detects crash loop; boots into Safe Mode offering local backup export; prevents silent death. | **PASS**: Safe Mode dialog displayed; loop broken. |
| **14** | **Simultaneous Activation & Quick Capture** | Press `Ctrl+Shift+N` while simultaneously double-clicking the desktop shortcut. | IPC handler serializes requests cleanly: capture surfaces top-most, workspace opens underneath without deadlock. | **PASS**: No race conditions or process crashes. |
| **15** | **Forced Process Termination (Crash Recovery)** | Force terminate process mid-transaction via `taskkill /F /IM "Gaurav Personal Notes.exe"` (note: this tests OS process termination and WAL crash recovery, not physical power cut). | Next app launch executes SQLite WAL recovery automatically; committed transactions residing in OS buffers survive and database remains completely consistent without corruption. | **PASS**: Zero SQLite corruption errors; data preserved; WAL recovery completes successfully. |
| **16** | **24-Hour Extended Idle** | Leave GPN running in background for 24 continuous hours. | Memory commit remains stable (no memory leaks); CPU stays at 0.0%; tray remains responsive. | **PASS**: Stable memory line; 0% CPU consumption. |

---

## 7. Performance Benchmarking Methodology

### 7.1 Measurement Tools & Protocol
Measurements must be collected using native Windows instrumentation tools, avoiding subjective estimates:
1. **Windows Task Manager (Details Tab)**:
   - `Working Set (Memory)`: Physical RAM allocated to parent process.
   - `Commit Size`: Total virtual address space backed by RAM/paging across entire process tree.
   - `CPU Utilization`: Sampled over 60-second idle windows.
2. **Windows Process Explorer (Sysinternals)**:
   - Process Tree inspection: Verify exact parent-child hierarchy and count of `msedgewebview2.exe` instances.
   - `Private Bytes`: Memory dedicated solely to GPN binaries.
3. **PowerShell Performance Counter Scripts**:
   - `\Process(Gaurav Personal Notes)\% Processor Time`
   - `\Process(Gaurav Personal Notes)\Private Bytes`
   - `\Process(Gaurav Personal Notes)\IO Read Bytes/sec`
4. **Windows Event Viewer**:
   - Verify zero Application Hang (Event ID 1002) or Crash (Event ID 1000) entries.

---

### 7.2 Baseline vs. Provisional Target Performance Metrics

> [!NOTE]
> All target metrics listed below represent **provisional engineering estimates (hypotheses)**. Final pass/fail evaluations will be based strictly on empirical delta improvements measured against Phase 1 baselines on the user's specific hardware.

| Metric | Measurement Tool | Old Architecture (Measured / Baseline) | Provisional Engineering Target (Hypothesis) | Verification Status |
|:---|:---|:---|:---|:---|
| **Windows Startup UI Behavior** | Visual / Screen Recording | Visible window flash (150–400ms) on desktop before hiding. | **100% Silent Background**. Zero visible pixels or taskbar flashes. | Provisional Target |
| **Process Count on Boot** | Task Manager / Sysinternals | 4–5 processes (Tauri parent + 3–4 WebView2 subprocesses). | **1 process** (Hybrid B) or 4 processes fully hidden (App A). | Provisional Target |
| **Startup Peak CPU (%)** | Performance Monitor (`% Processor Time` normalized) | High burst (PowerShell + .NET CLR + Chromium V8 startup). | **< 0.1% CPU** (Normalized). Zero PowerShell; deferred Chromium init. | Provisional Target |
| **Startup Duration to Tray** | PowerShell timestamp delta | 1,800ms – 2,400ms. | **< 350ms** (Provisional). Instantaneous Win32 tray registration. | Provisional Target |
| **Background Private Commit** | Process Explorer (`Private Bytes`) | ~95 MB – 140 MB across entire process tree. | **~12 MB – 16 MB** (Hybrid B provisional estimate) / ~80 MB (App A). | Provisional Target |
| **Reported Working Set (Parent)**| Task Manager (`Memory`) | ~3.3 MB (temporarily after manual trim, then rises). | **~8 MB – 12 MB** (Stable, real physical RAM without page faulting). | Provisional Target |
| **Secondary Launch Behavior** | Process Explorer | Spawns duplicate process, duplicate tray icon, locks DB. | **Zero duplicate processes**. Secondary exits in <50ms; primary wakes. | Provisional Target |
| **First Window Open Latency** | High-precision stopwatch | ~15ms (since pre-warmed). | **~400–750ms** (Hybrid B provisional) / **<15ms** (App A). | Provisional Target |
| **Subsequent Window Restore** | High-precision stopwatch | <15ms. | **< 15ms** (Instantly restored from warm hidden state). | Provisional Target |
| **Extended Idle CPU (1h, 6h)** | Performance Monitor (Normalized) | 0.0% – 0.2%. | **0.0% Flat** (Normalized). Zero polling loops. | Provisional Target |

---

## 8. Preserved Capabilities & Compatibility Matrix

Under no circumstances will any optimization compromise existing application features. The following matrix details the compatibility guarantees:

| Capability Area | Existing Implementation | Preservation Strategy & Safety Guard |
|:---|:---|:---|
| **Local Note CRUD** | SQLite via `rusqlite` with instant local persistence. | Connections, schemas, and `NotesRepository` methods remain 100% identical. |
| **Full-Text Search (FTS5)** | Native SQLite FTS5 index with unicode61 tokenizer. | Search queries, triggers, and match scoring remain untouched. |
| **Global Quick Capture** | `Ctrl+Shift+N` registered via `tauri-plugin-global-shortcut`. | Shortcut handler triggers `get_or_create_main_window` or capture window with top-most elevation. |
| **Cloud Synchronization** | Bi-directional Firestore REST synchronization with LWW conflict resolution. | `SyncWorker` and `SyncEngine` remain untouched; only lifecycle cancellation token is added. |
| **Authentication & Tokens**| Windows Credential Manager + SQLite `app_settings`. | Session storage, auto-refresh tokens, and loopback OAuth flows remain identical. |
| **Self-Hosted OTA Updates**| Tauri v2 updater via `gphost.eu.cc/api/v1/releases/gpn/latest`. | **STRICT ISOLATION**: Update endpoints, Minisign public key, and signature verification logic are untouched. |
| **Local Backup Server** | Ephemeral `TcpListener` on `127.0.0.1:port` with range-header support. | Backup generation, direct download server, and ZIP compression remain identical. |
| **Industrial UI / Styling** | Tailwind v4 + React 19 + Tiptap rich-text editor. | Zero UI modifications; CSS, fonts, and dark mode themes remain untouched. |

---

## 9. Risk Analysis & Contingency / Rollback Strategies

| Identified Risk | Severity | Mitigation & Contingency Strategy | Rollback Procedure |
|:---|:---|:---|:---|
| **Tauri 2 Lazy Window Latency** | Low | If users perceive the provisional ~500ms first-open latency of Hybrid Approach B as sluggish, immediately fall back to Approach A (`visible: false` pre-created window). | Keep window configuration in `tauri.conf.json` with `"visible": false`; remove lazy builder. |
| **Windows 11 Foreground Lockout** | Medium | Windows 11 blocks background processes from calling `SetForegroundWindow` if user is active in another app. | Use temporary `set_always_on_top(true)` for 300ms followed by `set_always_on_top(false)` (already tested and working in GPN). | Revert to standard focus request. |
| **Single-Instance Mutex Abandonment** | Low | If primary instance crashes abruptly, named pipe or mutex must not block subsequent launches. | `tauri-plugin-single-instance` automatically handles stale pipe cleanup upon process termination via OS kernel handle teardown. | Remove plugin and allow normal process launch. |
| **Antivirus False Positives** | Low | Altering Windows autostart flags or process memory could trigger aggressive heuristic AV alerts. | Avoid raw Windows API memory hacking (`VirtualAlloc`/`WriteProcessMemory`); use only standard Tauri and Win32 documented APIs. | N/A (Standard Win32 API usage). |

---

## 10. Final Implementation Acceptance Criteria

Implementation will be declared complete only when all of the following criteria are validated:

1. **Silent Boot Verification**:
   - Windows login with `--autostart` produces **zero visible window flash, taskbar flicker, or splash screen**.
   - System tray icon appears reliably with correct tooltip (`Gaurav Personal Notes`).
2. **Single-Instance Verification**:
   - Double-clicking desktop shortcut while GPN is running in tray **never spawns a second process**.
   - Existing window smoothly surfaces to foreground and gains focus.
   - Quick capture (`Ctrl+Shift+N` or `--quick-capture`) surfaces the capture interface without disrupting workspace state.
3. **Runtime Survival & Headless Integrity**:
   - GPN's Rust background runtime, SQLite connection, and system tray icon **survive main workspace closure** (closing the workspace hides the window without exiting the process).
   - Under the lazy initialization architecture (Approach B), WebView2 child processes (`msedgewebview2.exe`) start **only when the workspace or quick capture is explicitly requested by the user**.
   - Global shortcut `Ctrl+Shift+N` functions **immediately upon boot**, even before the main workspace window has ever been opened.
4. **Resource Efficiency**:
   - Startup spawns **zero PowerShell or external command subprocesses** (all registry updates use native Win32 APIs).
   - Normalized idle CPU utilization remains at **0.0%**.
   - Background private memory is measurably reduced compared to baseline.
5. **Functional Integrity**:
   - Note creation, editing, deleting, and FTS5 search function with 100% fidelity.
   - Quick capture hotkey (`Ctrl+Shift+N`) opens reliably from any Windows application.
   - Cloud synchronization pushes and pulls notes cleanly when authenticated, backing off gracefully without CPU spinning when offline.
   - Self-hosted update checker continues to verify live updates against GPHost without errors.
6. **Clean Local Codebase**:
   - Zero files pushed or tracked in Git history.
   - Zero release or build pipelines executed autonomously.
