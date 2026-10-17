import React from 'react';
import { X, Check, Loader2, RefreshCw, Download, AlertCircle } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { useUpdateStore } from '../../stores/updateStore';
import { APP_VERSION } from '../../services/updateService';
import { formatVersion } from '../../utils/version';
import { GlossyProgressBar } from './GlossyProgressBar';

export interface GpnWindowHeaderProps {
  onCloseToTray?: () => void;
  isSyncing?: boolean;
}

export const GpnWindowHeader: React.FC<GpnWindowHeaderProps> = ({
  onCloseToTray,
  isSyncing = false,
}) => {
  const status = useUpdateStore((state) => state.status);
  const isToastDismissed = useUpdateStore((state) => state.isToastDismissed);
  const isHeaderDismissed = useUpdateStore((state) => state.isHeaderDismissed);
  const dismissHeader = useUpdateStore((state) => state.dismissHeader);
  const downloadUpdate = useUpdateStore((state) => state.downloadUpdate);
  const installAndRestart = useUpdateStore((state) => state.installAndRestart);

  const handleClose = async () => {
    if (onCloseToTray) {
      onCloseToTray();
      return;
    }

    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    if (isTauri) {
      try {
        await invoke('cmd_minimize_to_background');
      } catch {
        try {
          await getCurrentWindow().hide();
        } catch (err) {
          console.error('Failed to hide window to tray:', err);
        }
      }
    }
  };

  // Center header pill shows when an update is available (especially when user clicked "Later" on bottom toast)
  const isAvailablePillActive = status.state === 'available' && !isHeaderDismissed && isToastDismissed;

  const isUpdatingActive =
    isAvailablePillActive ||
    status.state === 'downloading' ||
    status.state === 'verifying' ||
    status.state === 'ready' ||
    status.state === 'installing' ||
    status.state === 'restarting' ||
    (status.state === 'checking' && !!status.isManualCheck) ||
    (status.state === 'up-to-date' && !!status.isManualCheck) ||
    status.state === 'error';


  return (
    <div
      data-tauri-drag-region
      className="relative h-8 w-full flex items-center justify-between px-3 select-none bg-white dark:bg-zinc-950 z-40 shrink-0 transition-colors border-b border-zinc-100 dark:border-zinc-900/40"
    >
      {/* Left spacer for symmetry with close button */}
      <div className="w-8 h-6" data-tauri-drag-region />

      {/* Dynamic Update Status Pill - Only visible when next version is available, installing, or on manual check */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-auto"
        data-tauri-drag-region="false"
      >
        {isUpdatingActive ? (
          status.state === 'checking' ? (
            <div
              data-tauri-drag-region="false"
              className="flex items-center gap-2 px-2.5 h-6 rounded-[2px] bg-zinc-100 dark:bg-zinc-850 border border-zinc-200/80 dark:border-zinc-800/80 text-[11px] font-mono text-zinc-700 dark:text-zinc-300 shadow-2xs select-none animate-in fade-in duration-150"
            >
              <RefreshCw className="w-3 h-3 animate-spin text-zinc-500 dark:text-zinc-400 shrink-0" />
              <span>Checking updates...</span>
            </div>
          ) : status.state === 'up-to-date' ? (
            <button
              type="button"
              data-tauri-drag-region="false"
              onClick={() => useUpdateStore.getState().openPatchNotes()}
              title="Click to view patch notes"
              className="flex items-center gap-1.5 px-2.5 h-6 rounded-[2px] bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300/80 dark:border-emerald-800/80 text-[11px] font-mono text-emerald-800 dark:text-emerald-300 shadow-2xs select-none animate-in fade-in duration-150 cursor-pointer transition-colors"
            >
              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
              <span>Up to date • {formatVersion(status.currentVersion || APP_VERSION)}</span>
            </button>
          ) : status.state === 'available' ? (
            <div
              data-tauri-drag-region="false"
              className="flex items-center gap-2 px-2.5 h-6 rounded-[2px] bg-violet-50 dark:bg-violet-950/40 border border-violet-300/90 dark:border-violet-800/80 text-[11px] font-mono text-violet-800 dark:text-violet-300 shadow-2xs select-none animate-in fade-in zoom-in-95 duration-150"
            >
              <span className="font-semibold text-violet-900 dark:text-violet-100">
                {formatVersion(status.version)} Available
              </span>
              <button
                type="button"
                data-tauri-drag-region="false"
                onClick={(e) => {
                  const isTest =
                    typeof window !== 'undefined' &&
                    (Boolean((window as any).__PLAYWRIGHT_TEST__) ||
                      (process as any)?.env?.NODE_ENV === 'test');
                  if (!e.isTrusted && !isTest) return;
                  downloadUpdate({ isExplicitUserAction: true, source: 'header_pill' });
                }}
                className="ml-1 px-2 h-4 rounded-[2px] bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all shadow-xs"
              >
                <Download className="w-2.5 h-2.5" />
                <span>Download</span>
              </button>
              <button
                type="button"
                data-tauri-drag-region="false"
                onClick={dismissHeader}
                className="text-violet-500 hover:text-violet-900 dark:text-violet-400 dark:hover:text-violet-100 p-0.5 rounded cursor-pointer transition-colors"
                title="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : status.state === 'downloading' ? (
            <div
              data-tauri-drag-region="false"
              className="flex items-center gap-2 px-2.5 h-6 rounded-[2px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300/90 dark:border-emerald-800/80 text-[11px] font-mono text-emerald-800 dark:text-emerald-300 shadow-2xs select-none animate-in fade-in duration-150"
            >
              <Loader2 className="w-3 h-3 animate-spin text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Downloading {formatVersion(status.version)}...</span>
              <GlossyProgressBar progress={status.percentage ?? 1} className="w-16 h-2.5 shrink-0" />
            </div>
          ) : status.state === 'verifying' ? (
            <div
              data-tauri-drag-region="false"
              className="flex items-center gap-2 px-2.5 h-6 rounded-[2px] bg-amber-50 dark:bg-amber-950/40 border border-amber-300/90 dark:border-amber-800/80 text-[11px] font-mono text-amber-800 dark:text-amber-300 shadow-2xs select-none animate-in fade-in duration-150"
            >
              <RefreshCw className="w-3 h-3 animate-spin text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Verifying {formatVersion(status.version)}...</span>
              <GlossyProgressBar progress={100} className="w-16 h-2.5 shrink-0" />
            </div>
          ) : status.state === 'ready' ? (
            <div
              data-tauri-drag-region="false"
              className="flex items-center gap-2 px-2.5 h-6 rounded-[2px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300/90 dark:border-emerald-800/80 text-[11px] font-mono text-emerald-800 dark:text-emerald-300 shadow-2xs select-none animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="w-3.5 h-3.5 rounded-[2px] bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-400/80 dark:border-emerald-700 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
              <span className="font-semibold text-emerald-900 dark:text-emerald-100">
                {formatVersion(status.version)} Ready
              </span>
              <button
                type="button"
                data-tauri-drag-region="false"
                onClick={() => installAndRestart()}
                className="ml-1 px-2 h-4 rounded-[2px] bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all shadow-xs"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>Restart</span>
              </button>
            </div>
          ) : status.state === 'installing' ? (
            <div
              data-tauri-drag-region="false"
              className="flex items-center gap-2 px-2.5 h-6 rounded-[2px] bg-violet-50 dark:bg-violet-950/40 border border-violet-300/90 dark:border-violet-800/80 text-[11px] font-mono text-violet-800 dark:text-violet-300 shadow-2xs select-none animate-in fade-in duration-150"
            >
              <Loader2 className="w-3 h-3 animate-spin text-violet-600 dark:text-violet-400 shrink-0" />
              <span>Installing {formatVersion(status.version)}...</span>
            </div>
          ) : status.state === 'restarting' ? (
            <div
              data-tauri-drag-region="false"
              className="flex items-center gap-2 px-2.5 h-6 rounded-[2px] bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300/90 dark:border-indigo-800/80 text-[11px] font-mono text-indigo-800 dark:text-indigo-300 shadow-2xs select-none animate-in fade-in duration-150"
            >
              <RefreshCw className="w-3 h-3 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Restarting app...</span>
            </div>
          ) : status.state === 'error' ? (
            <div
              data-tauri-drag-region="false"
              className="flex items-center gap-2 px-2.5 h-6 rounded-[2px] bg-rose-50 dark:bg-rose-950/40 border border-rose-300/90 dark:border-rose-800/80 text-[11px] font-mono text-rose-800 dark:text-rose-300 shadow-2xs select-none animate-in fade-in duration-150"
            >
              <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>Update failed</span>
              <button
                type="button"
                data-tauri-drag-region="false"
                onClick={() => useUpdateStore.getState().checkForUpdates()}
                className="ml-1 px-1.5 h-4 rounded-[2px] bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all shadow-xs"
              >
                <span>Retry</span>
              </button>
            </div>
          ) : null
        ) : isSyncing ? (
          <div
            data-tauri-drag-region="false"
            className="flex items-center gap-1.5 px-2.5 h-6 rounded-[2px] bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 dark:border-emerald-700/60 text-[11px] font-mono text-emerald-700 dark:text-[#00ff87] shadow-2xs select-none animate-in fade-in duration-150"
          >
            <RefreshCw className="w-3 h-3 animate-spin text-emerald-500 dark:text-[#76b900] shrink-0" />
            <span className="font-semibold">Syncing with cloud...</span>
          </div>
        ) : null}
      </div>

      {/* Right Window Control: Just Close button */}
      <div className="flex items-center" data-tauri-drag-region="false">
        <button
          type="button"
          onClick={handleClose}
          title="Close"
          className="group relative w-8 h-6 flex items-center justify-center rounded-[2px] text-zinc-400 dark:text-zinc-500 hover:text-white dark:hover:text-white hover:bg-[#e81123] dark:hover:bg-[#e81123] active:bg-[#c42b1c] dark:active:bg-[#c42b1c] transition-colors duration-100 cursor-pointer"
        >
          <X className="w-3.5 h-3.5 stroke-[2.2]" />
        </button>
      </div>
    </div>
  );
};

export default GpnWindowHeader;
