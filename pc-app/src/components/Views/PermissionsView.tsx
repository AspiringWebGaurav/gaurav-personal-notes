import React, { useState, useEffect } from 'react';
import { SegmentedToggle } from '../GpnLayout/SegmentedToggle';
import { Shield, Keyboard, Search, Power, Zap, CloudUpload, Trash2, Settings, AlertTriangle, FolderOpen } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { gphostService } from '../../services/gphostService';

export const PermissionsView: React.FC = () => {
  const [autostartEnabled, setAutostartEnabled] = useState(false);
  const [autostartLoading, setAutostartLoading] = useState(false);
  const [isUninstallConfirmOpen, setIsUninstallConfirmOpen] = useState(false);
  const [isLaunchingUninstall, setIsLaunchingUninstall] = useState(false);
  const [uninstallError, setUninstallError] = useState<string | null>(null);
  const [uninstallNotice, setUninstallNotice] = useState<string | null>(null);
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

  const handleSaveGphostKey = () => {
    gphostService.setApiKey(gphostApiKey);
    setKeySavedToast(true);
    setTimeout(() => setKeySavedToast(false), 2000);
  };

  const handleTestGphostKey = async () => {
    setTestingKey(true);
    setTestResult(null);
    try {
      // Create a tiny test ping
      const pingBlob = new Blob(['GPN_PING'], { type: 'text/plain' });
      await gphostService.uploadMedia(pingBlob, 'gpn_connection_test.txt');
      setTestResult('Verified: GPHost Cloud is Connected!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult(`Connection test notice: ${msg.slice(0, 50)}`);
    } finally {
      setTestingKey(false);
      setTimeout(() => setTestResult(null), 4000);
    }
  };

  const handleSetIdleOptimization = (enabled: boolean) => {
    setIdleOptimization(enabled);
    try {
      localStorage.setItem('gpn_idle_opt', String(enabled));
    } catch {}
  };

  // Check autostart status from Tauri
  useEffect(() => {
    const checkAutostart = async () => {
      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
      if (isTauri) {
        try {
          const enabled = await invoke<boolean>('cmd_get_autostart_status');
          setAutostartEnabled(enabled);
        } catch (err) {
          console.warn('Could not query autostart status:', err);
        }
      }
    };

    checkAutostart();
  }, []);

  const handleToggleAutostart = async (enable: boolean) => {
    setAutostartLoading(true);
    try {
      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
      if (isTauri) {
        try {
          const newState = await invoke<boolean>('cmd_set_autostart', { enabled: enable });
          setAutostartEnabled(newState);
        } catch (err) {
          console.error('Failed to change autostart setting:', err);
        }
      } else {
        setAutostartEnabled(enable);
      }
    } finally {
      setAutostartLoading(false);
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

  return (
    <div className="flex-1 h-full overflow-y-auto bg-white dark:bg-zinc-950 p-8 flex flex-col gap-6 select-none transition-colors">
      {/* Header */}
      <div>
        <span className="text-[11px] font-mono tracking-[0.25em] font-semibold text-zinc-400 dark:text-zinc-500 uppercase">
          SYSTEM ACCESS
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
          Permissions.
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Desktop permissions, global hotkeys, startup preferences, and app management.
        </p>
      </div>

      {/* Permissions Box */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-[2px] divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
        {/* Row 1: Hardware Encryption */}
        <div className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[2px] border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Hardware Encryption (Windows DPAPI)
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Protects local vault encryption key using native Windows machine cryptography.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
            ACTIVE
          </span>
        </div>

        {/* Row 2: Gaurav Personal Notes Capture */}
        <div className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[2px] border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Gaurav Personal Notes Capture (Ctrl+Shift+N / C)
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Summon floating capture scratchpad from anywhere in Windows even when app is closed in background.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
            GRANTED
          </span>
        </div>

        {/* Row 3: FTS5 Search */}
        <div className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[2px] border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                FTS5 Full-Text Search Command Palette (Ctrl+K)
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Instant Porter unicode61 ranked search across all encrypted and local notes.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
            GRANTED
          </span>
        </div>

        {/* Row 4: Launch at Startup */}
        <div className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[2px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0">
              <Power className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Launch at startup
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Starts GPN in the background at Windows sign-in.
              </p>
            </div>
          </div>
          <SegmentedToggle
            enabled={autostartEnabled}
            onChange={handleToggleAutostart}
            disabled={autostartLoading}
          />
        </div>

        {/* Row 5: Idle Optimization */}
        <div className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[2px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Idle background optimization
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Suspends UI render loop and frees working set RAM when minimized to tray.
              </p>
            </div>
          </div>
          <SegmentedToggle
            enabled={idleOptimization}
            onChange={(val) => handleSetIdleOptimization(val)}
          />
        </div>
      </div>

      {/* Cloud Media Storage (GPHost Integration) */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-[2px] p-5 bg-white dark:bg-zinc-900 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[2px] border border-sky-200 dark:border-sky-800 bg-sky-50/40 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <CloudUpload className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>GPHost Media Cloud (Zero Firebase Storage Mode)</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 rounded-[2px]">
                  CONNECTED
                </span>
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Stores attached images, screenshots, and videos on your GPHost service. Notes sync through Firestore with zero Firebase Storage costs or quotas.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
              API KEY (BEARER TOKEN)
            </label>
            {testResult && (
              <span className="text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400">
                {testResult}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={gphostApiKey}
              onChange={(e) => setGphostApiKey(e.target.value)}
              placeholder="gp_live_..."
              className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[2px] px-3 py-1.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
            />
            <button
              type="button"
              disabled={testingKey}
              onClick={handleTestGphostKey}
              className="px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-mono font-medium rounded-[2px] transition-colors cursor-pointer disabled:opacity-50"
            >
              {testingKey ? 'TESTING...' : 'TEST'}
            </button>
            <button
              type="button"
              onClick={handleSaveGphostKey}
              className="px-3 py-1.5 bg-black dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-mono font-semibold rounded-[2px] hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors cursor-pointer"
            >
              {keySavedToast ? 'SAVED!' : 'UPDATE KEY'}
            </button>
          </div>
          <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
            Endpoint: <code className="text-zinc-600 dark:text-zinc-300">https://gphost.eu.cc/api/v1/upload</code> • Direct CDN hotlinks with permanent storage
          </span>
        </div>
      </div>

      {/* App Management & Uninstall Section */}
      <div className="border border-red-200/70 dark:border-red-900/50 rounded-[2px] p-5 bg-white dark:bg-zinc-900 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[2px] border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>Uninstall Application</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 rounded-[2px]">
                  WINDOWS
                </span>
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Remove Gaurav Personal Notes from this PC or manage system application settings.
              </p>
            </div>
          </div>
        </div>

        {uninstallNotice && (
          <div className="p-3 border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-[2px] text-xs text-emerald-800 dark:text-emerald-300 font-medium">
            {uninstallNotice}
          </div>
        )}

        {uninstallError && (
          <div className="p-3 border border-red-300 dark:border-red-800 bg-red-50/60 dark:bg-red-950/40 rounded-[2px] flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs text-red-900 dark:text-red-200">
                <span className="font-semibold">Notice:</span> {uninstallError}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleOpenFolder}
                className="px-2.5 py-1 text-xs font-medium border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-[2px] transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Open App Folder</span>
              </button>
              <button
                type="button"
                onClick={handleOpenWindowsSettings}
                className="px-2.5 py-1 text-xs font-medium border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-[2px] transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Open Windows Settings</span>
              </button>
            </div>
          </div>
        )}

        {isUninstallConfirmOpen ? (
          <div className="p-3 border border-red-300 dark:border-red-800 bg-red-50/60 dark:bg-red-950/40 rounded-[2px] flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs text-red-900 dark:text-red-200">
                <span className="font-semibold">Confirm Uninstallation:</span> This will close the app and launch the Windows uninstaller to remove Gaurav Personal Notes.
              </div>
            </div>
            <div className="flex items-center gap-2 self-end">
              <button
                type="button"
                onClick={() => {
                  setIsUninstallConfirmOpen(false);
                  setUninstallError(null);
                }}
                className="px-3 py-1.5 text-xs font-medium border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-[2px] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isLaunchingUninstall}
                onClick={handleLaunchUninstall}
                className="px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-[2px] transition-colors cursor-pointer disabled:opacity-50"
              >
                {isLaunchingUninstall ? 'Starting...' : 'Yes, Uninstall App'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setIsUninstallConfirmOpen(true);
                setUninstallError(null);
                setUninstallNotice(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-200 dark:border-red-900/60 hover:bg-red-50/50 dark:hover:bg-red-950/30 rounded-[2px] transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Uninstall App</span>
            </button>
            <button
              type="button"
              onClick={handleOpenFolder}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-[2px] transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Open App Folder</span>
            </button>
            <button
              type="button"
              onClick={handleOpenWindowsSettings}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-[2px] transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Windows App Settings</span>
            </button>
            <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 ml-auto">
              Runs uninstall.exe with Windows permissions
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

