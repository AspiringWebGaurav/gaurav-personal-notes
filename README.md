# Gaurav Personal Notes (GPN)

A clean, fast personal notes workspace with real-time sync, local-first offline support, and collaboration tools.

---

## 🖥️ Download Desktop App for Windows

Gaurav Personal Notes is available as a native Windows desktop app for Windows 10 and Windows 11.

- **Operating System**: Windows 10 (1809+) & Windows 11 (64-bit)
- **Download**: [gpnotes.eu.cc/download](https://gpnotes.eu.cc/download) *(Mirror: [gphost.eu.cc/raw/gpn-app](https://gphost.eu.cc/raw/gpn-app) only if primary download fails)*
- **Offline Support**: Write and search notes without an active internet connection. Notes sync automatically when back online.
- **Background Mode**: Closing the window keeps the lightweight tray service running in the background for quick capture.

### How to Install on Windows
1. Download the installer from [gpnotes.eu.cc/download](https://gpnotes.eu.cc/download).
2. Double-click the file to install (takes ~5 seconds, no administrator privileges required).
3. Launch **Gaurav Personal Notes** from your Start Menu or Desktop and sign in with your Google account.

---

## 🌐 Web Application

Access your notes from any modern web browser or mobile device:

- **Web Workspace**: [https://gpnotes.eu.cc](https://gpnotes.eu.cc) *(or install as a Progressive Web App)*
- **Mobile Friendly**: Responsive mobile interface with offline caching.

## 🔐 Encrypted Workspace Vault & Developer Setup

> [!IMPORTANT]
> This repository uses an encrypted workspace vault (`gpn-vault.enc`) to protect private agent behavioral rules, developer protocols, and local environment secrets (`.env.local`).
> 
> When you clone this repository, you **MUST first decrypt the vault** to restore all required environment variables and workspace rules. Without unpacking the vault, private API services, desktop releases, and agent rules will not be active.

### How to Restore the Full Workspace (Required on Clone):

1. **Clone the repository**:
   ```bash
   git clone https://github.com/AspiringWebGaurav/gaurav-personal-notes.git
   cd gaurav-personal-notes
   ```

2. **Unpack the vault** (enter your private passphrase when prompted):
   ```bash
   npm run vault:unpack
   ```

3. **Install dependencies**:
   ```bash
   npm install
   cd pc-app && npm install
   ```

4. **Run or build**:
   - **Web App**: `npm run dev`
   - **Desktop App**: `cd pc-app && npm run dev:frontend`
   - **Ship Desktop OTA Binary**: `cd pc-app` and run `push <version>` (e.g. `push 0.0.14`)

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

## ⚡ Over-The-Air (OTA) Desktop Updates

Gaurav Personal Notes desktop applications receive automatic, zero-friction Over-The-Air updates directly from **GPHost** (`https://gphost.eu.cc`), completely independent of GitHub Releases.

### 🛡️ Update Architecture
1. **Isolated Base Installer (`v0.0.0`)**:
   - The production base installer is permanently anchored to `https://gphost.eu.cc/raw/gpn-app` strictly for website downloads at `gpnotes.eu.cc/download`.
   - **Zero Touch**: The base installer is permanently isolated and immutable.
2. **Automated OTA Distribution (`v0.0.1+`)**:
   - Code updates are distributed securely via the OTA release endpoint:
     ```text
     https://gphost.eu.cc/api/v1/releases/gpn/latest
     ```
3. **Cryptographic Minisign Signatures**:
   - Every release payload is signed with Ed25519 Minisign keys. The desktop application cryptographically verifies the signature before applying updates.
4. **Strict 2-File Storage Policy**:
   - GPHost maintains strictly 2 files at all times (~8.5 MB total):
     - **File 1**: Base `v0.0.0` Installer (Permanently Isolated)
     - **File 2**: Active Latest OTA Binary
5. **Seamless In-Place Swaps**:
   - Updates replace the executable while preserving all user data in local SQLite (`gpn_notes.db`) and auth credentials.

---

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
