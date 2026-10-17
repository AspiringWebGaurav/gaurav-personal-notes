import { create } from 'zustand';
import { updateService, UpdateStatus } from '../services/updateService';

interface UpdateState {
  status: UpdateStatus;
  isToastDismissed: boolean;
  isHeaderDismissed: boolean;
  isPatchNotesOpen: boolean;
  activePatchNotesVersion: string | null;
  dismissToast: () => void;
  dismissHeader: () => void;
  showToast: () => void;
  openPatchNotes: (version?: string) => void;
  closePatchNotes: () => void;
  checkForUpdates: () => Promise<void>;
  checkSilently: () => Promise<void>;
  downloadUpdate: (options?: { isExplicitUserAction?: boolean; source?: string }) => Promise<void>;
  installAndRestart: () => Promise<void>;
}

export const useUpdateStore = create<UpdateState>((set) => {
  updateService.subscribe((status) => {
    set((state) => {
      // While active installation or restart is underway, prevent regressing to available or idle
      if (
        (state.status.state === 'installing' || state.status.state === 'restarting') &&
        (status.state === 'available' || status.state === 'idle')
      ) {
        return state;
      }

      const isNewAvailable = status.state === 'available' && state.status.state !== 'available';
      const isNewReady = status.state === 'ready' && state.status.state !== 'ready';
      if (isNewAvailable || isNewReady) {
        try {
          sessionStorage.removeItem('gpn_toast_dismissed');
        } catch {}
      }

      return {
        status: { ...status },
        // When a new update is newly detected or ready, show the toast
        isToastDismissed: isNewAvailable || isNewReady ? false : state.isToastDismissed,
        isHeaderDismissed: isNewAvailable || isNewReady ? false : state.isHeaderDismissed,
      };
    });
  });

  const initialDismissed = (() => {
    try {
      return sessionStorage.getItem('gpn_toast_dismissed') === 'true';
    } catch {
      return false;
    }
  })();

  return {
    status: updateService.getStatus(),
    isToastDismissed: initialDismissed,
    isHeaderDismissed: false,
    isPatchNotesOpen: false,
    activePatchNotesVersion: null,

    openPatchNotes: (version?: string) => {
      set({ isPatchNotesOpen: true, activePatchNotesVersion: version || null });
    },

    closePatchNotes: () => {
      set({ isPatchNotesOpen: false, activePatchNotesVersion: null });
    },

    dismissToast: () => {
      // User clicked "Later" or "X" on the bottom toast:
      // Hide the toast, and transfer update indicators to the top header pill & sidebar!
      try {
        sessionStorage.setItem('gpn_toast_dismissed', 'true');
      } catch {}
      set({ isToastDismissed: true, isHeaderDismissed: false });
    },

    dismissHeader: () => {
      set({ isHeaderDismissed: true });
    },

    showToast: () => {
      try {
        sessionStorage.removeItem('gpn_toast_dismissed');
      } catch {}
      set({ isToastDismissed: false });
    },

    checkForUpdates: async () => {
      set({ isHeaderDismissed: false });
      await updateService.checkForUpdates();
    },

    checkSilently: async () => {
      await updateService.checkSilently();
    },

    downloadUpdate: async (options = { isExplicitUserAction: true, source: 'user_action' }) => {
      await updateService.downloadUpdate(options);
    },

    installAndRestart: async () => {
      await updateService.installAndRestart();
    },
  };
});

if (typeof window !== 'undefined') {
  (window as any).__GPN_UPDATE_STORE__ = useUpdateStore;
}

