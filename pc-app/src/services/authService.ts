import { invoke } from '@tauri-apps/api/core';
import type { AuthStatus, UserSession } from '../types/auth';

function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__);
}

export const authService = {
  async getAuthStatus(): Promise<AuthStatus> {
    if (isTauriEnvironment()) {
      try {
        const res = await invoke<AuthStatus>('cmd_get_auth_status');
        if (res && res.isAuthenticated && res.user) {
          try {
            localStorage.setItem('gpn_user_session', JSON.stringify(res.user));
          } catch {}
          return res;
        } else if (res && !res.isAuthenticated) {
          try {
            localStorage.removeItem('gpn_user_session');
          } catch {}
          return res;
        }
      } catch (err) {
        console.warn('[GPN Auth] Tauri get_auth_status IPC notice, checking local storage cache:', err);
      }
    }
    const raw = typeof window !== 'undefined' ? localStorage.getItem('gpn_user_session') : null;
    if (raw) {
      try {
        const user = JSON.parse(raw);
        if (user && user.uid) {
          return { isAuthenticated: true, user };
        }
      } catch {}
    }
    return { isAuthenticated: false, user: null };
  },

  async getOfflineNotesCount(): Promise<number> {
    if (isTauriEnvironment()) {
      return await invoke<number>('cmd_get_offline_notes_count');
    }
    const raw = localStorage.getItem('gpn_browser_notes');
    if (!raw) return 0;
    try {
      const notes = JSON.parse(raw);
      return Array.isArray(notes) ? notes.length : 0;
    } catch {
      return 0;
    }
  },

  async setAuthSession(session: UserSession, migrateLocal?: boolean): Promise<AuthStatus> {
    try {
      localStorage.setItem('gpn_user_session', JSON.stringify(session));
    } catch {}

    if (isTauriEnvironment()) {
      return await invoke<AuthStatus>('cmd_set_auth_session', { session, migrateLocal });
    }
    return { isAuthenticated: true, user: session };
  },

  async refreshAuthToken(apiKey: string): Promise<AuthStatus> {
    if (isTauriEnvironment()) {
      const res = await invoke<AuthStatus>('cmd_refresh_auth_token', { apiKey });
      if (res && res.isAuthenticated && res.user) {
        try {
          localStorage.setItem('gpn_user_session', JSON.stringify(res.user));
        } catch {}
      }
      return res;
    }
    return this.getAuthStatus();
  },

  async logout(keepLocalData?: boolean): Promise<AuthStatus> {
    try {
      localStorage.removeItem('gpn_user_session');
      sessionStorage.clear();
    } catch {}

    // Sign out from browser Firebase Auth instance if active so no credentials linger
    try {
      const dynamicImport = new Function('url', 'return import(url)') as (url: string) => Promise<any>;
      const { getApps } = await dynamicImport('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
      const apps = getApps();
      if (apps.length > 0) {
        const { getAuth, signOut } = await dynamicImport('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
        const auth = getAuth(apps[0]);
        await signOut(auth);
      }
    } catch {}

    if (isTauriEnvironment()) {
      const res = await invoke<AuthStatus>('cmd_logout', { keepLocalData });
      return res;
    }

    if (!keepLocalData) {
      localStorage.removeItem('gpn_browser_notes');
    }
    return { isAuthenticated: false, user: null };
  },

  async startGoogleLogin(migrateLocal?: boolean, theme?: string): Promise<AuthStatus> {
    const activeTheme =
      theme ||
      (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
        ? 'dark'
        : 'light');

    if (isTauriEnvironment()) {
      try {
        const status = await invoke<AuthStatus>('cmd_start_loopback_login', {
          timeoutSeconds: 120,
          migrateLocal,
          theme: activeTheme,
        });
        if (status && status.isAuthenticated && status.user) {
          try {
            localStorage.setItem('gpn_user_session', JSON.stringify(status.user));
          } catch {}
        }
        return status;
      } catch (err: unknown) {
        const errMsg = String(err);
        if (errMsg.toLowerCase().includes('cancel')) {
          return await this.getAuthStatus();
        }
        console.error('[GPN Auth] Loopback sign-in error:', err);
        throw err;
      }
    }

    try {
      const dynamicImport = new Function('url', 'return import(url)') as (url: string) => Promise<any>;
      const { initializeApp, getApps } = await dynamicImport(
        'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'
      );
      const { getAuth, GoogleAuthProvider, signInWithPopup } = await dynamicImport(
        'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'
      );

      const firebaseConfig = {
        apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || '',
        authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || 'gaurav-personal-notes.firebaseapp.com',
        projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || 'gaurav-personal-notes',
        storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || 'gaurav-personal-notes.firebasestorage.app',
        messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '213415532994',
        appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || '',
      };

      const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const idToken = await user.getIdToken(true);
      const refreshToken = user.refreshToken || (user as any).stsTokenManager?.refreshToken || '';

      const liveSession: UserSession = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || null,
        photoUrl: user.photoURL || null,
        idToken,
        refreshToken,
        expiresAt: Date.now() + 3600000,
      };

      return await this.setAuthSession(liveSession, migrateLocal);
    } catch (err: unknown) {
      const authErr = err as { code?: string; message?: string };
      if (
        authErr?.code === 'auth/popup-closed-by-user' ||
        authErr?.code === 'auth/cancelled-popup-request'
      ) {
        return await this.getAuthStatus();
      }
      console.error('Live Google sign-in failed:', err);
      throw err;
    }
  },

  async cancelGoogleLogin(): Promise<boolean> {
    if (isTauriEnvironment()) {
      try {
        return await invoke<boolean>('cmd_cancel_loopback_login');
      } catch (err) {
        console.warn('[GPN Auth] Failed to cancel loopback login IPC:', err);
        return false;
      }
    }
    return true;
  },

  async startLoopbackLogin(_timeoutSeconds = 120, migrateLocal?: boolean, _theme?: string): Promise<AuthStatus> {
    return this.startGoogleLogin(migrateLocal);
  },
};
