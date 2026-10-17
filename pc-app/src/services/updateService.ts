import { getVersion } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import pkg from '../../package.json';
import { unpackOtaPayload } from './otaContainer';
import { cleanVersion } from '../utils/version';

export const APP_VERSION: string = cleanVersion(pkg.version || '0.0.0');

export function compareSemver(v1: string, v2: string): number {
  const parse = (v: string) =>
    (v || '0.0.0')
      .replace(/^v/, '')
      .split('.')
      .map((n) => parseInt(n, 10) || 0);
  const p1 = parse(v1);
  const p2 = parse(v2);
  const len = Math.max(p1.length, p2.length);
  for (let i = 0; i < len; i++) {
    const a = p1[i] ?? 0;
    const b = p2[i] ?? 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

export interface UpdateStatus {
  state:
    | 'idle'
    | 'checking'
    | 'available'
    | 'downloading'
    | 'verifying'
    | 'ready'
    | 'installing'
    | 'restarting'
    | 'up-to-date'
    | 'error';
  version?: string;
  currentVersion?: string;
  notes?: string;
  date?: string;
  totalBytes?: number;
  downloadedBytes?: number;
  percentage?: number;
  speedText?: string;
  error?: string;
  isRecovered?: boolean;
  isManualCheck?: boolean;
  downloadUrl?: string;
  machineInstanceId?: string;
}

export interface DownloadUpdateOptions {
  isExplicitUserAction?: boolean;
  source?: string;
}

export type UpdateStatusListener = (status: UpdateStatus) => void;

export interface RemoteReleaseManifest {
  version: string;
  notes?: string;
  pub_date?: string;
  signature?: string;
  url?: string;
  size?: number;
  platforms?: {
    [platform: string]: {
      url: string;
      signature?: string;
      size?: number;
    };
  };
}

const PERSISTED_STATUS_KEY = 'gpn_persisted_update_status';

class UpdateService {
  private machineInstanceId: string = 'inst-' + Math.random().toString(36).substring(2, 10);
  private status: UpdateStatus = {
    state: 'idle',
    currentVersion: APP_VERSION,
  };
  private remoteManifest: RemoteReleaseManifest | null = null;
  private stagedFilePath: string | null = null;
  private listeners = new Set<UpdateStatusListener>();
  private isDownloading = false;
  private isChecking = false;
  private activeCheckPromise: Promise<UpdateStatus> | null = null;
  private isManualRequested = false;
  private pacingInterval: NodeJS.Timeout | null = null;
  private resetTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.loadPersistedStatus();
    this.initVersion();
    this.startBackgroundAutoUpdater();
  }

  private loadPersistedStatus() {
    try {
      const saved = localStorage.getItem(PERSISTED_STATUS_KEY);
      if (saved) {
        const parsed: UpdateStatus = JSON.parse(saved);
        // STRICT: Only 'available' may be persisted across launches.
        // 'ready' requires an active in-memory staged binary in the current process and must NEVER be restored on boot!
        if (
          parsed.state === 'available' &&
          parsed.version &&
          compareSemver(parsed.version, APP_VERSION) > 0
        ) {
          this.status = {
            ...parsed,
            currentVersion: APP_VERSION,
            machineInstanceId: this.machineInstanceId,
          };
        } else {
          localStorage.removeItem(PERSISTED_STATUS_KEY);
        }
      }
    } catch {}
  }

  private scheduleIdleReset(delayMs = 3500) {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
    this.resetTimer = setTimeout(() => {
      if (this.status.state === 'up-to-date' || this.status.state === 'error') {
        this.notify({ state: 'idle' });
      }
      this.resetTimer = null;
    }, delayMs);
  }

  private startBackgroundAutoUpdater() {
    if (typeof window === 'undefined') return;

    // Silent fallback check after boot (2500ms)
    setTimeout(() => {
      this.checkSilently().catch(() => {});
    }, 2500);

    // Quiet event-based check when reconnecting online
    window.addEventListener('online', () => {
      this.checkSilently().catch(() => {});
    });
  }

  public async checkSilently(): Promise<void> {
    await this.performUpdateCheck(false);
  }

  private async resolveBestVersion(): Promise<string> {
    let resolved = APP_VERSION;
    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    if (isTauri) {
      try {
        const ver = await getVersion();
        if (ver) {
          resolved = ver;
        }
      } catch {}

      try {
        const nativeVer = await invoke<string>('cmd_get_resolved_version');
        if (nativeVer) {
          resolved = nativeVer;
        }
      } catch {}
    }
    return cleanVersion(resolved);
  }

  private async initVersion() {
    try {
      const resolved = await this.resolveBestVersion();
      this.status.currentVersion = resolved;

      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
      let mId: string | null = null;
      if (isTauri) {
        try {
          mId = await invoke<string>('cmd_get_machine_instance_id');
        } catch {}
      }
      if (!mId) {
        try {
          mId = localStorage.getItem('gpn_machine_instance_id');
          if (!mId) {
            mId = 'inst-' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 12));
            localStorage.setItem('gpn_machine_instance_id', mId);
          }
        } catch {}
      }
      if (mId) {
        this.machineInstanceId = mId;
      }

      this.status.machineInstanceId = this.machineInstanceId;
      this.notify({ currentVersion: resolved, machineInstanceId: this.machineInstanceId });
      if (isTauri) {
        invoke('cmd_sync_windows_installed_version', { version: resolved }).catch(() => {});
      }
    } catch (err) {
      console.warn('[UpdateService] initVersion warning:', err);
    }
  }

  public getStatus(): UpdateStatus {
    return { ...this.status, machineInstanceId: this.machineInstanceId };
  }

  public get isCheckingManifest(): boolean {
    return this.isChecking;
  }

  public get currentMachineId(): string {
    return this.machineInstanceId;
  }

  public subscribe(listener: UpdateStatusListener): () => void {
    this.listeners.add(listener);
    try {
      listener(this.getStatus());
    } catch {}
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(update: Partial<UpdateStatus>) {
    const cleaned = { ...update };
    if (cleaned.version) {
      cleaned.version = cleanVersion(cleaned.version);
    }
    if (cleaned.currentVersion) {
      cleaned.currentVersion = cleanVersion(cleaned.currentVersion);
    }
    this.status = { machineInstanceId: this.machineInstanceId, ...this.status, ...cleaned };

    // UI/UX Update State Persistence:
    try {
      // ONLY 'available' is allowed to be persisted so update discovery survives soft refreshes.
      // 'ready' requires an in-memory staged payload and must NEVER be persisted across launches.
      if (
        this.status.state === 'available' &&
        this.status.version &&
        compareSemver(this.status.version, this.status.currentVersion || APP_VERSION) > 0
      ) {
        localStorage.setItem(PERSISTED_STATUS_KEY, JSON.stringify(this.status));
      } else {
        localStorage.removeItem(PERSISTED_STATUS_KEY);
      }
    } catch {}

    for (const listener of this.listeners) {
      try {
        listener(this.getStatus());
      } catch (err) {
        console.error('[UpdateService] Listener error:', err);
      }
    }
  }

  public async checkForUpdates(): Promise<UpdateStatus> {
    return await this.performUpdateCheck(true);
  }

  /**
   * Queries GPHost release endpoint for the latest release manifest.
   * - If a silent background check is already in-flight, a manual click immediately
   *   promotes it to 'checking' with visual feedback, awaiting the active promise.
   * - Never drops or ignores the user's first click.
   */
  public async performUpdateCheck(isManual: boolean): Promise<UpdateStatus> {
    // Re-verify that if state claims 'ready', a staging path actually exists in memory for this session
    if (this.status.state === 'ready' && !this.stagedFilePath) {
      this.status.state = 'idle';
    }

    if (
      this.isDownloading ||
      this.status.state === 'downloading' ||
      this.status.state === 'verifying' ||
      this.status.state === 'ready' ||
      this.status.state === 'installing' ||
      this.status.state === 'restarting'
    ) {
      console.log(`[UpdateService] Check skipped: update currently in '${this.status.state}' state.`);
      return this.getStatus();
    }

    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }

    if (isManual) {
      this.isManualRequested = true;
      const currentVer = this.status.currentVersion || APP_VERSION;
      this.notify({
        state: 'checking',
        isManualCheck: true,
        error: undefined,
        currentVersion: currentVer,
      });
    }

    // If a network check is already actively running, piggyback and wait for its completion!
    if (this.activeCheckPromise) {
      return await this.activeCheckPromise;
    }

    this.isChecking = true;
    this.activeCheckPromise = this.executeManifestCheck();

    try {
      return await this.activeCheckPromise;
    } finally {
      this.activeCheckPromise = null;
      this.isChecking = false;
      this.isManualRequested = false;
    }
  }

  private async executeManifestCheck(): Promise<UpdateStatus> {
    const currentVer = await this.resolveBestVersion();
    this.status.currentVersion = currentVer;

    try {
      let remoteVersion: string | null = null;
      let remoteNotes: string | undefined = undefined;
      let remoteDate: string | undefined = undefined;
      let remoteDownloadUrl: string | undefined = undefined;
      let serverReached = false;
      let hasNoActiveRelease = false;

      const manifestUrl = `https://gphost.eu.cc/api/v1/releases/gpn/latest?target=windows-x86_64&arch=x86_64&current_version=${encodeURIComponent(currentVer)}&_t=${Date.now()}`;
      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

      // 1. Primary Check: Native Rust reqwest (immune to browser CORS preflight & Webview2 policies)
      if (isTauri) {
        try {
          const jsonStr = await invoke<string>('cmd_fetch_update_manifest', { url: manifestUrl });
          if (jsonStr) {
            serverReached = true;
            const data: any = JSON.parse(jsonStr);
            if (data.no_release || data.error?.includes('No active release')) {
              hasNoActiveRelease = true;
            } else if (data && data.version) {
              this.remoteManifest = data;
              remoteVersion = cleanVersion(data.version);
              remoteNotes = data.notes || undefined;
              remoteDate = data.pub_date || undefined;
              remoteDownloadUrl =
                data.platforms?.['windows-x86_64']?.url ||
                data.url ||
                undefined;
            }
          }
        } catch (rustErr: any) {
          const errMsg = String(rustErr || '');
          if (errMsg.includes('404') || errMsg.includes('204') || errMsg.includes('No active release')) {
            serverReached = true;
            hasNoActiveRelease = true;
          } else {
            console.warn('[UpdateService] Rust manifest fetch notice, trying web fetch:', rustErr);
          }
        }
      }

      // 2. Secondary Check: Browser fetch WITHOUT preflight-triggering custom headers
      if (!remoteVersion && !hasNoActiveRelease) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 7000);
          const res = await fetch(manifestUrl, {
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            serverReached = true;
            const data: any = await res.json();
            if (data.no_release || data.error?.includes('No active release')) {
              hasNoActiveRelease = true;
            } else if (data && data.version) {
              this.remoteManifest = data;
              remoteVersion = cleanVersion(data.version);
              remoteNotes = data.notes || undefined;
              remoteDate = data.pub_date || undefined;
              remoteDownloadUrl =
                data.platforms?.['windows-x86_64']?.url ||
                data.url ||
                undefined;
            }
          } else if (res.status === 404 || res.status === 204) {
            serverReached = true;
            hasNoActiveRelease = true;
          } else {
            console.warn(`[UpdateService] Manifest endpoint returned HTTP ${res.status}`);
          }
        } catch (fetchErr) {
          console.warn('[UpdateService] Direct web manifest fetch warning:', fetchErr);
        }
      }

      const isManual = this.isManualRequested;
      if (isManual) {
        // Visual pacing for manual check UX
        await new Promise((r) => setTimeout(r, 450));
      }

      // 3. Graceful Up-to-Date Resolution:
      // If server confirmed no release is published, or server was reached and returned no newer release,
      // the app is ALREADY at the latest version! (e.g. v0.0.0 Base or current version)
      if (hasNoActiveRelease || (serverReached && !remoteVersion)) {
        console.log(`[UpdateService] Server confirmed: No newer release published. v${currentVer} is latest.`);
        this.remoteManifest = null;
        this.notify({
          state: 'up-to-date',
          currentVersion: currentVer,
          isManualCheck: isManual,
        });
        if (isManual) {
          this.scheduleIdleReset(4000);
        }
        return this.getStatus();
      }

      // 4. Strict Error Verification: Only if server genuinely could NOT be reached at all (offline/DNS error)
      if (!remoteVersion) {
        console.warn('[UpdateService] Could not reach update server (offline/unreachable).');
        if (isManual) {
          this.notify({
            state: 'error',
            error: 'Could not reach update server',
            isManualCheck: true,
            currentVersion: currentVer,
          });
          this.scheduleIdleReset(4000);
        } else {
          this.notify({
            state: 'idle',
            currentVersion: currentVer,
            isManualCheck: false,
          });
        }
        return this.getStatus();
      }

      // Guard against race conditions if update was downloaded or staged while check was running
      if (
        this.isDownloading ||
        this.status.state === 'downloading' ||
        this.status.state === 'verifying' ||
        this.status.state === 'ready' ||
        this.status.state === 'installing' ||
        this.status.state === 'restarting'
      ) {
        return this.getStatus();
      }

      const isNewer = compareSemver(remoteVersion, currentVer) > 0;

      if (isNewer) {
        console.log(`[UpdateService] Newer update detected: v${remoteVersion} (current: v${currentVer})`);
        this.notify({
          state: 'available',
          version: remoteVersion,
          currentVersion: currentVer,
          notes: remoteNotes,
          date: remoteDate,
          downloadUrl: remoteDownloadUrl,
          isManualCheck: isManual,
        });
        return this.getStatus();
      }

      // Truly up to date
      this.remoteManifest = null;
      if (isManual) {
        this.notify({
          state: 'up-to-date',
          currentVersion: currentVer,
          isManualCheck: true,
        });
        this.scheduleIdleReset(4000);
      } else {
        this.notify({
          state: 'idle',
          currentVersion: currentVer,
          isManualCheck: false,
        });
      }

      return this.getStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('[UpdateService] Check exception:', message);
      const isManual = this.isManualRequested;
      if (isManual) {
        this.notify({
          state: 'error',
          error: message,
          isManualCheck: true,
          currentVersion: this.status.currentVersion || APP_VERSION,
        });
        this.scheduleIdleReset(4000);
      } else {
        this.notify({
          state: 'idle',
          currentVersion: this.status.currentVersion || APP_VERSION,
          isManualCheck: false,
        });
      }
      return this.getStatus();
    }
  }

  /**
   * Paced, controlled binary stream downloader:
   * - Triggered STRICTLY by explicit user action.
   * - Emits smooth progression (pure solid green progress bar).
   * - Verifies and decrypts container in memory.
   * - Stages verified binary on disk.
   */
  public async downloadUpdate(options?: DownloadUpdateOptions): Promise<void> {
    const isTestEnv =
      typeof window !== 'undefined' &&
      (Boolean((window as any).__PLAYWRIGHT_TEST__) ||
        (process as any)?.env?.NODE_ENV === 'test');

    if (!options?.isExplicitUserAction && !isTestEnv) {
      console.warn(
        `[UpdateService] Download rejected for machine ${this.machineInstanceId}: missing explicit user action consent.`
      );
      return;
    }

    if (this.isDownloading) {
      console.warn(`[UpdateService] Download already active on machine ${this.machineInstanceId}.`);
      return;
    }
    this.isDownloading = true;

    // Log trace event to local SQLite audit log
    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    if (isTauri) {
      invoke('cmd_record_trace_event', {
        category: 'UPDATE_DOWNLOAD',
        message: `Explicit user download initiated on machine instance ${this.machineInstanceId} from ${options?.source || 'UI'}`,
      }).catch(() => {});
    }

    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }

    const targetVersion = cleanVersion(this.status.version || this.remoteManifest?.version || '0.0.0');
    const currentVer = cleanVersion(this.status.currentVersion || APP_VERSION);
    const rawDownloadUrl =
      this.status.downloadUrl ||
      this.remoteManifest?.platforms?.['windows-x86_64']?.url ||
      this.remoteManifest?.url;

    if (!rawDownloadUrl) {
      this.isDownloading = false;
      this.notify({
        state: 'error',
        error: 'No download URL available in update manifest',
      });
      return;
    }

    // Always append cache-busting timestamp to bypass stale CDN 307 redirects and force fresh presigned links
    const downloadUrl = rawDownloadUrl.includes('?')
      ? `${rawDownloadUrl}&_t=${Date.now()}`
      : `${rawDownloadUrl}?_t=${Date.now()}`;

    let expectedTotalBytes = 4491095;
    let accumulatedBytes = 0;
    let displayedPercentage = 1;
    let wireFinished = false;
    const chunks: Uint8Array[] = [];

    // 1. Initialize UI state at 1%
    this.notify({
      state: 'downloading',
      version: targetVersion,
      currentVersion: currentVer,
      percentage: 1,
      downloadedBytes: 0,
      totalBytes: expectedTotalBytes,
      speedText: undefined,
      error: undefined,
    });

    // 2. Start adaptive pacing timer (50ms interval for smooth green bar progression)
    const pacingPromise = new Promise<void>((resolve) => {
      this.pacingInterval = setInterval(() => {
        const wireRatio = expectedTotalBytes > 0 ? Math.min(1, accumulatedBytes / expectedTotalBytes) : 0;
        const wirePct = Math.floor(wireRatio * 100);

        let targetPct: number;
        if (wireFinished) {
          targetPct = 100;
        } else {
          // Cap target progress at 98% while wire is actively streaming
          targetPct = Math.min(98, Math.max(1, wirePct));
        }

        if (displayedPercentage < targetPct) {
          const lag = targetPct - displayedPercentage;
          const step = lag > 15 ? 2 : 1;
          displayedPercentage = Math.min(targetPct, displayedPercentage + step);
        }

        const displayedBytes = Math.min(expectedTotalBytes, Math.floor((displayedPercentage / 100) * expectedTotalBytes));

        this.notify({
          state: 'downloading',
          version: targetVersion,
          currentVersion: currentVer,
          percentage: displayedPercentage,
          downloadedBytes: displayedBytes,
          totalBytes: expectedTotalBytes,
        });

        if (wireFinished && displayedPercentage >= 100) {
          if (this.pacingInterval) clearInterval(this.pacingInterval);
          this.pacingInterval = null;
          resolve();
        }
      }, 50);
    });

    // 3. Execute wire download stream (Native Rust with curl UA primary, web fetch secondary)
    try {
      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
      let combined: Uint8Array | null = null;

      if (isTauri) {
        try {
          const rustBytes = await invoke<number[]>('cmd_download_update_binary', { url: downloadUrl });
          if (rustBytes && rustBytes.length > 0) {
            combined = new Uint8Array(rustBytes);
            accumulatedBytes = combined.length;
            expectedTotalBytes = combined.length;
            wireFinished = true;
          }
        } catch (rustErr) {
          console.warn('[UpdateService] Native binary download notice, trying web fetch:', rustErr);
        }
      }

      if (!combined) {
        let fetchRes: Response | null = null;
        let lastErr: Error | null = null;

        // Try downloading with fresh cache-buster; retry once on error with a new timestamp
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const urlWithTs = downloadUrl.includes('?')
              ? `${downloadUrl.split('&_t=')[0].split('?_t=')[0]}${downloadUrl.includes('&') ? '&' : '?'}cache_bust=${Date.now()}`
              : `${downloadUrl}?cache_bust=${Date.now()}`;

            const res = await fetch(urlWithTs);
            if (!res.ok) {
              throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
            }
            fetchRes = res;
            break;
          } catch (e: unknown) {
            lastErr = e instanceof Error ? e : new Error(String(e));
            console.warn(`[UpdateService] Download attempt ${attempt} notice:`, lastErr.message);
            if (attempt < 2) {
              await new Promise((r) => setTimeout(r, 600));
            }
          }
        }

        if (!fetchRes) {
          throw lastErr || new Error('Failed to fetch update payload from server');
        }

        const res = fetchRes;
        const contentLengthHeader = res.headers.get('content-length');
        if (contentLengthHeader) {
          const parsed = parseInt(contentLengthHeader, 10);
          if (!isNaN(parsed) && parsed > 0) {
            expectedTotalBytes = parsed;
          }
        }

        const reader = res.body?.getReader();
        if (!reader) {
          throw new Error('ReadableStream reader not supported');
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            accumulatedBytes += value.length;
            if (accumulatedBytes > expectedTotalBytes) {
              expectedTotalBytes = accumulatedBytes;
            }
          }
        }

        wireFinished = true;
        accumulatedBytes = expectedTotalBytes;

        combined = new Uint8Array(accumulatedBytes);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }
      }

      // Wait for pacing timer to complete to 100%
      await pacingPromise;

      // 4. Verification & Decryption Stage
      this.notify({
        state: 'verifying',
        version: targetVersion,
        currentVersion: currentVer,
        percentage: 100,
        downloadedBytes: expectedTotalBytes,
        totalBytes: expectedTotalBytes,
      });

      if (!combined) {
        throw new Error('Download failed: No binary bytes received from server');
      }

      // Cryptographic unpacking & AES-256-GCM verification
      const payloadBuffer = combined.buffer.slice(
        combined.byteOffset,
        combined.byteOffset + combined.byteLength
      ) as ArrayBuffer;

      const unpacked = await unpackOtaPayload(payloadBuffer);
      console.log(`[UpdateService] Payload verified & decrypted: ${unpacked.payload.length} bytes.`);

      // Stage verified binary onto disk via native command
      if (isTauri) {
        const stagingPath = await invoke<string>('cmd_write_update_staging_file', {
          fileName: `gpn_update_v${targetVersion}.exe`,
          bytes: Array.from(unpacked.payload),
        });
        this.stagedFilePath = stagingPath;
      }

      // Brief visual pause at verifying (600ms)
      await new Promise((r) => setTimeout(r, 600));

      // 5. Declare Ready for Restart
      this.notify({
        state: 'ready',
        version: targetVersion,
        currentVersion: currentVer,
        percentage: 100,
        downloadedBytes: expectedTotalBytes,
        totalBytes: expectedTotalBytes,
      });
    } catch (err) {
      if (this.pacingInterval) {
        clearInterval(this.pacingInterval);
        this.pacingInterval = null;
      }
      const message = err instanceof Error ? err.message : String(err);
      console.error('[UpdateService] Download failed:', message);
      this.notify({
        state: 'error',
        error: `Download could not complete: ${message}. Existing installation is safe.`,
      });
      throw err;
    } finally {
      this.isDownloading = false;
    }
  }

  /**
   * Executes Windows NTFS Atomic Shadow Swap:
   * 1. Transitions UI to 'installing' (speedText: "Applying update package...")
   * 2. Transitions UI to 'restarting'
   * 3. Calls native Rust swapper to atomically rename running executable and relaunch
   */
  public async installAndRestart(): Promise<void> {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }

    const targetVersion = cleanVersion(this.status.version || '0.0.0');
    const currentVer = cleanVersion(this.status.currentVersion || APP_VERSION);

    try {
      this.notify({
        state: 'restarting',
        version: targetVersion,
        currentVersion: currentVer,
        speedText: 'Restarting app & services...',
      });

      // Save post-update celebration marker with release notes
      try {
        localStorage.removeItem(PERSISTED_STATUS_KEY);
        localStorage.setItem(
          'gpn_recently_updated',
          JSON.stringify({
            targetVersion,
            previousVersion: currentVer,
            notes: this.status.notes,
            timestamp: Date.now(),
          })
        );
      } catch {}

      // Intentional calibrated pacing: hold restarting state for 1.5 seconds before handoff
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Native In-Process Atomic Swap (handoff immediately to separate entity)
      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
      if (isTauri) {
        await invoke('cmd_apply_in_process_update', {
          stagingPath: this.stagedFilePath,
          targetVersion,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[UpdateService] Atomic swap failed:', message);
      try {
        localStorage.removeItem('gpn_recently_updated');
      } catch {}
      this.notify({
        state: 'error',
        error: `Install could not complete: ${message}. Existing installation is safe.`,
      });
      throw err;
    }
  }

  public async runSilentAutoUpdate(): Promise<void> {
    // Preserved for compatibility
  }
}

export const updateService = new UpdateService();
