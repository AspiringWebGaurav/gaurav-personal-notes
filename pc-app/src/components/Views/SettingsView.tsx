import React, { useState, useEffect, useRef } from 'react';
import { SegmentedToggle } from '../GpnLayout/SegmentedToggle';
import { GlossyProgressBar } from '../GpnLayout/GlossyProgressBar';
import {
  FolderOpen,
  Settings,
  Power,
  Zap,
  CloudUpload,
  Trash2,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Check,
  Download,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { gphostService } from '../../services/gphostService';
import { useUpdateStore } from '../../stores/updateStore';
import { APP_VERSION } from '../../services/updateService';
import { formatVersion } from '../../utils/version';
import { openExternalUrl } from '../../utils/urlHelper';
import { PatchNotesSettingsSection } from './PatchNotesSettingsSection';

export interface SettingsViewProps {
  initialSubTab?: 'general' | 'patch-notes';
}

export const SettingsView: React.FC<SettingsViewProps> = ({ initialSubTab = 'general' }) => {
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'patch-notes'>(initialSubTab);

  useEffect(() => {
    const handleSubTabEvent = (e: Event) => {
      const customEvent = e as CustomEvent<'general' | 'patch-notes'>;
      if (customEvent.detail) {
        setActiveSubTab(customEvent.detail);
      }
    };
    window.addEventListener('gpn-open-settings-tab', handleSubTabEvent);
    return () => window.removeEventListener('gpn-open-settings-tab', handleSubTabEvent);
  }, []);
  const [autostartEnabled, setAutostartEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('gpn_autostart');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [autostartLoading, setAutostartLoading] = useState(false);
  const [isUninstallConfirmOpen, setIsUninstallConfirmOpen] = useState(false);
  const [isLaunchingUninstall, setIsLaunchingUninstall] = useState(false);
  const [uninstallError, setUninstallError] = useState<string | null>(null);
  const [uninstallNotice, setUninstallNotice] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const uninstallSectionRef = useRef<HTMLDivElement>(null);
  const confirmBoxRef = useRef<HTMLDivElement>(null);
  const uninstallTriggerRef = useRef<HTMLButtonElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const confirmUninstallBtnRef = useRef<HTMLButtonElement>(null);

  // Auto-focus and auto-scroll down to the confirmation section when triggered
  useEffect(() => {
    if (isUninstallConfirmOpen) {
      try {
        const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
        if (isTauri) {
          import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
            getCurrentWindow().setFocus().catch(() => {});
          }).catch(() => {});
        }
      } catch {}

      const timer = setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTo({
            top: containerRef.current.scrollHeight,
            behavior: 'smooth',
          });
        } else if (uninstallSectionRef.current) {
          uninstallSectionRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'end',
          });
        }

        if (cancelBtnRef.current) {
          cancelBtnRef.current.focus({ preventScroll: true });
        } else if (confirmBoxRef.current) {
          confirmBoxRef.current.focus({ preventScroll: true });
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [isUninstallConfirmOpen]);

  const handleOpenUninstallConfirm = () => {
    setIsUninstallConfirmOpen(true);
    setUninstallError(null);
    setUninstallNotice(null);
  };

  const handleCancelUninstall = () => {
    setIsUninstallConfirmOpen(false);
    setUninstallError(null);
    setTimeout(() => {
      uninstallTriggerRef.current?.focus({ preventScroll: true });
    }, 30);
  };
  const [idleOptimization, setIdleOptimization] = useState(() => {
    try {
      const saved = localStorage.getItem('gpn_idle_opt');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [gphostApiKey, setGphostApiKey] = useState(() => gphostService.getApiKey());
  const [keySavedToast, setKeySavedToast] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Opt-in Software Updates lifecycle state
  const { status, checkForUpdates, downloadUpdate, installAndRestart } = useUpdateStore();
  const percentage = status.percentage ?? 0;
  const currentVer = status.currentVersion || APP_VERSION;

  // Check autostart status from Tauri
  useEffect(() => {
    const checkAutostart = async () => {
      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
      if (isTauri) {
        try {
          const enabled = await invoke<boolean>('cmd_get_autostart_status');
          setAutostartEnabled(enabled);
          try {
            localStorage.setItem('gpn_autostart', String(enabled));
          } catch {}
        } catch (err) {
          console.warn('Could not query autostart status:', err);
          try {
            const cached = localStorage.getItem('gpn_autostart');
            setAutostartEnabled(cached !== null ? cached === 'true' : true);
          } catch {}
        }
      }
    };

    checkAutostart();
  }, []);

  useEffect(() => {
    try {
      const target = sessionStorage.getItem('gpn_settings_subtab');
      if (target === 'patch-notes' || target === 'general') {
        setActiveSubTab(target);
        sessionStorage.removeItem('gpn_settings_subtab');
      }
    } catch {}
  }, []);

  const handleToggleAutostart = async (enable: boolean) => {
    setAutostartLoading(true);
    try {
      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
      if (isTauri) {
        try {
          const newState = await invoke<boolean>('cmd_set_autostart', { enabled: enable });
          setAutostartEnabled(newState);
          try {
            localStorage.setItem('gpn_autostart', String(newState));
          } catch {}
        } catch (err) {
          console.error('Failed to change autostart setting:', err);
        }
      } else {
        setAutostartEnabled(enable);
        try {
          localStorage.setItem('gpn_autostart', String(enable));
        } catch {}
      }
    } finally {
      setAutostartLoading(false);
    }
  };

  const handleSetIdleOptimization = (enabled: boolean) => {
    setIdleOptimization(enabled);
    try {
      localStorage.setItem('gpn_idle_opt', String(enabled));
    } catch {}
  };

  const handleOpenFolder = async () => {
    try {
      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
      if (isTauri) {
        await invoke('cmd_open_app_folder');
      } else {
        alert('Open folder is available in the desktop app.');
      }
    } catch (err) {
      console.error('Failed to open folder:', err);
    }
  };

  const handleOpenWindowsSettings = async () => {
    try {
      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
      if (isTauri) {
        await invoke('cmd_open_windows_app_settings');
      } else {
        window.open('ms-settings:appsfeatures', '_blank');
      }
    } catch (err) {
      console.error('Failed to open Windows Settings:', err);
    }
  };

  const handleSaveGphostKey = () => {
    gphostService.setApiKey(gphostApiKey);
    setKeySavedToast(true);
    setTimeout(() => setKeySavedToast(false), 2000);
  };

  const handleTestGphostKey = async () => {
    setTestingKey(true);
    setTestResult(null);
    try {
      const pingBlob = new Blob(['GPN_PING'], { type: 'text/plain' });
      await gphostService.uploadMedia(pingBlob, 'gpn_connection_test.txt');
      setTestResult('Verified: GPHost Cloud is Connected!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult(`Notice: ${msg.slice(0, 50)}`);
    } finally {
      setTestingKey(false);
      setTimeout(() => setTestResult(null), 4000);
    }
  };

  const handleLaunchUninstall = async () => {
    setIsLaunchingUninstall(true);
    setUninstallError(null);
    setUninstallNotice('Starting Windows uninstaller...');
    try {
      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
      if (isTauri) {
        await invoke('cmd_launch_uninstaller');
        setUninstallNotice('Closing app and launching uninstaller...');
      } else {
        alert('Uninstaller is available in the installed desktop app on Windows.');
        setIsLaunchingUninstall(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Failed to launch uninstaller:', err);
      setUninstallError(msg);
      setUninstallNotice(null);
      setIsLaunchingUninstall(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full overflow-y-auto bg-white dark:bg-zinc-950 p-8 flex flex-col gap-6 select-none transition-colors"
    >
      {/* Header */}
      <div>
        <span className="text-[11px] font-mono tracking-[0.25em] font-semibold text-zinc-400 dark:text-zinc-500 uppercase flex items-center gap-1.5">
          <Settings className="w-3.5 h-3.5 text-zinc-400" />
          <span>APPLICATION SETTINGS</span>
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
          Settings.
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          System directory integration, Windows app controls, startup preferences, and media configuration.
        </p>
      </div>

      {/* Subtab Navigation (General Settings vs Patch Notes) */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('general')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-xs font-medium cursor-pointer transition-colors ${
            activeSubTab === 'general'
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>General Settings</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('patch-notes')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-xs font-medium cursor-pointer transition-colors ${
            activeSubTab === 'patch-notes'
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Patch Notes History</span>
        </button>
      </div>

      {activeSubTab === 'patch-notes' ? (
        <PatchNotesSettingsSection currentRunningVersion={currentVer} />
      ) : (
        <>
      {/* 1. Software Updates Card (User-Controlled, Transparent & Opt-In) */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-[2px] p-5 bg-white dark:bg-zinc-900 flex flex-col gap-3 shadow-2xs">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3.5 min-w-0">
            <div
              className={`w-10 h-10 rounded-[2px] border flex items-center justify-center shrink-0 mt-0.5 ${
                status.state === 'available'
                  ? 'border-violet-300 dark:border-violet-700 bg-violet-50/70 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400'
                  : status.state === 'ready'
                  ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                  : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
              }`}
            >
              {status.state === 'available' ? (
                <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              ) : status.state === 'ready' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : status.state === 'downloading' ? (
                <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-bounce" />
              ) : status.state === 'checking' ? (
                <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
              ) : status.state === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-500" />
              ) : (
                <RefreshCw className="w-4 h-4 text-emerald-500" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  SOFTWARE UPDATES &bull; v{currentVer}
                </span>
                {status.state === 'available' && (
                  <span className="px-1.5 py-0.2 rounded-[2px] text-[10px] font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300">
                    Update Available
                  </span>
                )}
                {status.state === 'ready' && (
                  <span className="px-1.5 py-0.2 rounded-[2px] text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                    Ready to Restart
                  </span>
                )}
                {status.state === 'up-to-date' && (
                  <span className="px-1.5 py-0.2 rounded-[2px] text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 animate-in fade-in duration-150">
                    Up to date &bull; {formatVersion(currentVer)}
                  </span>
                )}
              </div>
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                {status.state === 'available'
                  ? `Version ${formatVersion(status.version)} is available`
                  : status.state === 'ready'
                  ? `Version ${formatVersion(status.version)} is ready to install`
                  : status.state === 'downloading'
                  ? `Downloading ${formatVersion(status.version)}...`
                  : status.state === 'verifying'
                  ? `Verifying cryptographic signature...`
                  : status.state === 'checking'
                  ? 'Checking for updates...'
                  : status.state === 'error'
                  ? 'Update check notice'
                  : 'Gaurav Personal Notes is up to date'}
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed max-w-xl">
                {status.state === 'available'
                  ? 'A newer version is available. You are free to continue using your current version without interruption, or update whenever you are ready to access the latest features.'
                  : status.state === 'ready'
                  ? 'The update is verified and ready to install. Restart GPN whenever you choose. Your current work and notes will never be interrupted.'
                  : status.state === 'downloading'
                  ? 'Downloading update package in the background. You can continue writing and navigating notes freely.'
                  : status.state === 'error'
                  ? `${status.error || 'Could not reach update server'}. Your current installation is safe and unaffected.`
                  : 'Updates are opt-in and user-controlled. You will be notified when a new version is released.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {status.state === 'available' && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    const isTest =
                      typeof window !== 'undefined' &&
                      (Boolean((window as any).__PLAYWRIGHT_TEST__) ||
                        (process as any)?.env?.NODE_ENV === 'test');
                    if (!e.isTrusted && !isTest) return;
                    downloadUpdate({ isExplicitUserAction: true, source: 'settings_button' });
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white rounded-[2px] transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download &amp; Install</span>
                </button>
              </>
            )}

            {status.state === 'ready' && (
              <button
                type="button"
                onClick={() => installAndRestart()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-[2px] transition-colors cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restart Now to Apply</span>
              </button>
            )}

            {status.state === 'installing' && (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 rounded-[2px] select-none">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-600 dark:text-violet-400" />
                <span>Installing update package...</span>
              </div>
            )}

            {status.state === 'restarting' && (
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-[2px] select-none">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                <span>Restarting application...</span>
              </div>
            )}

            {status.state === 'checking' && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-[2px] select-none">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-500 dark:text-zinc-400" />
                <span>Checking updates...</span>
              </div>
            )}

            {status.state === 'up-to-date' && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 rounded-[2px] select-none animate-in fade-in duration-150">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                <span>Up to date • v{currentVer}</span>
              </div>
            )}

            {(status.state === 'idle' || status.state === 'error') && (
              <button
                type="button"
                onClick={() => checkForUpdates()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 active:scale-[0.98] rounded-[2px] transition-all cursor-pointer select-none outline-none"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Check for Updates</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveSubTab('patch-notes')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 active:scale-[0.98] rounded-[2px] transition-all cursor-pointer select-none outline-none shadow-2xs"
              title="View all release patch notes history"
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-500" />
              <span>Patch Notes</span>
            </button>
          </div>
        </div>

        {/* Real-time Glossy Windows Green Progress Bar (Zero Digits) */}
        {(status.state === 'downloading' || status.state === 'verifying') && (
          <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800">
            <GlossyProgressBar
              progress={status.state === 'verifying' ? 100 : Math.max(1, percentage)}
              className="w-full h-4"
            />
          </div>
        )}
      </div>

      {/* Main Settings List - Uniform layout identical to Permissions */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-[2px] divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        {/* Row 1: Open App Folder */}
        <div className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-[2px] border border-violet-200 dark:border-violet-800 bg-violet-50/40 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 mt-0.5">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  FILE EXPLORER
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 truncate" title="%LOCALAPPDATA%\Gaurav Personal Notes">
                  %LOCALAPPDATA%\Gaurav Personal Notes
                </span>
              </div>
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                Open App Folder
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                Reveal the local Gaurav Personal Notes installation directory and executable in Windows File Explorer.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenFolder}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-[2px] transition-colors cursor-pointer shrink-0"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Open Folder</span>
          </button>
        </div>

        {/* Row 2: Windows App Settings */}
        <div className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-[2px] border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
              <Settings className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  WINDOWS SETTINGS
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 truncate">
                  ms-settings:appsfeatures
                </span>
              </div>
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                Windows App Settings
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                Launch the native Windows Installed Apps control panel to inspect system registration and app properties.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenWindowsSettings}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-[2px] transition-colors cursor-pointer shrink-0"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Windows Settings</span>
            <ArrowUpRight className="w-3 h-3 text-zinc-400" />
          </button>
        </div>

        {/* Row 3: Launch at startup */}
        <div className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-[2px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0 mt-0.5">
              <Power className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  SYSTEM STARTUP
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 truncate">
                  Windows Registry Run
                </span>
              </div>
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                Launch at startup
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                Starts GPN automatically in the background at Windows user sign-in.
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <SegmentedToggle
              enabled={autostartEnabled}
              onChange={handleToggleAutostart}
              disabled={autostartLoading}
            />
          </div>
        </div>

        {/* Row 4: Idle background optimization */}
        <div className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-[2px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  MEMORY OPTIMIZATION
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 truncate">
                  Process Working Set Trim
                </span>
              </div>
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                Idle background optimization
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                Suspends the UI render loop and frees working set RAM when minimized to tray.
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <SegmentedToggle
              enabled={idleOptimization}
              onChange={(val) => handleSetIdleOptimization(val)}
            />
          </div>
        </div>
      </div>

      {/* Cloud Media Storage (GPHost Integration) */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-[2px] p-5 bg-white dark:bg-zinc-900 flex flex-col gap-4 shadow-2xs">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[2px] border border-sky-200 dark:border-sky-800 bg-sky-50/40 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <CloudUpload className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Cloud Media Storage (GPHost)
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Configure your API key to host images and media attachments via Cloudflare R2 on GPHost.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <input
            type="password"
            value={gphostApiKey}
            onChange={(e) => setGphostApiKey(e.target.value)}
            placeholder="Enter GPHost API Key (optional)"
            className="flex-1 px-3 py-1.5 text-xs border border-zinc-200 dark:border-zinc-700 rounded-[2px] bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 font-mono"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveGphostKey}
              className="px-3.5 py-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white rounded-[2px] transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              {keySavedToast ? 'Saved!' : 'Save Key'}
            </button>
            <button
              type="button"
              disabled={testingKey}
              onClick={handleTestGphostKey}
              className="px-3 py-1.5 text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-[2px] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            >
              {testingKey ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
        </div>

        {testResult && (
          <div className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950/60 p-2 rounded-[2px] border border-zinc-200 dark:border-zinc-800">
            {testResult}
          </div>
        )}
      </div>

      {/* 5. About the Developer & System Permissions */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-[2px] p-5 bg-white dark:bg-zinc-900 flex flex-col gap-4 shadow-2xs">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                DEVELOPER &amp; INTEGRITY
              </span>
              <span className="px-1.5 py-0.2 rounded-[2px] text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                Permissions Granted
              </span>
            </div>
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
              Gaurav Personal Notes &bull; Built by Gaurav Patil
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed max-w-xl">
              Local-first personal notes application designed for zero latency, offline privacy, native Windows DPAPI encryption, and background cloud sync.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openExternalUrl('https://gauravpatil.site')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-[2px] transition-colors cursor-pointer"
              title="Visit Gaurav Patil's developer portfolio"
            >
              <span>Portfolio</span>
              <ExternalLink className="w-3 h-3 text-zinc-400" />
            </button>
            <button
              type="button"
              onClick={() => openExternalUrl('https://gpnotes.eu.cc')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-[2px] transition-colors cursor-pointer"
              title="Visit official website"
            >
              <span>Website</span>
              <ExternalLink className="w-3 h-3 text-zinc-400" />
            </button>
            <button
              type="button"
              onClick={() => openExternalUrl('https://github.com/AspiringWebGaurav')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-[2px] transition-colors cursor-pointer"
              title="View GitHub profile"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Automatic Permissions Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px]">
          <div className="flex items-center gap-2 p-2 rounded-[2px] bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800/80">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="text-zinc-700 dark:text-zinc-300 font-medium">Local SQLite Storage</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-[2px] bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800/80">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="text-zinc-700 dark:text-zinc-300 font-medium">DPAPI Cryptography</span>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-[2px] bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800/80">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="text-zinc-700 dark:text-zinc-300 font-medium">Startup Autostart</span>
          </div>
        </div>
      </div>

      {/* Danger Zone: App Uninstallation */}
      <div
        ref={uninstallSectionRef}
        className="border border-zinc-200 dark:border-zinc-800 rounded-[2px] p-5 bg-white dark:bg-zinc-900 flex flex-col gap-4 shadow-2xs"
      >
        <div>
          <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            Application Maintenance
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Safely remove Gaurav Personal Notes from this Windows system using the official uninstaller.
          </p>
        </div>

        {uninstallNotice && (
          <div className="p-3 border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 rounded-[2px]">
            {uninstallNotice}
          </div>
        )}

        {uninstallError && (
          <div className="p-3 border border-red-300 dark:border-red-800 bg-red-50/60 dark:bg-red-950/40 rounded-[2px] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="text-xs text-red-900 dark:text-red-200">
              <span className="font-semibold">Notice:</span> {uninstallError}
            </div>
          </div>
        )}

        {isUninstallConfirmOpen ? (
          <div
            ref={confirmBoxRef}
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                handleCancelUninstall();
              }
            }}
            className="p-3 border border-red-300 dark:border-red-800 bg-red-50/60 dark:bg-red-950/40 rounded-[2px] flex flex-col gap-3 outline-none transition-all"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs text-red-900 dark:text-red-200">
                <span className="font-semibold">Confirm Uninstallation:</span> This will close GPN and execute the Windows uninstaller to remove the desktop application.
              </div>
            </div>
            <div className="flex items-center gap-2 self-end">
              <button
                ref={cancelBtnRef}
                type="button"
                onClick={handleCancelUninstall}
                className="px-3 py-1.5 text-xs font-medium border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-[2px] transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-zinc-400"
              >
                Cancel
              </button>
              <button
                ref={confirmUninstallBtnRef}
                type="button"
                disabled={isLaunchingUninstall}
                onClick={handleLaunchUninstall}
                className="px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-[2px] transition-colors cursor-pointer disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {isLaunchingUninstall ? 'Starting...' : 'Yes, Uninstall App'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              ref={uninstallTriggerRef}
              type="button"
              onClick={handleOpenUninstallConfirm}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-200 dark:border-red-900/60 hover:bg-red-50/50 dark:hover:bg-red-950/30 rounded-[2px] transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-red-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Uninstall App</span>
            </button>
            <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
              Runs uninstall.exe with Windows permissions
            </span>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
};
