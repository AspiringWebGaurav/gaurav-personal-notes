# GPN Desktop — OTA Update Smoothing & Dynamic Patch Notes Implementation Plan

**Target System:** `pc-app/` (Local-Only Desktop Application)  
**Document Version:** 1.0.0  
**Status:** PROPOSED & READY FOR IMPLEMENTATION  
**Primary Goals:**  
1. Eliminate the double restart / taskbar icon flash ("come and go") during OTA update.  
2. Dynamically display patch notes above/inside the update card prior to and during installation.  
3. Dynamically surface categorized "What's New" patch notes in the celebratory modal upon post-update restart.  
4. Make the entire update lifecycle smooth, silent, and single-transition.

---

## 1. Executive Summary & Problem Diagnosis

### 1.1 The User-Reported Symptom
> *"current like click check update install ui/ux card box comes update in process which is nice app get close resart but 2 times can you see this i can see icon int askbar come and go and another icon comes of ap above card where app update there i want patch notes"*

The user identified two critical UX pain points in the current desktop update flow:
1. **Double Restart / Taskbar Icon Flashing:**  
   When the user clicks "Install" or "Restart Now", the app shows the in-progress card ("Installing update... Restarting..."), the application closes, but then **restarts twice**. The taskbar icon briefly appears, vanishes ("comes and goes"), and then a second icon appears before the app stabilizes.
2. **Missing Dynamic Patch Notes:**  
   - *Pre-install / In-progress:* The update card in Settings and the update modal display generic text (`"Applying latest features..."`) or require clicking an external browser link (`https://gpnotes.eu.cc/patch-notes`), rather than showing what changed directly above or within the card.
   - *Post-restart:* When the updated app relaunches, the celebratory welcome modal only displays static, generic checklist items (`"Running latest native build"`, `"Local SQLite storage & schema verified"`), completely omitting the actual release notes.

---

## 2. Forensic Codebase Audit: Tracing the Update & Relaunch Lifecycle

To diagnose why the app restarts twice and where patch notes are lost, we traced the entire end-to-end execution path across the frontend and native Rust layers:

```
[User Clicks Install/Restart]
            │
            ▼
[updateService.ts: installAndRestart()]
  • Saves { targetVersion, previousVersion, timestamp } (OMITS 'notes'!)
  • Sets state = 'installing' (UpdateModal displays)
  • Sets state = 'restarting'
  • Calls: currentUpdate.install({ restartAfterInstall: true })
            │
            ▼
[tauri-plugin-updater: updater.rs (Rust)]
  • Extracts NSIS installer setup executable to temp folder
  • Spawns installer via: ShellExecuteW("...setup.exe", "/UPDATE /R /ARGS ...")
  • Immediately terminates caller: std::process::exit(0)
            │
            ▼
[NSIS Installer: installer.nsi]
  • Runs silently in /UPDATE mode, overwrites files in $INSTDIR
  • Reaches .onInstSuccess:
      nsis_tauri_utils::RunAsUser "$INSTDIR\${MAINBINARYNAME}.exe" ""
      (Runs unconditionally without checking /R, no args passed, NO Quit statement!)
            │
            ▼
[Process 1 Spawns: Gaurav Personal Notes.exe]
  • Entry point: lib.rs -> run()
  • Calls: check_and_handoff_to_canonical_binary()
      --> BUG: Path canonicalization & case mismatch compares byte-for-byte:
          current_exe.canonicalize() == canonical_exe.canonicalize()
          On Windows, casing or 8.3 short paths can cause this to evaluate to FALSE!
      --> When FALSE: Spawns canonical_exe via std::process::Command::new()!
      --> Calls std::process::exit(0)!  <--- PROCESS 1 DIES! (Taskbar icon vanishes)
            │
            ▼
[Process 2 Spawns: Canonical Gaurav Personal Notes.exe]
  • Taskbar icon appears a second time!
  • Single-instance mutex acquired
  • Window surfaces via create_or_show_main_window()
  • UpdateModal reads localStorage('gpn_recently_updated')
      --> Shows static checklist (no patch notes!)
```

### 2.2 Deep Root Causes of the Double Restart

| Issue ID | Location | Technical Root Cause | Impact |
| :--- | :--- | :--- | :--- |
| **RC-1** | `src-tauri/src/lib.rs` (lines 460–480) | **Path Equality Failure in `check_and_handoff_to_canonical_binary`**<br>Rust's `PathBuf` `==` operator performs a byte-by-byte comparison. On Windows, `canonicalize()` prefixes verbatim paths (`\\?\`), but NTFS path casing (e.g. `AppData\Local` vs `appdata\local`) or 8.3 short-name variations from NSIS `RunAsUser` cause `is_running_canonical` to evaluate to `false`. The newly spawned process spawns *another* process and kills itself immediately. | First process taskbar icon appears and disappears; second process taskbar icon appears. |
| **RC-2** | `src-tauri/nsis/installer.nsi` (lines 505–507) | **Missing `/R` Parameter Guard & Missing `Quit` in `.onInstSuccess`**<br>Tauri v2's updater passes `/UPDATE /R /ARGS <args>` expecting the NSIS template to check for `/R`, extract `/ARGS`, launch via `RunAsUser`, and call `Quit`. Our custom `installer.nsi` had a hardcoded `RunAsUser "$INSTDIR\${MAINBINARYNAME}.exe" ""` with NO args, NO `/R` check, and NO `Quit`. NSIS continues its loop, causing potential duplicate execution races. | Arguments lost; possible multiple launch attempts. |
| **RC-3** | `src-tauri/src/lib.rs` (lines 233–244) | **Windows Restart Manager Race (`RegisterApplicationRestart`)**<br>`RegisterApplicationRestart("--autostart", 0)` registers the application with Windows Restart Manager. When files are updated in-place during NSIS execution, Restart Manager can trigger an automatic recovery restart, while NSIS `.onInstSuccess` also launches the application. One instance hits the single-instance mutex and shuts down, producing a secondary taskbar flicker. | Taskbar icon flicker and competing process creation. |
| **RC-4** | `src-tauri/src/tray.rs` (lines 186–200) | **Window Focus & Elevation Steal Race**<br>The main window is created with `visible: true` before WebView2 has rendered the DOM, while temporarily setting `always_on_top(true)`. Focus bouncing between Windows Explorer/NSIS and the new process causes taskbar icon redraws. | Visual jarring / taskbar pop-in. |

### 2.3 Root Cause of Missing Patch Notes

| Issue ID | Location | Technical Root Cause | Impact |
| :--- | :--- | :--- | :--- |
| **PN-1** | `src/services/updateService.ts` (lines 699–707) | `installAndRestart()` writes `{ targetVersion, previousVersion, timestamp }` to `localStorage.setItem('gpn_recently_updated', ...)` but **drops `this.status.notes`**. | Relaunched app has no access to the release notes received from GPHost. |
| **PN-2** | `src/components/GpnLayout/UpdateModal.tsx` (lines 144–167) | `UpdateModal.tsx` contains hardcoded static checklist items and has no rendering logic for release notes or structured categories. | User only sees generic confirmation bullets instead of real features/fixes. |
| **PN-3** | `src/components/Views/SettingsView.tsx` (lines 345–365) | When an update is `available` or `ready`, the UI only offers a text description and an external link button to `https://gpnotes.eu.cc/patch-notes`. No inline patch notes drawer/card exists. | User cannot preview changes inside the app before choosing to install. |
| **PN-4** | `src/components/GpnLayout/UpdateModal.tsx` (lines 75–88) | During `installing` and `restarting` states, the modal shows generic static text. | Waiting user gets zero context about the features being applied. |

---

## 3. Architecture & Design Specifications

### 3.1 Single-Process Relaunch Guarantee (Eliminating the Double Restart)

To guarantee that the app restarts **exactly once**, without taskbar flickering:

#### 1. Canonical Path Normalization in `src-tauri/src/lib.rs`
Replace fragile `PathBuf == PathBuf` with Windows-safe normalized path verification:
- Strip verbatim UNC prefixes (`\\?\` and `\\?\UNC\`).
- Perform case-insensitive, normalized path string comparison.
- **Fail-Safe Directory Guard:** If `current_exe.parent() == canonical_exe.parent()`, the executable is *already running from the canonical installation directory* (`%LOCALAPPDATA%\Gaurav Personal Notes`). In this case, **never hand off**!

```rust
#[cfg(target_os = "windows")]
fn check_and_handoff_to_canonical_binary() {
    #[cfg(debug_assertions)]
    return;

    #[cfg(not(debug_assertions))]
    {
        if std::env::args().any(|a| a == "--dev" || a == "--no-handoff") {
            return;
        }

        let current_exe = match std::env::current_exe() {
            Ok(path) => path,
            Err(_) => return,
        };

        let current_str = current_exe.to_string_lossy().to_lowercase();
        if current_str.contains("target\\debug") || current_str.contains("target\\release") {
            return;
        }

        let local_app_data = match std::env::var("LOCALAPPDATA") {
            Ok(val) => std::path::PathBuf::from(val),
            Err(_) => return,
        };

        let canonical_dir = local_app_data.join("Gaurav Personal Notes");
        let canonical_exe = canonical_dir.join("Gaurav Personal Notes.exe");

        if canonical_exe.exists() {
            // SAFEGUARD: If already running from the canonical directory, NEVER hand off!
            if let Some(parent) = current_exe.parent() {
                if parent.to_string_lossy().to_lowercase() == canonical_dir.to_string_lossy().to_lowercase() {
                    return;
                }
            }

            // Normalize both paths for case-insensitive comparison without \\?\ prefixes
            let norm_current = normalize_windows_path(&current_exe);
            let norm_canonical = normalize_windows_path(&canonical_exe);

            if norm_current != norm_canonical {
                eprintln!(
                    "[GPN Kernel] Current running executable {:?} is non-canonical. Handing off to canonical {:?}...",
                    current_exe, canonical_exe
                );

                let args: Vec<String> = std::env::args().skip(1).collect();
                let _ = std::process::Command::new(&canonical_exe)
                    .args(&args)
                    .spawn();

                std::process::exit(0);
            }
        }
    }
}
```

#### 2. Synchronize NSIS `.onInstSuccess` with Tauri v2 Updater Protocol
Update `src-tauri/nsis/installer.nsi` to correctly handle `/R`, `/ARGS`, and execute `Quit`:

```nsis
Function .onInstSuccess
  ; If installer is run with /R (Tauri updater flag), restart the app with forwarded arguments
  ${GetOptions} $CMDLINE "/R" $R0
  ${IfNot} ${Errors}
    ${GetOptions} $CMDLINE "/ARGS" $R0
    ${IfNot} ${Errors}
      ${StrLoc} $R1 $CMDLINE "/ARGS" ">"
      IntOp $R1 $R1 + 5
      StrCpy $R2 $CMDLINE "" $R1
    ${Else}
      StrCpy $R2 ""
    ${EndIf}
    ${WordReplace} $R2 `"` `` "+" $R2
    nsis_tauri_utils::RunAsUser "$INSTDIR\${MAINBINARYNAME}.exe" $R2
    Quit
  ${Else}
    ; Direct manual install without updater: launch main binary and close
    nsis_tauri_utils::RunAsUser "$INSTDIR\${MAINBINARYNAME}.exe" ""
    Quit
  ${EndIf}
FunctionEnd
```

#### 3. Suppress RestartManager During Intentional Update Relaunch
In `src-tauri/src/commands/system_commands.rs`, add a helper command `cmd_prepare_for_update_restart` that calls `UnregisterApplicationRestart()` right before the updater runs. This guarantees that Windows Restart Manager will never race with NSIS `RunAsUser`.

---

### 3.2 Dynamic Patch Notes Data Model & Multi-Layer Persistence

#### Data Flow Diagram
```
┌────────────────────────────────────────────────────────┐
│ GPHost Release Manifest                                │
│ https://gphost.eu.cc/api/v1/releases/gpn/latest        │
│ { version: "0.0.16", notes: "v0.0.16: Features..." }   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ updateService.ts                                       │
│ • Captures data.notes into status.notes                │
│ • Parses markdown / bullets into structured categories │
│ • Fallback: src/data/patchNotes.ts catalog             │
└────────────┬─────────────────────────────┬─────────────┘
             │                             │
             ▼                             ▼
   [PRE-INSTALL UI]              [PERSISTENCE ON INSTALL]
   • SettingsView inline card    • localStorage: 'gpn_recently_updated'
   • UpdateModal in-progress       (includes { targetVersion, notes, categories })
                                 • SQLite: 'last_update_notes'
                                           │
                                           ▼ (App Restarts)
                                 [POST-RESTART UI]
                                 • UpdateModal celebratory modal
                                   renders dynamic "What's New in vX.X.X"
```

#### Structured Patch Notes Category Schema
```typescript
export interface PatchNoteCategory {
  type: 'feature' | 'improvement' | 'fix' | 'security';
  title: string;
  items: string[];
}

export interface RecentUpdateInfo {
  targetVersion: string;
  previousVersion?: string;
  timestamp: number;
  notes?: string;
  categories?: PatchNoteCategory[];
}
```

#### Robust Category Parser Utility
Release notes from GPHost or changelog strings (e.g. `"[Feature] Added Quick Capture formatting\n[Fix] Resolved taskbar restart flicker"`) will be automatically parsed into categorized items:
- Lines with `[Feature]`, `feat:`, `rocket`, `New:` -> `type: 'feature'` (Violet / Purple badge).
- Lines with `[Improvement]`, `perf:`, `optimize:`, `Update:` -> `type: 'improvement'` (Indigo / Blue badge).
- Lines with `[Fix]`, `fix:`, `bug:`, `Resolved:` -> `type: 'fix'` (Emerald / Green badge).
- Uncategorized bullet items default to `type: 'improvement'`.

---

### 3.3 UI / UX Design Specifications

#### View 1: Inline Patch Notes in Settings (`SettingsView.tsx`)
When an update is detected as `available` or `ready`, the update card in `SettingsView.tsx` will feature an inline, collapsible **"What's New in vX.X.X"** drawer:
- **Badge:** `v<version> Available` or `v<version> Ready to Install`.
- **Card Header:** Title, version jump (`v0.0.15 → v0.0.16`), and publish date.
- **Embedded Patch Notes Container:** Clean, dark/light themed scrollable container with rounded border and subtle background contrast.
- **Categorized Pills:** Color-coded badges for each bullet item (`Feature`, `Improvement`, `Fix`).
- **Action Buttons:** `Download & Install` or `Restart Now to Apply` positioned cleanly alongside.

#### View 2: Active Update Modal (`UpdateModal.tsx` — In-Progress State)
While the update package is being applied and the progress bar animates (1.2s–2.0s):
- Below the progress bar, show a compact **"Incoming Highlights"** card:
  - Displays 2–3 key bullet points of what is being installed.
  - Replaces vague text with concrete improvements so the user knows exactly what they are waiting for.

#### View 3: Celebratory Post-Restart Modal (`UpdateModal.tsx` — Post-Restart State)
When the application reopens after an update:
- **Header:** Sparkling emerald celebratory icon with `Updated to v<version>`.
- **Subheading:** `Gaurav Personal Notes has been updated to the latest release.`
- **Dynamic "What's New" Section:**
  - Instead of static checklist items, dynamically renders the parsed `categories` from `RecentUpdateInfo`.
  - Feature highlights with modern pill tags (`✦ Feature`, `⚡ Improvement`, `✓ Fix`).
- **Action Button:** Prominent `Continue to Notes (Enter / Esc)` with smooth hover transition.

---

## 4. Step-by-Step Implementation Roadmap

### Phase 1: Native Relaunch Harmonization (Eliminate Double Restart)
1. **Edit `src-tauri/src/lib.rs`**:
   - Implement `normalize_windows_path()` to strip verbatim prefixes (`\\?\`) and lowercase paths.
   - Add directory guard in `check_and_handoff_to_canonical_binary()`: if `current_exe` is already in `%LOCALAPPDATA%\Gaurav Personal Notes`, bypass handoff.
   - Guard `RegisterApplicationRestart` to prevent conflicting restarts during intentional updates.
2. **Edit `src-tauri/nsis/installer.nsi`**:
   - Update `Function .onInstSuccess` to parse `/R` and `/ARGS` options from `$CMDLINE`.
   - Add explicit `Quit` call after `RunAsUser` to prevent installer loop continuation.
3. **Edit `src-tauri/src/commands/system_commands.rs`**:
   - Add `cmd_prepare_for_update_restart` to gracefully release single-instance mutex and unregister restart manager right before NSIS executes.

### Phase 2: Updater Data Pipeline & Persistence
1. **Create `src/utils/patchNotesParser.ts`**:
   - Utility function `parsePatchNotes(rawNotes: string, version: string): PatchNoteCategory[]`.
   - Supports markdown bullet points, bracketed tags (`[Feature]`, `[Fix]`), and plain text fallbacks.
   - Integrates with `src/data/patchNotes.ts` catalog for offline / rich fallback.
2. **Edit `src/services/updateService.ts`**:
   - Update `performUpdateCheck()` to parse and attach structured `categories` to `this.status`.
   - Update `installAndRestart()` to persist full `RecentUpdateInfo` (including `notes` and `categories`) to `localStorage` and SQLite `app_settings` via `cmd_set_pending_update`.
   - Update `runSilentAutoUpdate()` to also persist `notes` before restarting.

### Phase 3: Inline Patch Notes in UI (`SettingsView.tsx` & `GpnWindowHeader.tsx`)
1. **Edit `src/components/Views/SettingsView.tsx`**:
   - Add inline expandable patch notes section within the update card when `status.state === 'available'` or `'ready'`.
   - Render categorized bullet items with modern typography and badges.
2. **Edit `src/components/GpnLayout/GpnWindowHeader.tsx`**:
   - In the update header pill, add tooltip / popover or click handler that reveals patch notes inline without forcing external browser navigation.

### Phase 4: Dynamic Active & Post-Restart Modals (`UpdateModal.tsx`)
1. **Edit `src/components/GpnLayout/UpdateModal.tsx`**:
   - **Active Installing State:** Add "What's being installed" preview card showing the parsed highlights below the progress bar.
   - **Post-Restart Success State:** Replace static bullets with dynamic categorized patch notes cards (`features`, `improvements`, `fixes`).
   - Add smooth keyboard navigation (`Enter` / `Escape`) and clean dismissal.

---

## 5. Verification & Testing Matrix

| Test Case | Scenario | Expected Behavior | Verification Command / Check |
| :--- | :--- | :--- | :--- |
| **TC-1: Single Process Relaunch** | Trigger update restart from Settings or Header. | App closes, NSIS updates in background, exactly ONE new process launches. Taskbar icon appears once with NO disappearance/flicker. | Inspect Windows Task Manager; verify single PID; zero taskbar come-and-go. |
| **TC-2: Canonical Directory Guard** | App running from `%LOCALAPPDATA%\Gaurav Personal Notes`. | `check_and_handoff_to_canonical_binary()` immediately returns without spawning subprocess. | Log output: No non-canonical handoff log emitted. |
| **TC-3: Pre-Install Patch Notes** | Update is available / ready. | Patch notes card is visible directly in Settings without clicking external URL. | Inspect `SettingsView.tsx` update card UI. |
| **TC-4: Active Install Highlights** | Update installing state active. | Top 2–3 highlights of target version visible inside the progress modal. | Visual inspection of `UpdateModal.tsx`. |
| **TC-5: Post-Restart Dynamic Notes** | App restarts after update. | Celebratory modal pops up displaying categorized patch notes for the new version. | Verify `UpdateModal.tsx` renders parsed categories from `localStorage`. |
| **TC-6: Offline / Fallback Resiliency** | Update manifest notes empty or malformed. | Parser falls back gracefully to `src/data/patchNotes.ts` catalog or clean summary. | Verify no crash or undefined text. |
| **TC-7: Build & Type Safety** | Full compilation check. | TypeScript and Rust compile cleanly with 0 errors and 0 warnings. | `npm run build:frontend` & `cargo check` (deferred to user command). |

---

## 6. Strict Development Guardrails Compliance

- **Zero Build Checks During Local Iteration:** Fast code updates only; no premature compilation spam.
- **Local-Only Codebase:** All changes in `pc-app/` remain 100% local; zero git commits; zero GitHub tracking.
- **Strict Release Shipping Gate:** No bumping version, no running `ship.mjs`, no publishing to GPHost.
- **Base `0.0.0` Isolation:** Never touch base installer or `slug: 'gpn-app'`.
