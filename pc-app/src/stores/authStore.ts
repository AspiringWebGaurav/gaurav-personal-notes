import { create } from 'zustand';
import { listen } from '@tauri-apps/api/event';
import { authService } from '../services/authService';
import { useNotesStore } from './notesStore';
import type { AuthStatus, UserSession } from '../types/auth';

interface AuthState {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  checkAuth: () => Promise<void>;
  initializeListener: () => void;
  getOfflineNotesCount: () => Promise<number>;
  loginWithLoopback: (migrateLocal?: boolean, theme?: string) => Promise<boolean>;
  loginWithGoogle: (migrateLocal?: boolean) => Promise<boolean>;
  cancelLogin: () => Promise<void>;
  logout: (keepLocalData?: boolean) => Promise<void>;
  setSession: (session: UserSession, migrateLocal?: boolean) => Promise<void>;
  clearError: () => void;
}

// Synchronously hydrate initial session from cache so UI never flashes unauthenticated on mount
const getCachedSession = (): UserSession | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('gpn_user_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.uid) return parsed;
    }
  } catch {}
  return null;
};

const cachedUser = getCachedSession();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: cachedUser,
  isAuthenticated: Boolean(cachedUser && cachedUser.uid),
  isLoading: false,
  error: null,

  initializeListener: () => {
    if (typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__)) {
      listen<AuthStatus>('auth-state-changed', (event) => {
        const payload = event.payload;
        if (payload.isAuthenticated && payload.user) {
          try {
            localStorage.setItem('gpn_user_session', JSON.stringify(payload.user));
          } catch {}
          set({
            isAuthenticated: true,
            user: payload.user,
            isLoading: false,
            error: null,
          });
        } else {
          try {
            localStorage.removeItem('gpn_user_session');
          } catch {}
          set({
            isAuthenticated: false,
            user: null,
            isLoading: false,
            error: null,
          });
        }
        useNotesStore.getState().loadNotes();
      }).catch(() => {});
    }
  },

  checkAuth: async () => {
    try {
      const status = await authService.getAuthStatus();
      if (status.isAuthenticated && status.user) {
        try {
          localStorage.setItem('gpn_user_session', JSON.stringify(status.user));
        } catch {}
        set({
          isAuthenticated: true,
          user: status.user,
          isLoading: false,
          error: null,
        });
      } else {
        try {
          localStorage.removeItem('gpn_user_session');
        } catch {}
        set({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null,
        });
      }
    } catch (err) {
      console.warn('Failed to refresh auth status from backend:', err);
      // Keep existing cached session intact on transient network or IPC failures
      set({ isLoading: false });
    }
  },

  getOfflineNotesCount: async () => {
    try {
      return await authService.getOfflineNotesCount();
    } catch {
      return 0;
    }
  },

  loginWithLoopback: async (migrateLocal?: boolean, _theme?: string): Promise<boolean> => {
    return get().loginWithGoogle(migrateLocal);
  },

  loginWithGoogle: async (migrateLocal?: boolean) => {
    // Anti-looping: if a login flow is already active, cleanly abort the prior one first
    try {
      await authService.cancelGoogleLogin();
    } catch {}

    set({ isLoading: true, error: null });
    try {
      const status = await authService.startGoogleLogin(migrateLocal);
      set({
        isAuthenticated: status.isAuthenticated,
        user: status.user || null,
        isLoading: false,
      });
      if (status.isAuthenticated) {
        await useNotesStore.getState().loadNotes();
      }
      return status.isAuthenticated;
    } catch (err) {
      const errMsg = String(err);
      if (!errMsg.toLowerCase().includes('cancel')) {
        console.error('Google login failed:', err);
        set({ isLoading: false, error: errMsg });
      } else {
        set({ isLoading: false });
      }
      return false;
    }
  },

  cancelLogin: async () => {
    // Clean cancellation lifecycle: signal backend and reset loading state cleanly
    try {
      await authService.cancelGoogleLogin();
    } catch {}
    set({ isLoading: false, error: null });
  },

  logout: async (keepLocalData?: boolean) => {
    // Anti-looping: cancel any in-flight loopback login before logging out
    try {
      await authService.cancelGoogleLogin();
    } catch {}

    set({ isLoading: true, error: null });
    try {
      await authService.logout(keepLocalData);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      // Reset active note selection, then reload notes for the new local_vault user
      useNotesStore.setState({ activeNoteId: null });
      await useNotesStore.getState().loadNotes();
    } catch (err) {
      console.error('Logout failed:', err);
      set({ isLoading: false, error: String(err) });
    }
  },

  setSession: async (session: UserSession, migrateLocal?: boolean) => {
    set({ isLoading: true, error: null });
    try {
      const status = await authService.setAuthSession(session, migrateLocal);
      set({
        isAuthenticated: status.isAuthenticated,
        user: status.user || null,
        isLoading: false,
      });
      if (status.isAuthenticated) {
        await useNotesStore.getState().loadNotes();
      }
    } catch (err) {
      console.error('Failed to set session:', err);
      set({ isLoading: false, error: String(err) });
    }
  },

  clearError: () => set((state) => (state.error ? { error: null } : state)),
}));