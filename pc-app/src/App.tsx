import { useEffect, useState, useRef, useCallback } from 'react';
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
import { TrashView } from './components/Views/TrashView';
import { SearchModal } from './components/SearchModal';
import { AuthModal } from './components/AuthModal';
import { QuickCaptureModal } from './components/QuickCaptureModal';
import { SmartBurnModal } from './components/SmartBurnModal';
import { ShortcutsModal } from './components/GpnLayout/ShortcutsModal';
import { ConfirmModal } from './components/ConfirmModal';
import { UpdateNotification } from './components/GpnLayout/UpdateNotification';
import { useAuthStore } from './stores/authStore';
import { useNotesStore } from './stores/notesStore';
import { useSyncStore } from './stores/syncStore';
import { useConfirmStore } from './stores/confirmStore';

export function App() {
  // Always default to 'home' tab on app open so user lands on the Home dashboard
  const [activeTab, setActiveTab] = useState<GpnTab>('home');

  const handleSelectTab = (tab: GpnTab) => {
    if (tab === 'home') {
      useNotesStore.getState().selectNote(null);
    }
    setActiveTab(tab);
    try {
      sessionStorage.setItem('gpn_session_tab', tab);
    } catch {}
  };
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
  const [isCaptureWindow, setIsCaptureWindow] = useState(false);
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [isQuickCaptureFromBackground, setIsQuickCaptureFromBackground] = useState(false);

  const handleCloseQuickCapture = async () => {
    setIsQuickCaptureOpen(false);
    if (isQuickCaptureFromBackground) {
      setIsQuickCaptureFromBackground(false);
      try {
        const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
        if (isTauri) {
          await getCurrentWindow().hide();
        }
      } catch {}
    }
  };
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
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [updateToast, setUpdateToast] = useState<{
    title: string;
    description: string;
  } | null>(null);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const initAuthListener = useAuthStore((s) => s.initializeListener);
  const { notes, trashNotes, loadNotes, createNote } = useNotesStore();
  const { isSyncing, initializeListener } = useSyncStore();

  // Pure event-based network lifecycle
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Synchronize dynamic status to Windows taskbar window title and Win32 system tray
  useEffect(() => {
    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    if (isTauri) {
      try {
        const win = getCurrentWindow();
        if (win.label === 'capture') {
          setIsCaptureWindow(true);
        }
      } catch {}
      invoke('cmd_set_tray_status', { isLive: isAuthenticated, isOnline }).catch(() => {});

      let title = 'Gaurav Personal Notes — ○ Local';
      if (!isOnline) {
        title = 'Gaurav Personal Notes — ○ Offline';
      } else if (isAuthenticated) {
        title = 'Gaurav Personal Notes — ● Live';
      }
      getCurrentWindow().setTitle(title).catch(() => {});
    }
  }, [isOnline, isAuthenticated]);

  // Reload notes only when authentication state actually switches after mount
  const isFirstMountRef = useRef(true);
  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }
    loadNotes();
  }, [isAuthenticated, loadNotes]);

  useEffect(() => {
    // Initial startup sequence
    initAuthListener();
    checkAuth();
    loadNotes();

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

    // Listen for custom tray events from Tauri
    let unlistenSettings: (() => void) | undefined;
    let unlistenSmartBurn: (() => void) | undefined;
    let unlistenQuickCapture: (() => void) | undefined;

    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    if (isTauri) {
      listen('open-settings', () => {
        handleSelectTab('permissions');
      }).then((un) => {
        unlistenSettings = un;
      });

      listen('open-smart-burn', () => {
        setIsSmartBurnOpen(true);
      }).then((un) => {
        unlistenSmartBurn = un;
      });

      listen<boolean>('open-quick-capture', async (event) => {
        setIsSearchOpen(false);
        setIsAuthOpen(false);
        setIsShortcutsOpen(false);
        setIsSmartBurnOpen(false);
        setIsQuickCaptureOpen(true);
        if (event.payload === true) {
          setIsQuickCaptureFromBackground(true);
        }
        try {
          const win = getCurrentWindow();
          await win.show();
          await win.unminimize();
          await win.setFocus();
        } catch {}
      }).then((un) => {
        unlistenQuickCapture = un;
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
        setIsQuickCaptureOpen(true);
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
          const next = prev === 'permissions' ? 'notes' : 'permissions';
          try {
            sessionStorage.setItem('gpn_session_tab', next);
          } catch {}
          return next;
        });
      } else if (e.key === 'Escape') {
        if (isSearchOpen) {
          setIsSearchOpen(false);
        } else if (isAuthOpen) {
          setIsAuthOpen(false);
        } else if (isQuickCaptureOpen) {
          handleCloseQuickCapture();
        } else if (isSmartBurnOpen) {
          setIsSmartBurnOpen(false);
        } else if (isShortcutsOpen) {
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

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
      if (unlistenSync) unlistenSync();
      if (unlistenSettings) unlistenSettings();
      if (unlistenSmartBurn) unlistenSmartBurn();
      if (unlistenQuickCapture) unlistenQuickCapture();
    };
  }, []);

  const handleCheckUpdates = async () => {
    if (isCheckingUpdates) return;
    setIsCheckingUpdates(true);
    const CURRENT_VERSION = 'v0.0.1';

    try {
      const res = await fetch(
        'https://api.github.com/repos/AspiringWebGaurav/gaurav-personal-notes/releases/latest',
        { headers: { Accept: 'application/vnd.github.v3+json' } }
      );

      if (res.ok) {
        const data = await res.json();
        const latestTag = data.tag_name || CURRENT_VERSION;
        if (latestTag !== CURRENT_VERSION && latestTag > CURRENT_VERSION) {
          setUpdateToast({
            title: 'Update available',
            description: latestTag,
          });
        } else {
          setUpdateToast({
            title: 'Up to date',
            description: CURRENT_VERSION,
          });
        }
      } else {
        setUpdateToast({
          title: 'Up to date',
          description: CURRENT_VERSION,
        });
      }
    } catch {
      setUpdateToast({
        title: 'Up to date',
        description: CURRENT_VERSION,
      });
    } finally {
      setIsCheckingUpdates(false);
      setTimeout(() => {
        setUpdateToast(null);
      }, 4500);
    }
  };

  const handleQuitApp = async () => {
    const ok = await useConfirmStore.getState().confirm({
      title: 'Quit Gaurav Personal Notes?',
      description: 'This will close GPN completely and pause background synchronization until you reopen the app.',
      confirmText: 'QUIT GPN',
      cancelText: 'Stay',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      sessionStorage.removeItem('gpn_session_tab');
    } catch {}

    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    if (isTauri) {
      try {
        await getCurrentWindow().destroy();
      } catch {
        window.close();
      }
    } else {
      window.close();
    }
  };

  if (isCaptureWindow) {
    return (
      <div className={`w-screen h-screen bg-transparent select-none overflow-hidden font-sans ${isDarkMode ? 'dark' : ''}`}>
        <QuickCaptureModal isOpen={true} isStandalone={true} onClose={async () => { try { await getCurrentWindow().hide(); } catch {} }} />
      </div>
    );
  }

  // When summoned from background via global capture key, ONLY render the floating capture UI
  if (isQuickCaptureFromBackground && isQuickCaptureOpen) {
    return (
      <div
        className={`w-screen h-screen bg-transparent select-none overflow-hidden font-sans ${
          isDarkMode ? 'dark' : ''
        }`}
      >
        <QuickCaptureModal
          isOpen={isQuickCaptureOpen}
          onClose={handleCloseQuickCapture}
        />
      </div>
    );
  }

  return (
    <div
      className={`w-screen h-screen flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 select-none overflow-hidden font-sans transition-colors ${
        isDarkMode ? 'dark' : ''
      }`}
    >
      {/* Draggable minimal window top bar with dynamic center update status */}
      <GpnWindowHeader
        isCheckingUpdates={isCheckingUpdates}
        isSyncing={isSyncing}
        updateToast={updateToast}
        onDismissUpdateToast={() => setUpdateToast(null)}
      />

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
              onOpenQuickCapture={() => setIsQuickCaptureOpen(true)}
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
              onOpenQuickCapture={() => setIsQuickCaptureOpen(true)}
              onOpenShortcuts={() => setIsShortcutsOpen(true)}
              onOpenAuthModal={handleOpenAuthModal}
              isDarkMode={isDarkMode}
              onToggleDarkMode={handleToggleDarkMode}
              onQuit={handleQuitApp}
            />
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

      <QuickCaptureModal
        isOpen={isQuickCaptureOpen}
        onOpen={() => setIsQuickCaptureOpen(true)}
        onClose={handleCloseQuickCapture}
      />

      <SmartBurnModal
        isOpen={isSmartBurnOpen}
        onClose={() => setIsSmartBurnOpen(false)}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <ConfirmModal />
      <UpdateNotification />
    </div>
  );
}

export default App;
