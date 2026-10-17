import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useSyncStore } from '../stores/syncStore';
import {
  X,
  LogOut,
  Check,
  RefreshCw,
  FileText,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { openExternalUrl } from '../utils/urlHelper';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'default' | 'logout';
}

type ModalFlowState =
  | 'idle'
  | 'checking_offline'
  | 'logout_confirm'
  | 'logging_out'
  | 'login_merge_decision'
  | 'browser_waiting'
  | 'cancelling'
  | 'syncing'
  | 'complete';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'default',
}) => {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const cancelLogin = useAuthStore((s) => s.cancelLogin);
  const logout = useAuthStore((s) => s.logout);
  const getOfflineNotesCount = useAuthStore((s) => s.getOfflineNotesCount);
  const clearError = useAuthStore((s) => s.clearError);
  const triggerSync = useSyncStore((s) => s.triggerSync);

  const [flowState, setFlowState] = useState<ModalFlowState>('idle');
  const [keepLocalNotes, setKeepLocalNotes] = useState<boolean>(true);
  const [offlineCount, setOfflineCount] = useState<number>(0);
  const [migrateLocalChoice, setMigrateLocalChoice] = useState<boolean>(true);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  // Progress animation states
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [syncPhaseText, setSyncPhaseText] = useState<string>('Connecting...');

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Cancellation lifecycle handlers
  const handleCancelBrowserLogin = async () => {
    setFlowState('cancelling');
    try {
      await cancelLogin();
    } finally {
      setFlowState('idle');
    }
  };

  const handleRequestClose = async () => {
    if (flowState === 'syncing' || flowState === 'logging_out' || flowState === 'cancelling') {
      return;
    }

    if (flowState === 'browser_waiting') {
      setFlowState('cancelling');
      try {
        await cancelLogin();
      } finally {
        setFlowState('idle');
        onCloseRef.current?.();
      }
      return;
    }

    if (
      flowState === 'logout_confirm' ||
      flowState === 'login_merge_decision' ||
      flowState === 'checking_offline'
    ) {
      setFlowState('idle');
      onCloseRef.current?.();
      return;
    }

    onCloseRef.current?.();
  };

  const handleCancelLogout = () => {
    if (initialMode === 'logout') {
      onCloseRef.current?.();
    } else {
      setFlowState('idle');
    }
  };

  const handleReopenBrowser = async () => {
    // Anti-looping: cleanly abort any existing loopback listener before launching a new one
    setFlowState('browser_waiting');
    await cancelLogin();
    await startGoogleSignInFlow(migrateLocalChoice);
  };

  // Reset flow state whenever modal opens or mode changes
  useEffect(() => {
    if (isOpen) {
      if (useAuthStore.getState().error) {
        clearError();
      }
      if (initialMode === 'logout') {
        if (useAuthStore.getState().isAuthenticated) {
          setFlowState('logout_confirm');
          setKeepLocalNotes(true);
        } else {
          // Already logged out: close modal immediately, never show Google sign in button
          onCloseRef.current?.();
          return;
        }
      } else {
        setFlowState('idle');
      }
      setSyncProgress(0);
      setIsLoggingOut(false);
    } else {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      setFlowState('idle');
      setIsLoggingOut(false);
    }
  }, [isOpen, initialMode, clearError]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, []);

  // Listen for Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (flowState !== 'syncing' && flowState !== 'logging_out' && flowState !== 'cancelling') {
          e.preventDefault();
          handleRequestClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, flowState]);

  // When isAuthenticated flips to true while modal is waiting for browser, transition to syncing
  useEffect(() => {
    if (isAuthenticated && flowState === 'browser_waiting') {
      startSyncingSequence();
    }
  }, [isAuthenticated, flowState]);

  // Syncing sequence with clean progress
  const startSyncingSequence = async () => {
    setFlowState('syncing');
    setSyncProgress(20);
    setSyncPhaseText('Connecting to account...');

    let currentPct = 20;
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    progressIntervalRef.current = setInterval(() => {
      currentPct += Math.floor(Math.random() * 12) + 6;
      if (currentPct < 60) {
        setSyncPhaseText('Updating notes...');
        setSyncProgress(currentPct);
      } else if (currentPct < 90) {
        setSyncPhaseText('Saving changes...');
        setSyncProgress(currentPct);
      } else {
        setSyncProgress(92);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      }
    }, 250);

    try {
      await triggerSync();
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setSyncProgress(100);
      setSyncPhaseText('Synced');
      setFlowState('complete');

      autoCloseTimerRef.current = setTimeout(() => {
        onCloseRef.current?.();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gpn-select-tab', { detail: 'home' }));
        }
      }, 1800);
    }
  };

  // User clicked "Sign in with Google"
  const handleInitiateSignIn = async () => {
    clearError();
    setFlowState('checking_offline');
    try {
      const count = await getOfflineNotesCount();
      if (count > 0) {
        setOfflineCount(count);
        setMigrateLocalChoice(true);
        setFlowState('login_merge_decision');
      } else {
        await startGoogleSignInFlow(false);
      }
    } catch {
      await startGoogleSignInFlow(false);
    }
  };

  // Launch browser OAuth loopback server
  const startGoogleSignInFlow = async (migrateLocal: boolean) => {
    setFlowState('browser_waiting');
    try {
      const ok = await loginWithGoogle(migrateLocal);
      if (ok) {
        await startSyncingSequence();
      } else {
        setFlowState((curr) => (curr === 'browser_waiting' ? 'idle' : curr));
      }
    } catch {
      setFlowState((curr) => (curr === 'browser_waiting' ? 'idle' : curr));
    }
  };

  // User confirmed sign-out choice
  const handleConfirmLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setFlowState('logging_out');

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);

    const isKeep = keepLocalNotes;
    const userEmail = user?.email || '';

    // Close the modal immediately and redirect to home tab so user returns to Home
    onCloseRef.current?.();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gpn-select-tab', { detail: 'home' }));
    }

    try {
      await logout(isKeep);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gpn-select-tab', { detail: 'home' }));
      }

      // Open website page after successful logout
      const isDark =
        typeof document !== 'undefined' &&
        document.documentElement.classList.contains('dark');
      const themeParam = isDark ? 'dark' : 'light';
      const modeParam = isKeep ? 'keep_notes' : 'purge_all';
      const emailParam = userEmail ? `&email=${encodeURIComponent(userEmail)}` : '';
      const baseUrl =
        (import.meta as any).env?.VITE_WEBSITE_URL || 'https://gpnotes.eu.cc';

      await openExternalUrl(
        `${baseUrl}/logged-out?mode=${modeParam}&theme=${themeParam}${emailParam}`
      );
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleManualSync = async () => {
    await startSyncingSequence();
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={
        flowState === 'syncing' || flowState === 'logging_out' || flowState === 'cancelling'
          ? undefined
          : handleRequestClose
      }
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[500px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden transition-all duration-150 relative animate-in zoom-in-95 text-zinc-900 dark:text-zinc-100"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800/80">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
            Account
          </span>
          {flowState !== 'syncing' && flowState !== 'logging_out' && flowState !== 'cancelling' && (
            <button
              type="button"
              onClick={handleRequestClose}
              className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded-md transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* -------------------- 1. LOGOUT CONFIRMATION VIEW -------------------- */}
        {flowState === 'logout_confirm' && (
          <div className="p-6 space-y-5 animate-in fade-in duration-150">
            {/* Title & Info */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center shrink-0">
                  <LogOut className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    Log out of your account
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[380px]">
                    {user?.email}
                  </p>
                </div>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 pt-1 leading-relaxed">
                Choose what to do with the notes saved on this computer:
              </p>
            </div>

            {/* Selection Options (Clean open layout, no nested box cards) */}
            <div className="space-y-2">
              {/* Option A: Keep Notes */}
              <div
                onClick={() => setKeepLocalNotes(true)}
                className={`p-3.5 rounded-lg border transition-all cursor-pointer flex items-start gap-3 select-none ${
                  keepLocalNotes
                    ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-900/60 shadow-2xs'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-transparent'
                }`}
              >
                <div className="pt-0.5 shrink-0">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                      keepLocalNotes
                        ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100'
                        : 'border-zinc-300 dark:border-zinc-600 bg-transparent'
                    }`}
                  >
                    {keepLocalNotes && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-zinc-950" />
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Keep notes on this computer
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 font-medium">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    Notes stay saved on this device so you can view and edit them offline.
                  </p>
                </div>
              </div>

              {/* Option B: Remove Notes */}
              <div
                onClick={() => setKeepLocalNotes(false)}
                className={`p-3.5 rounded-lg border transition-all cursor-pointer flex items-start gap-3 select-none ${
                  !keepLocalNotes
                    ? 'border-rose-600 dark:border-rose-400 bg-rose-50/50 dark:bg-rose-950/20 shadow-2xs'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-transparent'
                }`}
              >
                <div className="pt-0.5 shrink-0">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                      !keepLocalNotes
                        ? 'border-rose-600 dark:border-rose-400 bg-rose-600 dark:bg-rose-400'
                        : 'border-zinc-300 dark:border-zinc-600 bg-transparent'
                    }`}
                  >
                    {!keepLocalNotes && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-zinc-950" />
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Remove notes from this computer
                  </span>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    Clears local notes from this device. All notes remain safe in your account.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={handleCancelLogout}
                className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                disabled={isLoggingOut}
                className={`px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${
                  keepLocalNotes
                    ? 'bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                <span>{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* -------------------- 3. LOGIN MERGE DECISION VIEW -------------------- */}
        {flowState === 'login_merge_decision' && (
          <div className="p-6 space-y-5 animate-in fade-in duration-150">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    Offline notes found
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Found {offlineCount} {offlineCount === 1 ? 'note' : 'notes'} on this computer
                  </p>
                </div>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 pt-1 leading-relaxed">
                Choose how to handle your existing notes upon signing in:
              </p>
            </div>

            <div className="space-y-2">
              {/* Option A: Merge */}
              <div
                onClick={() => setMigrateLocalChoice(true)}
                className={`p-3.5 rounded-lg border transition-all cursor-pointer flex items-start gap-3 select-none ${
                  migrateLocalChoice
                    ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-900/60 shadow-2xs'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-transparent'
                }`}
              >
                <div className="pt-0.5 shrink-0">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                      migrateLocalChoice
                        ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100'
                        : 'border-zinc-300 dark:border-zinc-600 bg-transparent'
                    }`}
                  >
                    {migrateLocalChoice && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-zinc-950" />
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Save notes to your account
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 font-medium">
                      Recommended
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    Uploads offline notes so they sync across all your devices.
                  </p>
                </div>
              </div>

              {/* Option B: Account Only */}
              <div
                onClick={() => setMigrateLocalChoice(false)}
                className={`p-3.5 rounded-lg border transition-all cursor-pointer flex items-start gap-3 select-none ${
                  !migrateLocalChoice
                    ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-900/60 shadow-2xs'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-transparent'
                }`}
              >
                <div className="pt-0.5 shrink-0">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                      !migrateLocalChoice
                        ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100'
                        : 'border-zinc-300 dark:border-zinc-600 bg-transparent'
                    }`}
                  >
                    {!migrateLocalChoice && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-zinc-950" />
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Keep account notes only
                  </span>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    Loads notes already saved in your account and replaces offline notes on this device.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={() => setFlowState('idle')}
                className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => startGoogleSignInFlow(migrateLocalChoice)}
                className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950 text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* -------------------- 4. BROWSER WAITING VIEW -------------------- */}
        {flowState === 'browser_waiting' && (
          <div className="p-8 space-y-6 text-center animate-in fade-in duration-200">
            {/* Smooth hardware-accelerated orbital radar indicator */}
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              {/* Outer smooth rotating ring (GPU composited) */}
              <div
                className="absolute inset-0 rounded-full border-2 border-zinc-200/60 dark:border-zinc-800 border-t-zinc-900 dark:border-t-zinc-100 animate-spin"
                style={{
                  animationDuration: '1s',
                  willChange: 'transform',
                }}
              />
              {/* Subtle ambient breathing glow */}
              <div
                className="absolute inset-1 rounded-full bg-zinc-100/60 dark:bg-zinc-800/60 animate-pulse"
                style={{
                  willChange: 'opacity, transform',
                }}
              />
              {/* Stable centered Google logo */}
              <div className="relative z-10 w-9 h-9 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shadow-xs">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
            </div>

            {/* Clean clear typography */}
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Waiting for Google sign-in
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
                Complete your sign-in in the browser window to connect your account.
              </p>
            </div>

            {/* Smooth live pulse pill */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[11px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Waiting for browser approval...</span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleReopenBrowser}
                className="px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer flex items-center gap-1.5"
                title="Re-open the sign-in page in your default browser"
              >
                <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                <span>Open browser again</span>
              </button>

              <button
                type="button"
                onClick={handleCancelBrowserLogin}
                className="px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* -------------------- CANCELLING VIEW -------------------- */}
        {flowState === 'cancelling' && (
          <div className="p-8 space-y-3 text-center animate-in fade-in duration-150">
            <div className="w-8 h-8 mx-auto rounded-full border-2 border-zinc-200/60 dark:border-zinc-800 border-t-zinc-900 dark:border-t-zinc-100 animate-spin" />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Cancelling...
            </p>
          </div>
        )}

        {/* -------------------- CHECKING OFFLINE NOTES VIEW -------------------- */}
        {flowState === 'checking_offline' && (
          <div className="p-8 space-y-3 text-center animate-in fade-in duration-150">
            <div className="w-8 h-8 mx-auto rounded-full border-2 border-zinc-200/60 dark:border-zinc-800 border-t-zinc-900 dark:border-t-zinc-100 animate-spin" />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Checking local notes...
            </p>
          </div>
        )}

        {/* -------------------- 5. SYNCING VIEW -------------------- */}
        {flowState === 'syncing' && (
          <div className="p-8 space-y-6 text-center animate-in fade-in duration-200">
            <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
              <div
                className="absolute inset-0 rounded-full border-2 border-zinc-200/60 dark:border-zinc-800 border-t-zinc-900 dark:border-t-zinc-100 animate-spin"
                style={{ animationDuration: '0.9s', willChange: 'transform' }}
              />
              <div className="relative z-10 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                <RefreshCw className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Syncing notes...
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {syncPhaseText}
              </p>
            </div>
            <div className="w-full max-w-xs mx-auto h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-300 ease-out"
                style={{ width: `${syncProgress}%`, willChange: 'width' }}
              />
            </div>
          </div>
        )}

        {/* -------------------- 6. COMPLETE VIEW -------------------- */}
        {flowState === 'complete' && (
          <div className="p-8 space-y-5 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300/80 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <Check className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Sync complete
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Your notes are up to date and saved.
              </p>
            </div>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => onCloseRef.current?.()}
                className="px-5 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* -------------------- 7. IDLE VIEW (ACCOUNT / SIGN IN) -------------------- */}
        {flowState === 'idle' && (
          <div className="p-6">
            {isAuthenticated && user ? (
              /* Signed In Profile */
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <div className="w-10 h-10 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center font-bold text-sm shrink-0">
                    {(user.displayName || user.email || 'G')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {user.displayName || 'User'}
                    </h4>
                    <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate">
                      {user.email}
                    </p>
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 pt-0.5 text-[10px] font-medium font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Synced</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setKeepLocalNotes(true);
                      setFlowState('logout_confirm');
                    }}
                    className="px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log out</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleManualSync}
                    className="px-3.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950 text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Sync</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Signed Out - Sign In */
              <div className="space-y-4">
                <div className="text-center space-y-2.5 py-1">
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    Sign in to sync your notes
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs mx-auto">
                    Sign in with Google to back up your notes and access them across all your devices.
                  </p>
                  <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 text-left text-[11px] text-zinc-600 dark:text-zinc-300 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                      <span>Click below to sign in with Google in your browser</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                      <span>Notes connect automatically to this computer</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                      <span>Everything stays safely backed up and private</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleInitiateSignIn}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-colors border border-zinc-200 dark:border-zinc-800 shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </button>

                {error && (
                  <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs text-center font-medium">
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
