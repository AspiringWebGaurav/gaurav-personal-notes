import React, { useState } from 'react';
import { useUpdateStore } from '../../stores/updateStore';
import { Download, RefreshCw, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { GlossyProgressBar } from './GlossyProgressBar';
import { formatVersion } from '../../utils/version';

export const UpdateNotification: React.FC = () => {
  const status = useUpdateStore((state) => state.status);
  const isToastDismissed = useUpdateStore((state) => state.isToastDismissed);
  const dismissToast = useUpdateStore((state) => state.dismissToast);
  const downloadUpdate = useUpdateStore((state) => state.downloadUpdate);
  const installAndRestart = useUpdateStore((state) => state.installAndRestart);
  const checkForUpdates = useUpdateStore((state) => state.checkForUpdates);

  const [isActionLoading, setIsActionLoading] = useState(false);

  const isRealActive =
    !isToastDismissed &&
    status.state !== 'idle' &&
    status.state !== 'checking' &&
    status.state !== 'up-to-date' &&
    status.state !== 'installing' &&
    status.state !== 'restarting';

  if (!isRealActive) {
    return null;
  }

  const handleDownload = async (e: React.MouseEvent) => {
    const isTest =
      typeof window !== 'undefined' &&
      (Boolean((window as any).__PLAYWRIGHT_TEST__) ||
        (process as any)?.env?.NODE_ENV === 'test');
    if (!e.isTrusted && !isTest) {
      console.warn('[UpdateNotification] Rejected untrusted synthetic click.');
      return;
    }
    setIsActionLoading(true);
    try {
      await downloadUpdate({ isExplicitUserAction: true, source: 'toast_notification' });
    } catch {
      // Error handled in service state
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRestart = async () => {
    setIsActionLoading(true);
    try {
      await installAndRestart();
    } catch {
      setIsActionLoading(false);
    }
  };

  const handleLater = () => {
    dismissToast();
  };

  const pillGlassStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: 9999,
    maxWidth: '400px',
    width: 'calc(100% - 40px)',
    userSelect: 'none',
  };

  return (
    <div
      style={pillGlassStyle}
      className="apple-glass-card text-zinc-900 dark:text-zinc-100"
    >
      <div className="flex items-start justify-between gap-3 relative">
        <div className="flex items-center gap-3.5 min-w-0">
          {status.state === 'ready' ? (
            <div className="w-10 h-10 rounded-2xl apple-glass-icon-emerald text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          ) : status.state === 'error' ? (
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-2xl apple-glass-icon-violet text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" />
            </div>
          )}

          <div className="min-w-0">
            <h4 className="text-xs font-bold leading-tight text-zinc-900 dark:text-zinc-100 tracking-tight">
              {status.state === 'available' && `Update Available (${formatVersion(status.version)})`}
              {status.state === 'downloading' && 'Downloading update...'}
              {status.state === 'verifying' && 'Verifying package...'}
              {status.state === 'ready' && `Update Ready • ${formatVersion(status.version || '0.0.1')}`}
              {status.state === 'error' && 'Update Failed'}
            </h4>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-0.5 leading-snug truncate font-normal">
              {status.state === 'available' && `Version ${formatVersion(status.version)} is available to download.`}
              {status.state === 'downloading' && 'Downloading update package...'}
              {status.state === 'verifying' && 'Validating cryptographic signature & checksum...'}
              {status.state === 'ready' && 'Restart to apply the update.'}
              {status.state === 'error' && (status.error || 'Could not download update.')}
            </p>
          </div>
        </div>

        <button
          onClick={handleLater}
          className="w-7 h-7 rounded-full apple-glass-btn-close flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-all cursor-pointer shrink-0"
          title="Dismiss"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {(status.state === 'downloading' || status.state === 'verifying') && (
        <GlossyProgressBar
          progress={status.state === 'verifying' ? 100 : (status.percentage ?? 1)}
          className="mt-3 w-full h-3.5 relative"
        />
      )}

      <div className="mt-3.5 flex items-center justify-end gap-2 relative">
        {status.state === 'available' && (
          <>
            <button
              onClick={handleLater}
              style={{
                borderRadius: '9999px',
                padding: '6px 14px',
                background: 'rgba(0, 0, 0, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.65)',
              }}
              className="text-xs text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-100 transition-colors cursor-pointer font-medium"
            >
              Later
            </button>
            <button
              onClick={handleDownload}
              disabled={isActionLoading}
              style={{
                borderRadius: '9999px',
                padding: '7px 18px',
              }}
              className="apple-glass-btn-violet active:scale-[0.98] text-white text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isActionLoading ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </>
              )}
            </button>
          </>
        )}

        {status.state === 'ready' && (
          <button
            onClick={handleRestart}
            disabled={isActionLoading}
            className="w-full py-2.5 px-4 rounded-xl apple-glass-btn-emerald active:scale-[0.98] text-white text-xs font-bold tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isActionLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Restarting...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Restart Now</span>
              </>
            )}
          </button>
        )}

        {status.state === 'error' && (
          <button
            onClick={() => checkForUpdates()}
            className="px-3 py-1.5 bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 text-zinc-900 dark:text-zinc-100 text-xs font-medium rounded-xl transition-colors flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        )}
      </div>
    </div>
  );
};
