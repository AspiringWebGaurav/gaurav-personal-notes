import React, { useState, useEffect } from 'react';
import { updateService, UpdateStatus } from '../../services/updateService';
import { Download, RefreshCw, X, AlertCircle, CheckCircle2 } from 'lucide-react';

export const UpdateNotification: React.FC = () => {
  const [status, setStatus] = useState<UpdateStatus>(updateService.getStatus());
  const [isDismissed, setIsDismissed] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = updateService.subscribe((newStatus) => {
      setStatus(newStatus);
      if (newStatus.state === 'available' || newStatus.state === 'ready') {
        setIsDismissed(false);
      }
    });

    // Check for updates on startup
    const timer = setTimeout(() => {
      updateService.checkForUpdates().catch(() => {});
    }, 4000);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  if (isDismissed) return null;
  if (status.state === 'idle' || status.state === 'checking' || status.state === 'up-to-date') {
    return null;
  }

  const handleDownload = async () => {
    setIsActionLoading(true);
    try {
      await updateService.downloadUpdate();
    } catch {
      // Error handled in service state
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRestart = async () => {
    setIsActionLoading(true);
    try {
      await updateService.installAndRestart();
    } catch {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full bg-background/95 backdrop-blur-md border border-border/80 shadow-lg rounded-xl p-3.5 text-foreground animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {status.state === 'ready' ? (
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          ) : status.state === 'error' ? (
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <Download className="w-4 h-4" />
            </div>
          )}

          <div className="min-w-0">
            <h4 className="text-xs font-semibold leading-tight">
              {status.state === 'available' && `Update Available (${status.version})`}
              {status.state === 'downloading' && 'Downloading update...'}
              {status.state === 'ready' && 'Update Ready'}
              {status.state === 'error' && 'Update Failed'}
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug truncate">
              {status.state === 'available' && (status.notes || 'A new version is available on GPHost.')}
              {status.state === 'downloading' && `${status.percentage || 0}% downloaded`}
              {status.state === 'ready' && 'Restart to apply the update.'}
              {status.state === 'error' && (status.error || 'Could not download update.')}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsDismissed(true)}
          className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
          title="Dismiss"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {status.state === 'downloading' && (
        <div className="mt-2.5 w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-violet-600 h-1.5 transition-all duration-200"
            style={{ width: `${status.percentage || 0}%` }}
          />
        </div>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        {status.state === 'available' && (
          <>
            <button
              onClick={() => setIsDismissed(true)}
              className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Later
            </button>
            <button
              onClick={handleDownload}
              disabled={isActionLoading}
              className="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {isActionLoading ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <Download className="w-3 h-3" />
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
            className="w-full px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
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
            onClick={() => updateService.checkForUpdates()}
            className="px-3 py-1 bg-muted hover:bg-muted/80 text-foreground text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        )}
      </div>
    </div>
  );
};
