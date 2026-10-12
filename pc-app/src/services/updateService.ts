import { check, Update, DownloadEvent } from '@tauri-apps/plugin-updater';

export interface UpdateStatus {
  state: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'up-to-date' | 'error';
  version?: string;
  currentVersion?: string;
  notes?: string;
  date?: string;
  totalBytes?: number;
  downloadedBytes?: number;
  percentage?: number;
  error?: string;
}

export type UpdateStatusListener = (status: UpdateStatus) => void;

class UpdateService {
  private currentUpdate: Update | null = null;
  private status: UpdateStatus = { state: 'idle' };
  private listeners = new Set<UpdateStatusListener>();

  public getStatus(): UpdateStatus {
    return { ...this.status };
  }

  public subscribe(listener: UpdateStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(update: Partial<UpdateStatus>) {
    this.status = { ...this.status, ...update };
    for (const listener of this.listeners) {
      try {
        listener(this.getStatus());
      } catch (err) {
        console.error('[UpdateService] Listener error:', err);
      }
    }
  }

  /**
   * Checks GPHost release endpoint for an update.
   */
  public async checkForUpdates(): Promise<UpdateStatus> {
    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    if (!isTauri) {
      this.notify({ state: 'up-to-date' });
      return this.getStatus();
    }

    try {
      this.notify({ state: 'checking', error: undefined });
      const update = await check();

      if (!update) {
        this.currentUpdate = null;
        this.notify({ state: 'up-to-date' });
        return this.getStatus();
      }

      this.currentUpdate = update;
      this.notify({
        state: 'available',
        version: update.version,
        currentVersion: update.currentVersion,
        notes: update.body || undefined,
        date: update.date || undefined,
      });

      return this.getStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('[UpdateService] Check failed:', message);
      this.notify({ state: 'error', error: message });
      return this.getStatus();
    }
  }

  /**
   * Downloads the update package with progress events.
   */
  public async downloadUpdate(): Promise<void> {
    if (!this.currentUpdate) {
      throw new Error('No update available to download');
    }

    try {
      let totalBytes = 0;
      let downloadedBytes = 0;

      this.notify({
        state: 'downloading',
        totalBytes,
        downloadedBytes: 0,
        percentage: 0,
        error: undefined,
      });

      await this.currentUpdate.download((event: DownloadEvent) => {
        if (event.event === 'Started') {
          totalBytes = event.data.contentLength || 0;
          this.notify({
            state: 'downloading',
            totalBytes,
            downloadedBytes,
            percentage: totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0,
          });
        } else if (event.event === 'Progress') {
          downloadedBytes += event.data.chunkLength;
          const percentage = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
          this.notify({
            state: 'downloading',
            totalBytes,
            downloadedBytes,
            percentage,
          });
        } else if (event.event === 'Finished') {
          this.notify({
            state: 'ready',
            totalBytes,
            downloadedBytes,
            percentage: 100,
          });
        }
      });

      this.notify({ state: 'ready', percentage: 100 });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[UpdateService] Download failed:', message);
      this.notify({ state: 'error', error: message });
      throw err;
    }
  }

  /**
   * Installs the downloaded update and relaunches the app.
   * On Windows, this launches the NSIS silent updater and exits the current process.
   */
  public async installAndRestart(): Promise<void> {
    if (!this.currentUpdate) {
      throw new Error('No update ready for installation');
    }

    try {
      await this.currentUpdate.install({ restartAfterInstall: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[UpdateService] Install failed:', message);
      this.notify({ state: 'error', error: message });
      throw err;
    }
  }
}

export const updateService = new UpdateService();
