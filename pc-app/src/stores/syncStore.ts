import { create } from 'zustand';
import { syncService } from '../services/syncService';
import type { SyncStatusSummary } from '../types/sync';

import { useNotesStore } from './notesStore';

interface SyncState {
  status: SyncStatusSummary;
  isSyncing: boolean;
  isManualSyncing: boolean;

  fetchStatus: () => Promise<void>;
  triggerSync: (isManual?: boolean | unknown) => Promise<void>;
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

  triggerSync: async (isManual?: boolean | unknown) => {
    const manual = typeof isManual === 'boolean' ? isManual : true;
    if (get().isSyncing) return;
    set({ isSyncing: true, isManualSyncing: manual });
    const startTime = Date.now();
    try {
      await syncService.triggerSync(manual);
    } catch (err) {
      console.error('Failed to trigger sync:', err);
    } finally {
      if (manual) {
        // Guarantee minimum 1000ms progress duration for calm, fluid user feedback on button clicks
        const elapsed = Date.now() - startTime;
        if (elapsed < 1000) {
          await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed));
        }
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

      // 100% Event-Driven Remote Synchronization:
      // 1. Window Focus Event (debounced 60s)
      // 2. Document Visibility Event (debounced 60s)
      // 3. Online Reconnect Event
      let lastEventSyncTime = 0;
      const EVENT_DEBOUNCE_MS = 60_000; // 60 seconds minimum between focus-triggered pulls

      const handleResumeEvent = () => {
        const now = Date.now();
        if (now - lastEventSyncTime < EVENT_DEBOUNCE_MS) return;
        lastEventSyncTime = now;

        if (!get().isSyncing) {
          get().triggerSync(false); // Quiet event-driven pull without button flash
        }
      };

      window.addEventListener('focus', handleResumeEvent);
      window.addEventListener('online', handleResumeEvent);
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          handleResumeEvent();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

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

      return () => {
        window.removeEventListener('focus', handleResumeEvent);
        window.removeEventListener('online', handleResumeEvent);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        unlisten();
      };
    } catch (err) {
      console.warn('Sync listener initialization deferred:', err);
      return () => {};
    }
  },
}));