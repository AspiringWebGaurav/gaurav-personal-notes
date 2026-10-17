import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import { GpnSidebar, GpnTab } from './components/GpnLayout/GpnSidebar';
import { GpnWindowHeader } from './components/GpnLayout/GpnWindowHeader';
import { HomeView } from './components/Views/HomeView';
import { NotesView } from './components/Views/NotesView';
import { DatabaseView } from './components/Views/DatabaseView';
import { AccountView } from './components/Views/AccountView';
import { PermissionsView } from './components/Views/PermissionsView';
import { SettingsView } from './components/Views/SettingsView';
import { TrashView } from './components/Views/TrashView';
import { CollabView } from './components/Views/CollabView';
import { SearchModal } from './components/SearchModal';
import { AuthModal } from './components/AuthModal';
import { QuickCaptureModal } from './components/QuickCaptureModal';
import { SmartBurnModal } from './components/SmartBurnModal';
import { ShortcutsModal } from './components/GpnLayout/ShortcutsModal';
import { ConfirmModal } from './components/ConfirmModal';
import { UpdateModal } from './components/GpnLayout/UpdateModal';
import { UpdateNotification } from './components/GpnLayout/UpdateNotification';
import { useUpdateStore } from './stores/updateStore';
import { useAuthStore } from './stores/authStore';
import { useNotesStore } from './stores/notesStore';
import { useSyncStore } from './stores/syncStore';

export function App() {
  // Always default to 'home' tab on app open so user lands on the Home dashboard
  const [activeTab, setActiveTab] = useState<GpnTab>('home');

  const handleSelectTab = useCallback((tab: GpnTab) => {
    if (tab === 'home') {
      useNotesStore.getState().selectNote(null);
    }
    setActiveTab(tab);
    try {
      sessionStorage.setItem('gpn_session_tab', tab);
    } catch {}
  }, []);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'default' | 'logout'>('default');

  const handleOpenAuthModal = useCallback((mode: 'default' | 'logout' = 'default') => {
    setAuthModalMode(mode);
    setIsAuthOpen(true);
  }, []);

  const handleCloseAuthModal = useCallback(() => {
    setIsAuthOpen(false);
  }, []);

  // Listen for global tab redirection events (e.g. from successful login/logout)
  useEffect(() => {
    const handleTabEvent = (e: Event) => {
      const customEvent = e as CustomEvent<GpnTab>;
      if (customEvent.detail) {
        handleSelectTab(customEvent.detail);
      }
    };
    window.addEventListener('gpn-select-tab', handleTabEvent);
    return () => window.removeEventListener('gpn-select-tab', handleTabEvent);
  }, [handleSelectTab]);
  const isCaptureWindow = useMemo(() => {
    try {
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        return (window as any).__TAURI_INTERNALS__?.metadata?.currentWindow?.label === 'capture';
      }
    } catch {}
    return false;
  }, []);

  const [isCaptureOpen, setIsCaptureOpen] = useState(true);

  const handleCloseCaptureWindow = useCallback(async () => {
    setIsCaptureOpen(false);
    try {
      await invoke('cmd_hide_capture_window');
    } catch {}
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const win = getCurrentWindow();
      await win.setAlwaysOnTop(false).catch(() => {});
      await win.hide().catch(() => {});
    } catch {}
  }, []);

  useEffect(() => {
    if (isCaptureWindow) {
      document.documentElement.classList.add('capture-window');
      document.body.classList.add('capture-window');
      document.documentElement.style.backgroundColor = 'transparent';
      document.body.style.backgroundColor = 'transparent';
      document.documentElement.style.background = 'transparent';
      document.body.style.background = 'transparent';
      const rootEl = document.getElementById('root');
      if (rootEl) {
        rootEl.classList.add('capture-window');
        rootEl.style.backgroundColor = 'transparent';
        rootEl.style.background = 'transparent';
      }

      const handleFocus = () => {
        setIsCaptureOpen(true);
      };
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [isCaptureWindow]);

  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);

  const handleCloseQuickCapture = useCallback(() => {
    setIsQuickCaptureOpen(false);
  }, []);

  const handleTriggerQuickCapture = useCallback(async () => {
    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    if (isTauri) {
      try {
        await invoke('cmd_open_capture_window');
      } catch {}
    } else {
      setIsQuickCaptureOpen(true);
    }
  }, []);
  const [isSmartBurnOpen, setIsSmartBurnOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Dark mode state: persists in localStorage
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('gpn_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('gpn_theme', isDarkMode ? 'dark' : 'light');
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch {}
  }, [isDarkMode]);

  // Sync with Windows 10 & 11 system personalization theme
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem('gpn_theme');
      if (!saved) {
        setIsDarkMode(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Dynamic Update Check state matching Screenshots 1 & 2
  const updateStatus = useUpdateStore((state) => state.status);
  const isCheckingUpdates = updateStatus.state === 'checking';
  
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const initAuthListener = useAuthStore((s) => s.initializeListener);
  const { notes, trashNotes, loadNotes, createNote } = useNotesStore();
  const { isSyncing, initializeListener } = useSyncStore();

  // Automatically redirect to Home tab whenever authentication status transitions (login or logout)
  const prevAuthRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (prevAuthRef.current !== null && prevAuthRef.current !== isAuthenticated) {
      handleSelectTab('home');
      setIsAuthOpen(false);
    }
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated, handleSelectTab]);

  // Pure event-based network lifecycle
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Synchronize dynamic status to Windows taskbar window title and Win32 system tray
  useEffect(() => {
    if (isCaptureWindow) return;
    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    if (isTauri) {

      invoke('cmd_set_tray_status', { isLive: isAuthenticated, isOnline }).catch(() => {});

      let title = 'Gaurav Personal Notes — ○ Local';
      if (!isOnline) {
        title = 'Gaurav Personal Notes — ○ Offline';
      } else if (isAuthenticated) {
        title = 'Gaurav Personal Notes — ● Live';
      }
      getCurrentWindow().setTitle(title).catch(() => {});
    }
  }, [isOnline, isAuthenticated, isCaptureWindow]);

  // Reload notes only when authentication state actually switches after mount
  const isFirstMountRef = useRef(true);
  useEffect(() => {
    if (isCaptureWindow) return;
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    loadNotes();
  }, [isAuthenticated, loadNotes, isCaptureWindow]);

  const isSearchOpenRef = useRef(isSearchOpen);
  isSearchOpenRef.current = isSearchOpen;
  const isAuthOpenRef = useRef(isAuthOpen);
  isAuthOpenRef.current = isAuthOpen;
  const isQuickCaptureOpenRef = useRef(isQuickCaptureOpen);
  isQuickCaptureOpenRef.current = isQuickCaptureOpen;
  const isSmartBurnOpenRef = useRef(isSmartBurnOpen);
  isSmartBurnOpenRef.current = isSmartBurnOpen;
  const isShortcutsOpenRef = useRef(isShortcutsOpen);
  isShortcutsOpenRef.current = isShortcutsOpen;

  useEffect(() => {
    // If running inside the dedicated capture window, listen ONLY to open-quick-capture.
    // Skips loading notes from SQLite, Firestore sync listeners, and background update checks.
    if (isCaptureWindow) {
      let unlistenQuickCapture: (() => void) | undefined;
      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
      if (isTauri) {
        listen('open-quick-capture', async () => {
          setIsCaptureOpen(true);
          try {
            const win = getCurrentWindow();
            await win.show();
            await win.unminimize();
            await win.setAlwaysOnTop(true);
            await win.setFocus();
            if (typeof window !== 'undefined') {
              window.focus();
            }
          } catch {}
        }).then((un) => {
          unlistenQuickCapture = un;
        });
      }
      return () => {
        if (unlistenQuickCapture) unlistenQuickCapture();
      };
    }

    // Initial startup sequence for workspace
    initAuthListener();
    checkAuth();
    loadNotes();

    // Check for updates shortly after app UI has settled (1.2s delay)
    const bootUpdateTimer = setTimeout(() => {
      useUpdateStore.getState().checkSilently();
    }, 1200);

    let unlistenSync: (() => void) | undefined;
    initializeListener().then((unlisten) => {
      unlistenSync = unlisten;
    });

    // Listen for online/offline network events
    const handleOnline = () => {
      setIsOnline(true);
      if (useAuthStore.getState().isAuthenticated) {
        useSyncStore.getState().triggerSync();
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    let lastFocusCheckTime = 0;
    const handleWindowFocus = () => {
      const now = Date.now();
      if (now - lastFocusCheckTime > 30000) {
        lastFocusCheckTime = now;
        useUpdateStore.getState().checkSilently();
      }
    };
    window.addEventListener('focus', handleWindowFocus);

    // Listen for custom tray events from Tauri
    let unlistenSettings: (() => void) | undefined;
    let unlistenSmartBurn: (() => void) | undefined;
    let unlistenWorkspace: (() => void) | undefined;

    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    if (isTauri) {
      listen('open-settings', () => {
        handleSelectTab('settings');
      }).then((un) => {
        unlistenSettings = un;
      });

      listen('open-smart-burn', () => {
        setIsSmartBurnOpen(true);
      }).then((un) => {
        unlistenSmartBurn = un;
      });

      listen('open-workspace', () => {
        setIsQuickCaptureOpen(false);
        setIsSearchOpen(false);
        setIsAuthOpen(false);
        setIsShortcutsOpen(false);
        setIsSmartBurnOpen(false);
        // Automatically check version when window is reopened from background / tray
        useUpdateStore.getState().checkSilently();
      }).then((un) => {
        unlistenWorkspace = un;
      });
    }

    // Global desktop keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // In production builds (.exe), block browser hard refresh (Ctrl+R, Ctrl+Shift+R, F5, Ctrl+F5)
      // Dev reload remains fully enabled during local development (dev only)
      if (!import.meta.env.DEV) {
        const isF5 = e.key === 'F5' || e.code === 'F5' || e.keyCode === 116;
        const isRefreshKey =
          (e.ctrlKey || e.metaKey) &&
          (e.key === 'r' || e.key === 'R' || e.code === 'KeyR');
        if (isF5 || isRefreshKey) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      // Check if user is actively typing in an editable field (input, textarea, ProseMirror, contenteditable)
      const target = e.target as HTMLElement | null;
      const isTyping = Boolean(
        target &&
          typeof target.closest === 'function' &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable ||
            target.closest('.ProseMirror'))
      );

      // If user is actively typing in an input/textarea OR if QuickCaptureModal is currently open:
      // Never hijack navigation or note-creation shortcuts (Ctrl+N, Ctrl+K, Ctrl+B, etc.)
      if (isTyping || isQuickCaptureOpenRef.current) {
        if (e.key === 'Escape') {
          if (isQuickCaptureOpenRef.current) {
            handleCloseQuickCapture();
          } else if (isSearchOpenRef.current) {
            setIsSearchOpen(false);
          } else if (isAuthOpenRef.current) {
            setIsAuthOpen(false);
          } else if (isSmartBurnOpenRef.current) {
            setIsSmartBurnOpen(false);
          } else if (isShortcutsOpenRef.current) {
            setIsShortcutsOpen(false);
          }
        }
        return;
      }

      const isKeyN = e.key === 'n' || e.key === 'N' || e.code === 'KeyN';
      const isKeyC = e.key === 'c' || e.key === 'C' || e.code === 'KeyC';
      const isKeyB = e.key === 'b' || e.key === 'B' || e.code === 'KeyB';
      const isKeyK = e.key === 'k' || e.key === 'K' || e.code === 'KeyK';

      // Gaurav Personal Notes Capture: Ctrl+Shift+N or Ctrl+Shift+C (or Alt+Shift+N/C)
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (isKeyN || isKeyC)) ||
        (e.altKey && e.shiftKey && (isKeyN || isKeyC))
      ) {
        e.preventDefault();
        setIsSearchOpen(false);
        setIsAuthOpen(false);
        setIsShortcutsOpen(false);
        setIsSmartBurnOpen(false);
        handleTriggerQuickCapture();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && isKeyB) {
        e.preventDefault();
        setIsSmartBurnOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && isKeyK) {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && isKeyN) {
        e.preventDefault();
        handleSelectTab('notes');
        createNote();
      } else if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setActiveTab((prev) => {
          const next = prev === 'settings' ? 'notes' : 'settings';
          try {
            sessionStorage.setItem('gpn_session_tab', next);
          } catch {}
          return next;
        });
      } else if (e.key === 'Escape') {
        if (isSearchOpenRef.current) {
          setIsSearchOpen(false);
        } else if (isAuthOpenRef.current) {
          setIsAuthOpen(false);
        } else if (isQuickCaptureOpenRef.current) {
          handleCloseQuickCapture();
        } else if (isSmartBurnOpenRef.current) {
          setIsSmartBurnOpen(false);
        } else if (isShortcutsOpenRef.current) {
          setIsShortcutsOpen(false);
        } else {
          // No modal is open: Escape minimizes/closes the main workspace to system tray
          const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
          if (isTauri) {
            try {
              getCurrentWindow().hide();
            } catch {}
          }
        }
      }
    };

    // In production desktop app, disable default browser context menu (which includes "Reload")
    const handleContextMenu = (e: MouseEvent) => {
      if (!import.meta.env.DEV) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('contextmenu', handleContextMenu, { capture: true });

    return () => {
      clearTimeout(bootUpdateTimer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      if (unlistenSync) unlistenSync();
      if (unlistenSettings) unlistenSettings();
      if (unlistenSmartBurn) unlistenSmartBurn();
      if (unlistenWorkspace) unlistenWorkspace();
    };
  }, []);

  const handleCheckUpdates = () => {
    useUpdateStore.getState().checkForUpdates();
  };

  const handleQuitApp = async () => {
    try {
      sessionStorage.removeItem('gpn_session_tab');
    } catch {}

    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    if (isTauri) {
      try {
        await invoke('cmd_minimize_to_background');
      } catch {
        try {
          await getCurrentWindow().hide();
        } catch {
          window.close();
        }
      }
    } else {
      window.close();
    }
  };

  if (isCaptureWindow) {
    return (
      <div className={`w-full h-full p-0 m-0 flex items-center justify-center bg-transparent overflow-hidden font-sans ${isDarkMode ? 'dark' : ''}`}>
        <QuickCaptureModal
          isOpen={isCaptureOpen}
          isStandalone={true}
          onClose={handleCloseCaptureWindow}
        />
      </div>
    );
  }

  return (
    <div
      className={`w-screen h-screen flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans transition-colors ${
        isDarkMode ? 'dark' : ''
      }`}
    >
      {/* Draggable minimal window top bar with dynamic center update status */}
      <GpnWindowHeader isSyncing={isSyncing} />

      {/* Main Container: GPN Sidebar (when not on notes) + Active View */}
      <div className="flex flex-1 overflow-hidden relative">
        {activeTab !== 'notes' && (
          <GpnSidebar
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            isAuthenticated={isAuthenticated}
            isOnline={isOnline}
            notesCount={notes.length}
            trashCount={trashNotes.length}
            onOpenShortcuts={() => setIsShortcutsOpen(true)}
            onOpenSmartBurn={() => setIsSmartBurnOpen(true)}
            onCheckUpdates={handleCheckUpdates}
            isCheckingUpdates={isCheckingUpdates}
            isDarkMode={isDarkMode}
            onToggleDarkMode={handleToggleDarkMode}
            onQuit={handleQuitApp}
            onOpenAuthModal={handleOpenAuthModal}
          />
        )}

        {/* View Switcher */}
        <main className="flex-1 h-full overflow-hidden flex flex-col bg-white dark:bg-zinc-950 transition-colors">
          {activeTab === 'home' && (
            <HomeView
              onSelectTab={handleSelectTab}
              onOpenNotes={() => {
                useNotesStore.getState().selectNote(null);
                handleSelectTab('notes');
              }}
              onOpenNote={(noteId) => {
                useNotesStore.getState().selectNote(noteId);
                handleSelectTab('notes');
              }}
              onOpenSearchModal={() => setIsSearchOpen(true)}
              onOpenQuickCapture={handleTriggerQuickCapture}
              onOpenSmartBurn={() => setIsSmartBurnOpen(true)}
              onOpenAuthModal={handleOpenAuthModal}
              onOpenShortcuts={() => setIsShortcutsOpen(true)}
            />
          )}

          {activeTab === 'notes' && (
            <NotesView
              onSelectTab={handleSelectTab}
              isAuthenticated={isAuthenticated}
              isOnline={isOnline}
              trashCount={trashNotes.length}
              onOpenSearchModal={() => setIsSearchOpen(true)}
              onOpenSmartBurn={() => setIsSmartBurnOpen(true)}
              onOpenQuickCapture={handleTriggerQuickCapture}
              onOpenShortcuts={() => setIsShortcutsOpen(true)}
              onOpenAuthModal={handleOpenAuthModal}
              isDarkMode={isDarkMode}
              onToggleDarkMode={handleToggleDarkMode}
              onQuit={handleQuitApp}
            />
          )}

          {activeTab === 'collab' && (
            <CollabView />
          )}

          {activeTab === 'database' && (
            <DatabaseView onOpenNote={(noteId) => {
              useNotesStore.getState().selectNote(noteId);
              handleSelectTab('notes');
            }} />
          )}

          {activeTab === 'account' && (
            <AccountView onOpenAuthModal={handleOpenAuthModal} />
          )}

          {activeTab === 'permissions' && <PermissionsView />}

          {activeTab === 'settings' && <SettingsView />}

          {activeTab === 'trash' && (
            <TrashView onRestoreSuccess={() => handleSelectTab('notes')} />
          )}
        </main>
      </div>


      {/* Modals & Overlays */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNoteSelected={() => handleSelectTab('notes')}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={handleCloseAuthModal}
        initialMode={authModalMode}
      />

      {/* Web fallback only: Desktop Tauri runs capture exclusively in dedicated floating window */}
      {!(typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) && (
        <QuickCaptureModal
          isOpen={isQuickCaptureOpen}
          onOpen={() => setIsQuickCaptureOpen(true)}
          onClose={handleCloseQuickCapture}
        />
      )}

      <SmartBurnModal
        isOpen={isSmartBurnOpen}
        onClose={() => setIsSmartBurnOpen(false)}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <ConfirmModal />
      <UpdateModal />
      <UpdateNotification />
    </div>
  );
}

export default App;
