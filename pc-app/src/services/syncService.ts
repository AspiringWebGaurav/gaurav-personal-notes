import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { SyncStatusSummary } from '../types/sync';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export const syncService = {
  async triggerSync(): Promise<void> {
    if (isTauri) {
      return await invoke<void>('cmd_trigger_sync');
    }
  },

  async getSyncStatus(): Promise<SyncStatusSummary> {
    if (isTauri) {
      return await invoke<SyncStatusSummary>('cmd_get_sync_status');
    }
    return {
      state: 'synced',
      pendingCount: 0,
      lastSyncedAt: Date.now(),
      lastError: null,
    };
  },

  async onSyncStatusChanged(
    callback: (summary: SyncStatusSummary) => void
  ): Promise<UnlistenFn> {
    if (isTauri) {
      return await listen<SyncStatusSummary>('sync-status-changed', (event) => {
        callback(event.payload);
      });
    }
    return () => {};
  },
};
