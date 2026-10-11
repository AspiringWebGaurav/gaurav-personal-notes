import React from 'react';
import { X, Check, Loader2, RefreshCw } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';

export interface GpnWindowHeaderProps {
  onCloseToTray?: () => void;
  isCheckingUpdates?: boolean;
  isSyncing?: boolean;
  updateToast?: {
    title: string;
    description: string;
  } | null;
  onDismissUpdateToast?: () => void;
}

export const GpnWindowHeader: React.FC<GpnWindowHeaderProps> = ({
  onCloseToTray,
  isCheckingUpdates = false,
  isSyncing = false,
  updateToast = null,
  onDismissUpdateToast,
}) => {
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

  return (
    <div
      data-tauri-drag-region
      className="relative h-8 w-full flex items-center justify-between px-3 select-none bg-white dark:bg-zinc-950 z-40 shrink-0 transition-colors border-b border-zinc-100 dark:border-zinc-900/40"
    >
      {/* Left spacer for symmetry with close button */}
      <div className="w-8 h-6" data-tauri-drag-region />

      {/* Dynamic Update Status Pill - Centered in Top Navbar fitting height */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-auto"
        data-tauri-drag-region="false"
      >
        {isCheckingUpdates ? (
          <div
            data-tauri-drag-region="false"
            className="flex items-center gap-1.5 px-2.5 h-6 rounded-[2px] bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/80 text-[11px] font-mono text-zinc-600 dark:text-zinc-300 shadow-2xs select-none animate-in fade-in duration-150"
          >
            <Loader2 className="w-3 h-3 animate-spin text-zinc-500 dark:text-zinc-400 shrink-0" />
            <span>Checking updates...</span>
          </div>
        ) : updateToast ? (
          <div
            data-tauri-drag-region="false"
            className="flex items-center gap-2 px-2.5 h-6 rounded-[2px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300/90 dark:border-emerald-800/80 text-[11px] font-mono text-emerald-800 dark:text-emerald-300 shadow-2xs select-none animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="w-3.5 h-3.5 rounded-[2px] bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-400/80 dark:border-emerald-700 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
              <Check className="w-2.5 h-2.5 stroke-[3]" />
            </div>
            <span className="font-semibold text-emerald-900 dark:text-emerald-100">
              {updateToast.title}
            </span>
            <span className="text-emerald-400 dark:text-emerald-600 font-sans">•</span>
            <span className="text-emerald-700 dark:text-emerald-300 font-normal">
              {updateToast.description}
            </span>
            {onDismissUpdateToast && (
              <button
                type="button"
                data-tauri-drag-region="false"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismissUpdateToast();
                }}
                className="ml-1 text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-100 p-0.5 rounded cursor-pointer transition-colors"
                title="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
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

