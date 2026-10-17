import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Database,
  User,
  ShieldCheck,
  Trash2,
  HelpCircle,
  BookOpen,
  ArrowUpRight,
  RotateCw,
  Loader2,
  Moon,
  Sun,
  Power,
  Flame,
  Wifi,
  WifiOff,
  Cloud,
  RefreshCw,
  LogIn,
  ChevronDown,
  X,
  Home,
  Settings,
  Check,
  AlertCircle,
  Users,
} from 'lucide-react';
import { openExternalUrl } from '../../utils/urlHelper';
import { useAuthStore } from '../../stores/authStore';
import { useSyncStore } from '../../stores/syncStore';
import { useNotesStore } from '../../stores/notesStore';
import { useUpdateStore } from '../../stores/updateStore';
import { APP_VERSION } from '../../services/updateService';
import { formatVersion } from '../../utils/version';
import { GlossyProgressBar } from './GlossyProgressBar';

export type GpnTab = 'home' | 'notes' | 'collab' | 'account' | 'database' | 'settings' | 'permissions' | 'trash';

export interface GpnSidebarProps {
  activeTab: GpnTab;
  onSelectTab: (tab: GpnTab) => void;
  isAuthenticated: boolean;
  isOnline: boolean;
  notesCount: number;
  trashCount: number;
  onOpenShortcuts: () => void;
  onOpenDocs?: () => void;
  onOpenSmartBurn?: () => void;
  onCheckUpdates: () => void;
  isCheckingUpdates?: boolean;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onQuit: () => void;
  onOpenAuthModal?: (mode?: 'default' | 'logout') => void;
}

export const GpnSidebar: React.FC<GpnSidebarProps> = ({

  activeTab,
  onSelectTab,
  isAuthenticated: propIsAuth,
  isOnline,
  notesCount,
  trashCount,
  onOpenShortcuts,
  onOpenDocs,
  onOpenSmartBurn,
  onCheckUpdates,
  isCheckingUpdates = false,
  isDarkMode = false,
  onToggleDarkMode,
  onQuit,
  onOpenAuthModal,
}) => {
  const { user, isAuthenticated: storeIsAuth } = useAuthStore();
  const { isManualSyncing, isSyncing: storeIsSyncing, status: syncStatus, triggerSync } = useSyncStore();
  const { notes } = useNotesStore();
  const updateStatus = useUpdateStore((state) => state.status);
  const downloadUpdate = useUpdateStore((state) => state.downloadUpdate);
  const installAndRestart = useUpdateStore((state) => state.installAndRestart);

  const isAuthenticated = propIsAuth ?? storeIsAuth;
  const isSyncing = isManualSyncing || storeIsSyncing;

  // Status popover state
  const [isStatusPopoverOpen, setIsStatusPopoverOpen] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const statusButtonRef = useRef<HTMLButtonElement>(null);

  // Refresh status whenever popover opens
  useEffect(() => {
    if (isStatusPopoverOpen) {
      useSyncStore.getState().fetchStatus();
    }
  }, [isStatusPopoverOpen]);

  // Close popover when clicking outside or pressing Escape
  useEffect(() => {
    if (!isStatusPopoverOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        statusButtonRef.current &&
        !statusButtonRef.current.contains(e.target as Node)
      ) {
        setIsStatusPopoverOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsStatusPopoverOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isStatusPopoverOpen]);

  // Format relative timestamp helper
  const formatRelativeTime = (timestamp?: number | null): string => {
    if (!timestamp) return 'Never';
    const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return new Date(timestamp).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleManualSync = async () => {
    if (syncInProgress || isSyncing) return;
    setSyncInProgress(true);
    try {
      await triggerSync();
    } catch (err) {
      console.error('Manual sync failed:', err);
    } finally {
      setSyncInProgress(false);
    }
  };

  const handleGoLive = () => {
    setIsStatusPopoverOpen(false);
    if (onOpenAuthModal) {
      onOpenAuthModal('default');
    } else {
      onSelectTab('account');
    }
  };

  const handleManageAccount = () => {
    setIsStatusPopoverOpen(false);
    onSelectTab('account');
  };

  // Compute dynamic pill presentation
  let statusText = 'LOCAL';
  let badgeStyle =
    'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100/80 dark:hover:bg-zinc-800';
  let dotElement: React.ReactNode = (
    <span className="relative flex h-2 w-2">
      <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-400 dark:bg-zinc-500" />
    </span>
  );

  if (!isOnline) {
    statusText = 'OFFLINE';
    badgeStyle =
      'border-amber-300 dark:border-amber-800/80 bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100/70 dark:hover:bg-amber-900/40';
    dotElement = (
      <span className="relative flex h-2 w-2">
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
      </span>
    );
  } else if (isSyncing || syncInProgress) {
    statusText = 'SYNCING';
    badgeStyle =
      'border-sky-300 dark:border-sky-800/80 bg-sky-50/80 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 hover:bg-sky-100/70 dark:hover:bg-sky-900/40';
    dotElement = (
      <RefreshCw className="w-2.5 h-2.5 animate-spin text-sky-600 dark:text-sky-400" />
    );
  } else if (isAuthenticated) {
    statusText = 'LIVE';
    badgeStyle =
      'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40';
    dotElement = (
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
    );
  } else {
    statusText = 'LOCAL';
    badgeStyle =
      'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100/80 dark:hover:bg-zinc-800';
    dotElement = (
      <span className="relative flex h-2 w-2">
        <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-400 dark:bg-zinc-500" />
      </span>
    );
  }

  const navItems: { id: GpnTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home className="w-4 h-4" />,
    },
    {
      id: 'notes',
      label: 'Notes',
      icon: <FileText className="w-4 h-4" />,
      badge: notesCount,
    },
    {
      id: 'collab',
      label: 'Co-op',
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'account',
      label: 'Account',
      icon: <User className="w-4 h-4" />,
    },
    {
      id: 'database',
      label: 'Database',
      icon: <Database className="w-4 h-4" />,
    },
    {
      id: 'permissions',
      label: 'Permissions',
      icon: <ShieldCheck className="w-4 h-4" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
    },
    {
      id: 'trash',
      label: 'Trash',
      icon: <Trash2 className="w-4 h-4" />,
      badge: trashCount > 0 ? trashCount : undefined,
    },
  ];

  return (
    <aside className="w-56 md:w-60 h-full border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col justify-between p-4 shrink-0 select-none transition-colors">
      {/* Top Section: Brand + Navigation */}
      <div className="flex flex-col">
        {/* Brand Bar */}
        <div className="relative flex items-center justify-between pb-3">
          <div className="flex items-baseline gap-2">
            <button
              type="button"
              onClick={() => onSelectTab('home')}
              className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 font-sans hover:opacity-80 transition cursor-pointer text-left"
              title="Go to Home / Main Menu"
            >
              gpn
            </button>
            <span
              className="text-[11px] font-mono font-medium text-zinc-400 dark:text-zinc-500 select-none tracking-tight"
              title={`GPN App ${formatVersion(updateStatus.currentVersion || APP_VERSION)}`}
            >
              {formatVersion(updateStatus.currentVersion || APP_VERSION)}
            </span>
          </div>

          {/* GPN dynamic interactive status pill */}
          <button
            ref={statusButtonRef}
            type="button"
            onClick={() => {
              setIsStatusPopoverOpen((prev) => {
                const next = !prev;
                if (next) {
                  useSyncStore.getState().fetchStatus();
                }
                return next;
              });
            }}
            aria-expanded={isStatusPopoverOpen}
            title={
              !isOnline
                ? 'Offline • Click for details'
                : isSyncing
                ? 'Syncing... • Click for details'
                : isAuthenticated
                ? 'Synced • Click for details'
                : 'Local notes • Click to sign in'
            }
            className={`group flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] border text-[10px] font-mono font-medium tracking-wider cursor-pointer select-none transition-all active:scale-95 shadow-2xs hover:shadow-xs ${badgeStyle}`}
          >
            {dotElement}
            <span>{statusText}</span>
            <ChevronDown
              className={`w-2.5 h-2.5 opacity-60 group-hover:opacity-100 transition-transform ${
                isStatusPopoverOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dynamic Status Popover Card */}
          {isStatusPopoverOpen && (
            <div
              ref={popoverRef}
              className="absolute left-0 top-full mt-1.5 w-72 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-4 z-50 text-left font-sans text-xs text-zinc-800 dark:text-zinc-200 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    {isAuthenticated && isOnline && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${
                        !isOnline
                          ? 'bg-amber-500'
                          : isSyncing
                          ? 'bg-sky-500'
                          : isAuthenticated
                          ? 'bg-emerald-500'
                          : 'bg-zinc-400'
                      }`}
                    />
                  </span>
                  <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                    {!isOnline
                      ? 'Offline'
                      : isSyncing
                      ? 'Syncing'
                      : isAuthenticated
                      ? 'Synced'
                      : 'Local only'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsStatusPopoverOpen(false)}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                  aria-label="Close status popover"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Description */}
              <p className="py-2.5 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                {!isOnline
                  ? 'You are offline. Notes will sync when you reconnect.'
                  : isSyncing
                  ? 'Syncing notes with your account...'
                  : isAuthenticated
                  ? 'Your notes are synced with your Google account.'
                  : 'Notes are saved on this device only.'}
              </p>

              {/* Telemetry Matrix */}
              <div className="py-2.5 space-y-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <User className="w-3 h-3 text-zinc-400" /> Account:
                  </span>
                  <span
                    className="font-mono text-zinc-800 dark:text-zinc-200 truncate max-w-[135px]"
                    title={user?.email || 'Local'}
                  >
                    {user?.email || 'Local'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <Database className="w-3 h-3 text-zinc-400" /> Storage:
                  </span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded text-[10px] font-mono">
                    Local
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-zinc-400" /> App Version:
                  </span>
                  <span className="font-mono text-[10px] text-zinc-700 dark:text-zinc-300 font-medium">
                    v{updateStatus.currentVersion || APP_VERSION}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                    {isOnline ? (
                      <Wifi className="w-3 h-3 text-zinc-400" />
                    ) : (
                      <WifiOff className="w-3 h-3 text-amber-500" />
                    )}{' '}
                    Network:
                  </span>
                  <span
                    className={`font-mono text-[10px] ${
                      isOnline
                        ? 'text-zinc-700 dark:text-zinc-300'
                        : 'text-amber-600 dark:text-amber-400 font-semibold'
                    }`}
                  >
                    {isOnline ? 'Connected' : 'Offline'}
                  </span>
                </div>

                {isAuthenticated && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                        <Cloud className="w-3 h-3 text-zinc-400" /> Last Synced:
                      </span>
                      <span className="font-mono text-[10px] text-zinc-700 dark:text-zinc-300">
                        {formatRelativeTime(syncStatus.lastSyncedAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                        <RefreshCw className="w-3 h-3 text-zinc-400" /> Pending:
                      </span>
                      <span className="font-mono text-[10px] text-zinc-700 dark:text-zinc-300">
                        {(() => {
                          const hasAnyPendingNote = notes.some((n) => n.syncState === 'pending');
                          const count = hasAnyPendingNote ? syncStatus.pendingCount : 0;
                          return count === 0
                            ? '0 pending'
                            : `${count} pending`;
                        })()}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Actions Footer */}
              <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-2">
                {isAuthenticated && isOnline ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleManualSync}
                      disabled={isSyncing || syncInProgress}
                      className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium text-[11px] cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${
                          isSyncing || syncInProgress ? 'animate-spin' : ''
                        }`}
                      />
                      <span>{isSyncing || syncInProgress ? 'Syncing...' : 'Sync Now'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleManageAccount}
                      className="px-2.5 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-[11px] cursor-pointer transition-colors"
                    >
                      Manage
                    </button>
                  </div>
                ) : !isAuthenticated ? (
                  <button
                    type="button"
                    onClick={handleGoLive}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-black dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-950 font-medium text-[11px] cursor-pointer transition-colors shadow-2xs"
                  >
                    <LogIn className="w-3 h-3" />
                    <span>Sign in to sync</span>
                  </button>
                ) : (
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 text-center font-mono">
                    Reconnecting when network returns...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dashed subtle divider */}
        <div className="border-b border-dashed border-zinc-200 dark:border-zinc-800 mb-3" />

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-[3px] transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-black dark:bg-zinc-100 text-white dark:text-zinc-950 font-medium shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 font-normal'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={isActive ? 'text-white dark:text-zinc-950' : 'text-zinc-500 dark:text-zinc-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] ${
                      isActive
                        ? 'bg-white/20 dark:bg-black/10 text-white dark:text-zinc-900'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Utility Links */}
      <div className="flex flex-col gap-1 pt-3 border-t border-zinc-200 dark:border-zinc-800">
        {onOpenSmartBurn && (
          <button
            type="button"
            onClick={onOpenSmartBurn}
            className="flex items-center justify-between px-3 py-1.5 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50/70 dark:hover:bg-amber-950/40 rounded-[2px] transition-colors cursor-pointer group font-medium"
            title="Open View-Once Encrypted Self-Destructing Notes"
          >
            <div className="flex items-center gap-2">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Smart Burn</span>
            </div>
            <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-900/50 px-1.5 py-0.2 rounded font-semibold">
              Burn
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenShortcuts}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-[2px] transition-colors cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
          <span>FAQ</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (onOpenDocs) {
              onOpenDocs();
            } else {
              openExternalUrl('https://gpnotes.eu.cc/docs');
            }
          }}
          className="flex items-center justify-between px-3 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-[2px] transition-colors cursor-pointer group"
          title="Open Centralized Documentation on Website (gpnotes.eu.cc/docs)"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors" />
            <span>Docs</span>
          </div>
          <ArrowUpRight className="w-3 h-3 text-zinc-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </button>

        {isCheckingUpdates || updateStatus.state === 'checking' ? (
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-850 text-zinc-900 dark:text-zinc-100 font-medium rounded-[2px] cursor-default select-none animate-in fade-in duration-150">
            <RotateCw className="w-3.5 h-3.5 animate-spin text-zinc-600 dark:text-zinc-300" />
            <span>Checking updates...</span>
          </div>
        ) : updateStatus.state === 'up-to-date' ? (
          <div
            className="flex items-center justify-between px-3 py-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-[2px] font-medium border border-emerald-200/60 dark:border-emerald-800/50 select-none animate-in fade-in duration-150"
            title={`${formatVersion(updateStatus.currentVersion || APP_VERSION)} is the latest version`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[2.5]" />
              <span className="truncate">Up to date</span>
            </div>
            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 shrink-0 ml-1.5">
              {formatVersion(updateStatus.currentVersion || APP_VERSION)}
            </span>
          </div>
        ) : updateStatus.state === 'available' ? (
          <button
            type="button"
            onClick={(e) => {
              const isTest =
                typeof window !== 'undefined' &&
                (Boolean((window as any).__PLAYWRIGHT_TEST__) ||
                  (process as any)?.env?.NODE_ENV === 'test');
              if (!e.isTrusted && !isTest) return;
              downloadUpdate({ isExplicitUserAction: true, source: 'sidebar_button' });
            }}
            className="flex items-center justify-between px-3 py-1.5 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 hover:bg-violet-50/70 dark:hover:bg-violet-950/40 rounded-[2px] transition-colors cursor-pointer group font-medium"
            title={`Update available: ${formatVersion(updateStatus.version)} - Click to download & install`}
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
              </span>
              <span>Update available</span>
            </div>
            <span className="text-[10px] font-mono text-violet-600 dark:text-violet-400 bg-violet-100/80 dark:bg-violet-900/50 px-1.5 py-0.5 rounded font-semibold">
              {formatVersion(updateStatus.version || APP_VERSION)}
            </span>
          </button>
        ) : updateStatus.state === 'downloading' ? (
          <div className="flex items-center justify-between px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-[2px] font-medium gap-2">
            <div className="flex items-center gap-2 truncate">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500 shrink-0" />
              <span className="truncate">Downloading...</span>
            </div>
            <GlossyProgressBar progress={updateStatus.percentage ?? 1} className="w-14 h-2.5 shrink-0" />
          </div>
        ) : updateStatus.state === 'verifying' ? (
          <div className="flex items-center justify-between px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/30 rounded-[2px] font-medium gap-2">
            <div className="flex items-center gap-2 truncate">
              <RotateCw className="w-3.5 h-3.5 animate-spin text-amber-500 shrink-0" />
              <span className="truncate">Verifying...</span>
            </div>
            <GlossyProgressBar progress={100} className="w-14 h-2.5 shrink-0" />
          </div>
        ) : updateStatus.state === 'ready' ? (
          <button
            type="button"
            onClick={() => installAndRestart()}
            className="flex items-center justify-between px-3 py-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 rounded-[2px] transition-colors cursor-pointer group font-medium"
            title={`${formatVersion(updateStatus.version)} ready - Click to restart`}
          >
            <div className="flex items-center gap-2">
              <RotateCw className="w-3.5 h-3.5 text-emerald-500" />
              <span>Restart to update</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded font-semibold uppercase">
              Restart
            </span>
          </button>
        ) : updateStatus.state === 'installing' ? (
          <div className="flex items-center justify-between px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-[2px] font-medium gap-2">
            <div className="flex items-center gap-2 truncate">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500 shrink-0" />
              <span className="truncate">Installing...</span>
            </div>
            <GlossyProgressBar progress={68} className="w-14 h-2.5 shrink-0" />
          </div>
        ) : updateStatus.state === 'restarting' ? (
          <div className="flex items-center justify-between px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-[2px] font-medium gap-2">
            <div className="flex items-center gap-2 truncate">
              <RotateCw className="w-3.5 h-3.5 animate-spin text-emerald-500 shrink-0" />
              <span className="truncate">Restarting...</span>
            </div>
            <GlossyProgressBar progress={100} className="w-14 h-2.5 shrink-0" />
          </div>
        ) : updateStatus.state === 'error' ? (
          <div
            className="flex items-center justify-between px-3 py-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/30 rounded-[2px] font-medium border border-amber-200/60 dark:border-amber-800/50 select-none animate-in fade-in duration-150"
            title={updateStatus.error || 'Check failed'}
          >
            <div className="flex items-center gap-1.5 truncate">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate">Check failed</span>
            </div>
            <button
              type="button"
              onClick={onCheckUpdates}
              className="text-[10px] font-medium text-amber-700 dark:text-amber-300 hover:underline shrink-0 ml-1.5 cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onCheckUpdates}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 active:scale-[0.98] rounded-[2px] transition-all cursor-pointer group select-none outline-none"
            title="Check for updates"
          >
            <RotateCw className="w-3.5 h-3.5 text-zinc-400 group-hover:rotate-45 transition-transform duration-200" />
            <span>Check updates</span>
          </button>
        )}

        {onToggleDarkMode && (
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-[2px] transition-colors cursor-pointer"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-zinc-400" />
                <span>Dark mode</span>
              </>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onQuit}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-[2px] transition-colors cursor-pointer w-full text-left"
          title="Close window (GPN remains active in background tray for instant capture)"
        >
          <Power className="w-3.5 h-3.5 text-zinc-400" />
          <span>Quit GPN</span>
        </button>
      </div>
    </aside>
  );
};
