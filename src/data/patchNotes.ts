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
    version: "0.0.3",
    releaseDate: "October 12, 2026",
    title: "Dynamic Update Status & Elevated Window Control",
    summary: "Real-time update states in top header, tray elevation enhancements, kernel binary dispatcher, and persistent autostart Windows registry key.",
    isLatest: true,
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
    rawNotes: "v0.0.3: Dynamic update pill, foreground elevation, persistent autostart, kernel binary handoff, and single-line minisign verification.",
    downloadUrl: "https://gphost.eu.cc/api/v1/releases/gpn/download/0.0.3"
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
    rawNotes: "v0.0.2: Cloudflare R2 direct release streaming and strict 2-file maximum storage enforcement.",
    downloadUrl: "https://gphost.eu.cc/api/v1/releases/gpn/download/0.0.2"
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
    rawNotes: "v0.0.1: Tauri v2 desktop foundations with SQLite storage and background synchronization.",
    downloadUrl: "https://gphost.eu.cc/api/v1/releases/gpn/download/0.0.1"
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
    downloadUrl: "https://gphost.eu.cc/raw/gpn-app"
  }
];
