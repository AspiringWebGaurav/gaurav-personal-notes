import { create } from 'zustand';
import { syncService } from '../services/syncService';
import type { SyncStatusSummary } from '../types/sync';

import { useNotesStore } from './notesStore';

interface SyncState {
  status: SyncStatusSummary;
  isSyncing: boolean;
  isManualSyncing: boolean;

  fetchStatus: () => Promise<void>;
  triggerSync: () => Promise<void>;
  updateStatus: (status: SyncStatusSummary) => void;
  initializeListener: () => Promise<() => void>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: {
    state: 'idle',
    pendingCount: 0,
    lastSyncedAt: null,
    lastError: null,
  },
  isSyncing: false,
  isManualSyncing: false,

  fetchStatus: async () => {
    try {
      const summary = await syncService.getSyncStatus();
      set((state) => ({
        status: summary,
        isSyncing: summary.state === 'syncing' ? state.isManualSyncing : false,
      }));
    } catch (err) {
      console.error('Failed to get sync status:', err);
    }
  },

  triggerSync: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true, isManualSyncing: true });
    const startTime = Date.now();
    try {
      await syncService.triggerSync();
    } catch (err) {
      console.error('Failed to trigger sync:', err);
    } finally {
      // Guarantee minimum 1000ms progress duration for calm, fluid user feedback
      const elapsed = Date.now() - startTime;
      if (elapsed < 1000) {
        await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed));
      }
      await get().fetchStatus();
      useNotesStore.getState().loadNotes(true);
      set({ isSyncing: false, isManualSyncing: false });
    }
  },

  updateStatus: (status: SyncStatusSummary) => {
    set((state) => ({
      status,
      isSyncing: status.state === 'syncing' ? state.isManualSyncing : false,
    }));
  },

  initializeListener: async () => {
    try {
      await get().fetchStatus();
      const unlisten = await syncService.onSyncStatusChanged((summary) => {
        set((state) => ({
          status: summary,
          isSyncing: summary.state === 'syncing' ? state.isManualSyncing : false,
        }));
        // Only reload notes if remote documents actually changed!
        if (summary.hasRemoteChanges) {
          useNotesStore.getState().loadNotes(true);
        }
      });
      return unlisten;
    } catch (err) {
      console.warn('Sync listener initialization deferred:', err);
      return () => {};
    }
  },
}));