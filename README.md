# Gaurav Personal Notes (GPN)

A clean, fast personal notes workspace with real-time sync, local-first offline support, and collaboration tools.

---

## 🖥️ Download Desktop App for Windows

Gaurav Personal Notes is available as a native Windows desktop app for Windows 10 and Windows 11.

- **Operating System**: Windows 10 (1809+) & Windows 11 (64-bit)
- **Download**: [Download for Windows (.exe)](https://gphost.eu.cc/raw/gpn-app) *(Mirror: [gphost.eu.cc/f/gpn-app](https://gphost.eu.cc/f/gpn-app) or visit `/download` on website)*
- **Offline Support**: Write and search notes without an active internet connection. Notes sync automatically when back online.
- **Background Mode**: Closing the window keeps the lightweight tray service running in the background for quick capture.

### How to Install on Windows
1. Download the `.exe` installer.
2. Double-click the file to install (takes ~5 seconds, no administrator privileges required).
3. Launch **Gaurav Personal Notes** from your Start Menu or Desktop and sign in with your Google account.

---

## 🌐 Web Application

Access your notes from any modern web browser or mobile device:

- **Web Workspace**: [https://gpnotes.eu.cc](https://gpnotes.eu.cc) *(or install as a Progressive Web App)*
- **Mobile Friendly**: Responsive mobile interface with offline caching.

---

## 🚀 Development Setup (Website)

### Prerequisites
- Node.js (v18 or higher)
- npm / yarn / pnpm

### Getting Started

```bash
# Install dependencies
npm install

# Start the local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm run start
```

---


---

## ⚡ Direct CI/CD & OTA Pipeline (Zero-GitHub Dependency)

Gaurav Personal Notes runs an independent, high-performance desktop release and Over-The-Air (OTA) update pipeline directly powered by **GPHost** (`https://gphost.eu.cc`), completely bypassing GitHub Actions and GitHub Releases.

### 🛡️ Core Pipeline Architecture
1. **Isolated Base Installer (`v0.0.0`)**:
   - The production base installer is permanently anchored to:
     ```text
     https://gphost.eu.cc/raw/gpn-app
     ```
   - **Strict Isolation**: It is never overwritten, modified, or deleted by subsequent OTA updates. All website download links (`gpnotes.eu.cc/download`) reference this URL directly.
2. **Automated OTA Distribution (`v0.0.1+`)**:
   - All code updates are pushed directly as OTA binaries to:
     ```text
     https://gphost.eu.cc/api/v1/releases/gpn/latest
     ```
3. **Cryptographic Minisign Signatures**:
   - Every binary payload is signed with Ed25519 Minisign keys (`.sig` formatted in Base64 for Tauri v2). The desktop application cryptographically verifies the signature before applying updates.
4. **Strict 2-File Storage Policy**:
   - When new OTA binaries are pushed, older superseded OTA payloads are automatically purged from Cloudflare R2 and database records. GPHost maintains **strictly 2 files at all times** (~8.5 MB total):
     - **File 1**: Base `0.0.0` Installer (Permanently Isolated)
     - **File 2**: Active Latest OTA Binary
5. **Seamless User-Driven In-Place Updates**:
   - **Persistent Sidebar Badge**: `↻ Update available [v0.0.1]` appears in the sidebar and persists until updated.
   - **Top-Center Pill**: Non-intrusive title bar pill displays `v0.0.1 Available [Install]` with live percentage download progress and `[Restart]` upon completion.
   - **Zero Data Loss**: In-place silent replacement replaces `gpn.exe` while keeping all local SQLite notes (`gpn_notes.db`) and auth tokens 100% intact.

---

## 📦 Developer Release Commands (`npm run ship`)

Navigate to `pc-app/` to manage desktop releases:

```bash
# 1. Interactive Release Wizard (Prompts for patch, refresh, custom, or seed)
npm run ship

# 2. Ship an Auto-Incremented Patch Update (e.g. 0.0.1 -> 0.0.2)
npm run ship -m "v0.0.2: Feature release changelog"

# 3. Ship a Specific Version Target
npm run ship 0.1.0 -m "v0.1.0: Major feature update"

# 4. Same-Version Refresh (Keep version number, replace binaries in-place)
npm run ship -- --refresh -m "Refresh binary payload in-place"
# Or:
npm run ship -- --force -m "Force binary refresh"

# 5. Fast Publish (Skip cargo/rust compilation, use existing binary)
npm run ship 0.0.1 --skip-build -m "Re-publish existing binary"

# 6. Seed / Re-anchor Base Production Installer (0.0.0)
npm run ship -- --seed -m "v0.0.0: Base production installer for website"
```

## 📋 System Requirements (Windows Desktop)

| Requirement | Specification |
| :--- | :--- |
| **Operating System** | Windows 10 (64-bit, 1809+) or Windows 11 |
| **Processor** | 64-bit processor (x64) |
| **Memory** | 50 MB RAM (idle) |
| **Storage** | 50 MB available disk space |
| **Runtime** | Microsoft Edge WebView2 (bundled / installed automatically) |

---

## 📄 License

Personal project by Gaurav Patil. All rights reserved.
