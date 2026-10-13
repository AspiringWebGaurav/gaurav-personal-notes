export interface PatchNoteCategory {
  type: 'feature' | 'improvement' | 'fix' | 'security';
  title: string;
  items: string[];
}

export interface ReleasePatchNote {
  version: string;
  releaseDate: string;
  title: string;
  summary: string;
  isLatest?: boolean;
  categories: PatchNoteCategory[];
  rawNotes?: string;
  downloadUrl?: string;
}

export const PATCH_NOTES: ReleasePatchNote[] = [
  {
    version: "0.0.8",
    releaseDate: "October 13, 2026",
    title: "Chrome-Style Zero-Wizard Auto-Launch Installer & 2-Choice Data Retention Uninstaller",
    summary: "Complete overhaul of the desktop installation and uninstallation experience mirroring Google Chrome: single progress card with instant auto-launch, removal of legacy multi-step wizard screens, clean 2-choice data retention uninstaller, and a dynamic single-view zero-scroll post-uninstall page.",
    isLatest: true,
    categories: [
      {
        type: "feature",
        title: "Chrome-Style Zero-Wizard Installation",
        items: [
          "Eliminated all retro wizard pages, license agreements, destination prompts, and legacy upgrade radio buttons",
          "One-click execution displays a compact single progress bar and silently unpacks into local user application storage",
          "Instant auto-launch: immediately executes Gaurav Personal Notes upon 100% extraction and dismisses the installer window with zero clicks"
        ]
      },
      {
        type: "feature",
        title: "Chrome-Style 2-Choice Data Lifecycle Uninstaller",
        items: [
          "Modern teardown modal with clean prompt and explicit 'Also delete your notes and local app data?' checkbox",
          "Safe Default: keeps notes and SQLite database in %APPDATA% untouched so users never lose work upon reinstalling",
          "Full Teardown: completely wipes notes, database, cache, and registry keys when explicitly checked",
          "Silent uninstaller dismissal without hanging on close buttons"
        ]
      },
      {
        type: "improvement",
        title: "Dynamic Single-View Post-Uninstall Experience",
        items: [
          "Dedicated /uninstalled web landing page engineered strictly for one screen with zero vertical scrolling",
          "No feedback forms, rating stars, or survey interruptions for maximum user respect",
          "Dynamically indicates whether local notes were preserved or wiped, with an instant one-click download shortcut"
        ]
      }
    ],
    rawNotes: "v0.0.8: Chrome-style zero-wizard auto-launch installer and 2-choice data retention uninstaller"
  },
  {
    version: "0.0.7",
    releaseDate: "October 13, 2026",
    title: "Streamlined Single-Progress Installation, Developer Branding & Auto-Permissions",
    summary: "Modernized single-progress-bar installer and uninstaller bypassing retro multi-step wizard screens, embedded developer and project verification, automatic pre-granted system permissions, and instant auto-finish and auto-launch execution.",
    isLatest: false,
    categories: [
      {
        type: "feature",
        title: "Streamlined Single-Screen Installation & Auto-Launch",
        items: [
          "Bypassed legacy multi-step wizard dialogs and destination folder selectors in favor of a modern, focused single progress screen",
          "Automatic auto-finish execution that instantly closes the setup window and surfaces Gaurav Personal Notes upon 100% extraction",
          "Mirrored single clean progress teardown for uninstallation that exits automatically without hanging on close buttons"
        ]
      },
      {
        type: "feature",
        title: "Embedded Developer & Portfolio Verification",
        items: [
          "Integrated official developer branding for Gaurav Patil across installer diagnostics and dedicated in-app Settings",
          "Direct shortcuts to official website (https://gpnotes.eu.cc) and GitHub developer portfolio",
          "Dedicated 'About the Developer & System Integrity' card in Settings with live permission status chips"
        ]
      },
      {
        type: "security",
        title: "Pre-Granted System Permissions Verification",
        items: [
          "Pre-verified local SQLite database access in %LOCALAPPDATA% with zero setup friction",
          "Windows DPAPI machine-level hardware key encryption bound to user profile",
          "Persistent HKCU startup autostart enabled by default with automatic registry auto-healing"
        ]
      }
    ],
    rawNotes: "v0.0.7: Streamlined single-progress installation and uninstallation with developer info and auto-granted permissions"
  },
  {
    version: "0.0.6",
    releaseDate: "October 13, 2026",
    title: "Dynamic Background Updates, Dedicated Settings & Stealth Execution",
    summary: "Automated background update polling with pinging status indicator, dedicated Settings view with instant app folder and Windows settings shortcuts, zero terminal window flashes via native Win32 execution, launch at startup enabled by default, and streamlined one-click quit.",
    isLatest: false,
    categories: [
      {
        type: "feature",
        title: "Dynamic Background Update Engine & Status Indicator",
        items: [
          "Automatic background update polling scheduled 1.2s after app launch to quietly detect newly published releases",
          "Pulsing violet badge indicator on the update button that notifies you of pending updates without opening disruptive modal dialogues",
          "One-click action to inspect, pace-download, verify Ed25519 signatures, and restart into the latest version"
        ]
      },
      {
        type: "feature",
        title: "Dedicated Settings View & System Integration",
        items: [
          "Brand new dedicated Settings view accessible via sidebar gear icon, fully isolated from Permissions & Security",
          "Direct 'Open App Folder' shortcut revealing canonical %LOCALAPPDATA% installation directory in Windows Explorer",
          "Instant 'Windows App Settings' button jumping directly to Windows Installed Apps system settings",
          "Launch at Startup enabled by default out of the box with persistent HKCU registry auto-healing"
        ]
      },
      {
        type: "improvement",
        title: "Zero Terminal Window Popups & Stealth Execution",
        items: [
          "Full elimination of transient PowerShell or cmd terminal window flashes when checking updates or inspecting system state",
          "Native Win32 CREATE_NO_WINDOW execution flags applied across all background tasks and registry queries",
          "Direct one-click 'Quit GPN' navigation closing the desktop window instantly while retaining background quick-capture tray availability"
        ]
      },
      {
        type: "security",
        title: "Permissions Architecture & Signature Verification",
        items: [
          "Maintained dedicated Permissions view preserving complete visibility into hardware, storage, and network isolation",
          "Single-line Base64 Ed25519 Minisign cryptographic verification ensuring only authentic releases are executed",
          "Monotonic SQLite version guarding preventing accidental version regression across application reboots"
        ]
      }
    ],
    rawNotes: "v0.0.6: Dynamic background update detection, dedicated Settings view, zero terminal window execution, and launch at startup enabled by default"
  },
  {
    version: "0.0.5",
    releaseDate: "October 13, 2026",
    title: "Intentionally Throttled Download Engine & Resilient Update Lifecycle",
    summary: "Adaptive download pacing with smooth 1% to 100% progress tracking, cryptographic package verification stage, monotonic version persistence across reboots, and failsafe recovery from interrupted updates.",
    isLatest: false,
    categories: [
      {
        type: "feature",
        title: "Adaptive Throttled Download & Paced Progression",
        items: [
          "Controlled download pacing engine with smooth 50ms progression ticks, eliminating erratic percentage jumps and network saturation",
          "Accurate byte-level tracking from 1% to 100% with real-time transfer speed indicator and progress bar synchronization",
          "Dedicated package verification phase validating Ed25519 cryptographic signatures prior to installation handoff"
        ]
      },
      {
        type: "improvement",
        title: "Automated Restart & Window Foreground Elevation",
        items: [
          "Gentle 2.5-second pre-restart visual indicator on silent background updates to prevent abrupt window closures",
          "Automatic database flush prior to installer launch ensuring zero unpersisted note modifications",
          "Native cmd_bring_main_to_front window elevation bringing GPN back into active focus upon restart without taskbar orange-flashing"
        ]
      },
      {
        type: "fix",
        title: "Failsafe Recovery from Interrupted Downloads & Crashes",
        items: [
          "Automatic boot-time recovery detecting interrupted installations and restoring normal operation on existing working build",
          "Safe error boundaries preventing blank-screen states or stuck download percentages across application restarts and Windows reboots",
          "Eliminated artificial progress bar minimums for true 1-to-1 visual representation of downloaded packages"
        ]
      }
    ],
    rawNotes: "v0.0.5: Intentionally throttled download pacing (1-100%), package verification stage, failsafe recovery from interrupted updates, and seamless elevated restart."
  },
  {
    version: "0.0.4",
    releaseDate: "October 13, 2026",
    title: "Silent Background Updates, Kernel Dispatcher & Persistent Tray",
    summary: "Autonomous background update engine with elevated restart, kernel-level binary dispatcher resolving Windows Installed Apps duplicates, persistent background tray process on window close, and Google Material 3 patch notes integration.",
    isLatest: false,
    categories: [
      {
        type: "feature",
        title: "Autonomous Silent Auto-Update Engine",
        items: [
          "Background update polling on 30-minute intervals and network reconnection that downloads and applies updates completely silently without modal interruptions",
          "Automatic app restart upon installation with native foreground window elevation (cmd_bring_main_to_front), eliminating taskbar flashing",
          "Dedicated Google Material 3 Patch Notes view (/patch-notes) with category filters, pill search, and direct desktop header navigation"
        ]
      },
      {
        type: "improvement",
        title: "Background Tray Process & Quick Capture",
        items: [
          "Quitting or closing the GPN window now preserves the background tray process, ensuring hotkey note capture (Ctrl+Shift+N / Alt+Shift+N) remains instantaneous",
          "Explicit 'Quit GPN completely' option in tray context menu with seamless inline confirmation dialog",
          "Optimized Edge CDN 24-hour caching for website patch notes and documentation routes on Vercel Hobby quota"
        ]
      },
      {
        type: "fix",
        title: "Dual-Registry Collision Resolution & Windows App List Fix",
        items: [
          "Kernel-level binary dispatcher (check_and_handoff_to_canonical_binary) detects legacy C:\\Program Files shortcuts and transparently hands execution off to canonical %LOCALAPPDATA% installation",
          "Active reconciliation of Windows Uninstall registry keys (HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall) and shell shortcuts on every boot to guarantee Windows Settings displays the exact running version",
          "Built-in 1-click 'Fix Windows Registry' repair utility in Settings view and Clean-Old-System-Installation script for removing orphaned machine-wide keys"
        ]
      },
      {
        type: "security",
        title: "Monotonic SemVer & Cryptographic Ed25519 Signatures",
        items: [
          "Monotonic SQLite version barrier preventing version rollbacks across reboots and fresh launches",
          "Single-line Base64 cryptographic Ed25519 Minisign signatures verified against GPHost release manifests",
          "Cloudflare R2 permanent retention and automated atomic purge of superseded 0.0.3 OTA binary enforcing strict 2-file storage rule"
        ]
      }
    ],
    rawNotes: "v0.0.4: Silent background updates with elevated restart, kernel binary dispatcher for Windows Installed Apps fix, persistent background tray process on window close, and Google-style patch notes integration."
  },
  {
    version: "0.0.3",
    releaseDate: "October 12, 2026",
    title: "Dynamic Update Status & Elevated Window Control",
    summary: "Real-time update states in top header, tray elevation enhancements, kernel binary dispatcher, and persistent autostart Windows registry key.",
    isLatest: false,
    categories: [
      {
        type: "feature",
        title: "Dynamic Update Status Pill",
        items: [
          "Interactive header pill with real-time states: Checking updates, vAvailable [Install], Downloading %, and Restart Ready",
          "Persistent Windows Registry Run key restoration in SQLite to survive NSIS updates",
          "One-click Patch Notes direct access from desktop sidebar, top header, and update toasts"
        ]
      },
      {
        type: "improvement",
        title: "Foreground Elevation & Silent Update Engine",
        items: [
          "Native cmd_bring_main_to_front elevation prevents window from flashing orange on taskbar upon relaunch",
          "Kernel-level binary dispatcher immediately hands off any legacy shortcut invocation to canonical %LOCALAPPDATA% binary",
          "Seamless silent background updates: checks, downloads, installs, and restarts automatically with foreground elevation",
          "Inline blended confirmation dialogs for quit and note deletion matching dark/light themes"
        ]
      },
      {
        type: "security",
        title: "Single-Line Base64 Minisign Signatures & Monotonic SemVer",
        items: [
          "Clean single-line Base64 cryptographic Ed25519 signatures preventing Tauri v2 parser crashes",
          "SQLite monotonic version guard preventing accidental version rollbacks across reboots and restarts",
          "Cloudflare R2 permanent retention with atomic GPHost manifest activation"
        ]
      }
    ],
    rawNotes: "v0.0.3: Dynamic update pill, foreground elevation, persistent autostart, kernel binary handoff, and single-line minisign verification."
  },
  {
    version: "0.0.2",
    releaseDate: "October 11, 2026",
    title: "Cloudflare R2 OTA Engine & 3-Layer Storage Purge",
    summary: "Direct presigned R2 binary uploads, automated superseded binary purging, and silent OTA updates.",
    categories: [
      {
        type: "feature",
        title: "Zero-Vercel-Limit Direct R2 Streaming",
        items: [
          "Direct streaming of release binaries to Cloudflare R2 via GPHost presigned negotiation",
          "Permanent storage retention (expires_at: null) bypassing default 30-day TTL limits",
          "High-speed binary downloads via Cloudflare edge points"
        ]
      },
      {
        type: "improvement",
        title: "Strict 2-File Storage Enforcement",
        items: [
          "Automated 3-layer purge engine guaranteeing exactly 2 files in Cloudflare R2 at all times (~8.54 MB footprint)",
          "Complete isolation of Base v0.0.0 installer from all OTA manifest operations",
          "Automated atomic purge of superseded OTA binaries upon publishing new updates"
        ]
      }
    ],
    rawNotes: "v0.0.2: Cloudflare R2 direct release streaming and strict 2-file maximum storage enforcement."
  },
  {
    version: "0.0.1",
    releaseDate: "October 10, 2026",
    title: "Desktop Application Foundations & Tauri v2 Integration",
    summary: "Native Windows desktop packaging, SQLite local persistence, and background cloud sync.",
    categories: [
      {
        type: "feature",
        title: "Local-First Architecture",
        items: [
          "Local SQLite database storage with sub-millisecond query performance",
          "TipTap rich text editor with full markdown export and image embedding",
          "System tray minimization and hotkey quick-capture workflow (Ctrl+Shift+N / Alt+Shift+N)",
          "Offline-first vault mode with transparent background cloud synchronization"
        ]
      },
      {
        type: "security",
        title: "Cryptographic OTA Updater Plugin",
        items: [
          "Ed25519 Minisign public key verification against GPHost release manifests",
          "NSIS silent installer bundling with custom uninstall cleanups",
          "Secure credential vault storage for cloud sync authentication"
        ]
      }
    ],
    rawNotes: "v0.0.1: Tauri v2 desktop foundations with SQLite storage and background synchronization."
  },
  {
    version: "0.0.0",
    releaseDate: "October 09, 2026",
    title: "Base Production Installer Release",
    summary: "Permanent base Windows installer release anchored for website download page.",
    categories: [
      {
        type: "feature",
        title: "Base Production Release",
        items: [
          "Official 64-bit Windows setup executable with 1-click installer",
          "Permanent Edge CDN caching for zero serverless burns on downloads (slug: gpn-app)",
          "Offline-first personal notebook with web companion synchronization",
          "Permanent immutable base binary serving as the anchor for all future OTA updates"
        ]
      }
    ],
    rawNotes: "Base Release v0.0.0 for website download.",
    downloadUrl: "https://gphost.eu.cc/raw/gpn-app?v=0.0.0-latest"
  }
];
