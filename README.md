# Gaurav Personal Notes (GPN)

A modern, fast, encrypted personal notes workspace with real-time multi-peer collaboration, local-first offline storage, and seamless cross-platform synchronization across **Web, Windows PC, and Android**.

[![Website](https://img.shields.io/badge/Web_App-gpnotes.eu.cc-violet?style=flat&logo=googlechrome&logoColor=white)](https://gpnotes.eu.cc)
[![Windows](https://img.shields.io/badge/Windows_Desktop-v0.0.0+-blue?style=flat&logo=windows&logoColor=white)](https://gpnotes.eu.cc/download)
[![Android](https://img.shields.io/badge/Android_APK-v0.0.0+-emerald?style=flat&logo=android&logoColor=white)](https://gpnotes.eu.cc/download)
[![Downloads](https://img.shields.io/badge/Download_Hub-gpnotes.eu.cc%2Fdownload-indigo?style=flat&logo=cloudflare&logoColor=white)](https://gpnotes.eu.cc/download)

---

## 🌟 Choose Your Platform

Gaurav Personal Notes is built for unified access anywhere—available across **Web**, **Desktop PC**, and **Mobile Android**.

| Platform | Type | Key Features | Access & Download |
| :--- | :--- | :--- | :--- |
| **🌐 Web App** | Browser / PWA | Instant access from any browser, zero install, offline PWA support, cloud sync | [**Open Web App**](https://gpnotes.eu.cc) |
| **🖥️ Desktop App** | Windows Native (x64) | Local SQLite storage, system tray background quick capture, atomic shadow self-updater | [**Download for Windows**](https://gpnotes.eu.cc/download) |
| **📱 Mobile App** | Android (APK) | Mobile-optimized TipTap editor, docked formatting toolbar, in-process OTA updates | [**Download for Android**](https://gpnotes.eu.cc/download) |

---

## 📥 Download Hub

Visit the official unified download portal: **[https://gpnotes.eu.cc/download](https://gpnotes.eu.cc/download)**

The download portal automatically detects your operating system and provides one-tap direct access to the latest packages.

### 🖥️ Windows Desktop App
- **Supported OS**: Windows 10 (64-bit, 1809+) & Windows 11
- **Primary Download**: [gpnotes.eu.cc/download](https://gpnotes.eu.cc/download) *(Mirror fallback: [gphost.eu.cc/raw/gpn-app](https://gphost.eu.cc/raw/gpn-app))*
- **Installation**: Lightweight base installer (~4 MB) installs in ~5 seconds with zero administrator UAC prompts.
- **Offline First**: All notes are stored locally in an embedded SQLite database (`gpn_notes.db`) and synchronize automatically when connected.
- **In-Process Self-Updater**: Background OTA engine delivers silent atomic updates without re-running installers or showing NSIS wizards.

### 📱 Android Mobile App
- **Supported OS**: Android 8.0+ (API level 26+)
- **Primary Download**: [gpnotes.eu.cc/download](https://gpnotes.eu.cc/download) *(Mirror fallback: [gphost.eu.cc/raw/1qdLUo3BRtg1](https://gphost.eu.cc/raw/1qdLUo3BRtg1))*
- **Installation**: Pure standalone APK (`gpn-base-v0.0.0.apk`) with in-process dynamic OTA swap engine.
- **Mobile UX**: Touch-optimized interface, haptic feedback, docked formatting toolbar, and full gesture navigation support.

### 🌐 Web Application
- **URL**: [https://gpnotes.eu.cc](https://gpnotes.eu.cc)
- **Zero Install**: Launch directly in Chrome, Edge, Safari, or Firefox.
- **Installable PWA**: Add to your home screen or desktop with offline caching and background sync.

---

## ✨ Core Features

- **🤝 Real-Time Co-op Collaboration**: Collaborative rooms powered by Yjs and WebRTC peer-to-peer mesh. Write together simultaneously across Web, Windows PC, and Android with sub-millisecond sync.
- **⚡ Local-First & Offline Resilience**: Full read and write functionality without an internet connection. Changes queue locally and sync cleanly when connectivity is restored.
- **🔥 Smart Burn Notes**: Cryptographically protected view-once notes that automatically self-destruct after being opened.
- **🎨 Modern Dark & Light Mode**: Curated HSL color palette, smooth micro-animations, and fluid responsive design.
- **🔄 Dynamic In-Process OTA Updates**: Both Desktop and Mobile apps receive real-time OTA updates delivered via Cloudflare R2 and GPHost edge services.

---

## 🔐 Encrypted Workspace Vault & Developer Setup

> [!IMPORTANT]
> This repository uses an encrypted workspace vault (`gpn-vault.enc`) to protect workspace configurations, developer protocols, and local environment secrets (`.env.local`).
> 
> When you clone this repository, you **MUST first decrypt the vault** to restore all required environment variables and workspace assets.

### Workspace Setup:

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
   ```

4. **Start local development**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Production Build**:
   ```bash
   npm run build
   npm run start
   ```

---

## 📋 System Requirements

| Platform | Minimum Requirements | Recommended |
| :--- | :--- | :--- |
| **Web** | Any modern evergreen browser (Chrome, Edge, Firefox, Safari) | Latest Chrome / Edge |
| **Windows Desktop** | Windows 10 (64-bit, 1809+) or Windows 11, 50 MB disk | 64-bit processor, WebView2 runtime |
| **Android Mobile** | Android 8.0 (Oreo, API 26) | Android 10+ with gesture navigation |

---

## 📄 License

Personal project by Gaurav Patil. All rights reserved.
