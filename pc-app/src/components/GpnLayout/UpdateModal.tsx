import React, { useState, useEffect } from 'react';
import { useUpdateStore } from '../../stores/updateStore';
import { APP_VERSION } from '../../services/updateService';
import { formatVersion, cleanVersion } from '../../utils/version';
import { getDynamicPatchNotes, DynamicPatchNotes } from '../../data/patchNotes';
import {
  Sparkles,
  CheckCircle2,
  ArrowRight,
  X,
  Layers,
  Calendar,
} from 'lucide-react';

interface RecentUpdateInfo {
  targetVersion: string;
  previousVersion?: string;
  notes?: string;
  timestamp: number;
}

export const UpdateModal: React.FC = () => {
  const status = useUpdateStore((state) => state.status);
  const isPatchNotesOpen = useUpdateStore((state) => state.isPatchNotesOpen);
  const activePatchNotesVersion = useUpdateStore((state) => state.activePatchNotesVersion);
  const closePatchNotes = useUpdateStore((state) => state.closePatchNotes);
  const [successInfo, setSuccessInfo] = useState<RecentUpdateInfo | null>(null);

  // Check on boot if the application recently completed an update restart
  useEffect(() => {
    const checkUpdateCelebration = async () => {
      try {
        const raw = localStorage.getItem('gpn_recently_updated');
        if (!raw) return;
        const parsed: RecentUpdateInfo = JSON.parse(raw);
        if (!parsed || !parsed.targetVersion) return;

        const isRecent = Date.now() - parsed.timestamp < 30 * 60 * 1000;
        if (!isRecent) {
          localStorage.removeItem('gpn_recently_updated');
          return;
        }

        // Query native runtime version if available
        let resolvedVer = status.currentVersion || APP_VERSION;
        const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
        if (isTauri) {
          try {
            const { getVersion } = await import('@tauri-apps/api/app');
            const v = await getVersion();
            if (v) resolvedVer = v;
          } catch {}
        }

        const current = cleanVersion(resolvedVer);
        const target = cleanVersion(parsed.targetVersion);

        // If version matches or running in updated binary, trigger celebration modal
        if (current === target || (isTauri && current !== '0.0.0')) {
          setSuccessInfo(parsed);
          localStorage.removeItem('gpn_recently_updated');
        }
      } catch {}
    };

    checkUpdateCelebration();
  }, [status.currentVersion]);

  // Keyboard shortcut to dismiss modal with Escape or Enter
  const isModalVisible = !!successInfo || isPatchNotesOpen;
  useEffect(() => {
    if (!isModalVisible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        setSuccessInfo(null);
        closePatchNotes();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isModalVisible, closePatchNotes]);

  // Listen for manual trigger or shortcut (Ctrl+Shift+U) to easily preview anytime
  useEffect(() => {
    const trigger = () => {
      setSuccessInfo({
        targetVersion: '0.0.1',
        previousVersion: '0.0.0',
        notes: '• Apple Liquid Glass design with optical Gaussian blur\n• Specular edge rim light and ambient top reflection sheen\n• Translucent frosted highlight cards with micro-borders\n• Pure silent atomic shadow swap lifecycle',
        timestamp: Date.now(),
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        trigger();
      }
    };

    window.addEventListener('gpn-trigger-update-preview', trigger);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('gpn-trigger-update-preview', trigger);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleClose = () => {
    setSuccessInfo(null);
    closePatchNotes();
  };

  const handleViewMoreInSettings = () => {
    handleClose();
    window.dispatchEvent(new CustomEvent('gpn-select-tab', { detail: 'settings' }));
    window.dispatchEvent(new CustomEvent('gpn-open-settings-tab', { detail: 'patch-notes' }));
  };

  // DYNAMIC PATCH NOTES MODAL (After restart or on-demand via header / settings)
  if (isModalVisible) {
    const displayVersion =
      activePatchNotesVersion ||
      successInfo?.targetVersion ||
      status.currentVersion ||
      APP_VERSION;
    const previousVersion = successInfo?.previousVersion;
    const patchNotes: DynamicPatchNotes = getDynamicPatchNotes(
      displayVersion,
      successInfo?.notes || status.notes
    );

    return (
      <div className="fixed inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
        <div
          onClick={(e) => e.stopPropagation()}
          className="apple-glass-card w-full max-w-[480px] rounded-3xl p-6 relative animate-in zoom-in-95 duration-200 flex flex-col text-left overflow-hidden"
        >
          {/* Apple glass top specular sheen */}
          <div className="apple-glass-sheen" />

          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 w-7 h-7 rounded-full apple-glass-btn-close flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-all cursor-pointer z-10"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Header section with sparkles badge */}
          <div className="flex items-center gap-2 mb-2 relative">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 dark:border-emerald-500/30 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 tracking-wider uppercase backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-none">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              <span>What's New</span>
            </div>

            {previousVersion && previousVersion !== displayVersion && (
              <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 backdrop-blur-xs">
                {formatVersion(previousVersion)} → {formatVersion(displayVersion)}
              </span>
            )}
          </div>

          {/* Main Title */}
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight relative">
            {successInfo ? `Updated to ${formatVersion(displayVersion)}` : `Release Notes • ${formatVersion(displayVersion)}`}
          </h3>

          {/* Dynamic Release Subtitle */}
          <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300 mt-1 pb-3 relative">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {patchNotes.title}
            </span>
            {patchNotes.releaseDate && (
              <span className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 shrink-0 font-medium">
                <Calendar className="w-3 h-3" />
                {patchNotes.releaseDate}
              </span>
            )}
          </div>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-300/50 dark:via-zinc-700/50 to-transparent relative" />

          {/* Dynamic Highlights List (Embedded in binary) */}
          {(() => {
            const maxModalHighlights = 3;
            const isLongList = patchNotes.highlights.length > maxModalHighlights;
            const visibleHighlights = isLongList
              ? patchNotes.highlights.slice(0, maxModalHighlights)
              : patchNotes.highlights;

            return (
              <div className="mt-4 flex flex-col gap-2 relative">
                <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {visibleHighlights.map((highlight, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-white/40 dark:bg-white/[0.04] backdrop-blur-md border border-white/60 dark:border-white/[0.08] shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.05)] flex items-start gap-3 transition-all hover:bg-white/55 dark:hover:bg-white/[0.07]"
                    >
                      <div className="w-4 h-4 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 shadow-2xs">
                        <CheckCircle2 className="w-3 h-3" />
                      </div>
                      <span className="text-xs text-zinc-800 dark:text-zinc-200 leading-snug font-medium">
                        {highlight}
                      </span>
                    </div>
                  ))}
                </div>

                {isLongList && (
                  <button
                    type="button"
                    onClick={handleViewMoreInSettings}
                    className="w-full mt-1 py-2 px-3 rounded-xl bg-violet-500/10 hover:bg-violet-500/15 dark:bg-violet-500/20 dark:hover:bg-violet-500/30 border border-violet-500/20 dark:border-violet-500/30 text-violet-700 dark:text-violet-300 text-xs font-semibold flex items-center justify-between transition-all backdrop-blur-md cursor-pointer"
                  >
                    <span>View all patch notes in Settings</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })()}

          {/* Reassurance footer */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-300/50 dark:via-zinc-700/50 to-transparent mt-4 mb-3 relative" />
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-mono relative">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>All notes and data safe</span>
            </div>
            <span>v{displayVersion}</span>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleClose}
            className="w-full mt-4 py-2.5 px-4 rounded-xl bg-gradient-to-b from-zinc-850 to-zinc-950 hover:from-zinc-800 hover:to-zinc-900 text-white dark:from-white dark:to-zinc-200 dark:hover:from-zinc-100 dark:hover:to-zinc-300 dark:text-zinc-950 font-sans text-xs font-bold transition-all active:scale-[0.98] cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.2)] dark:shadow-[0_2px_12px_rgba(255,255,255,0.2),inset_0_1px_0_rgba(255,255,255,0.9)] flex items-center justify-center gap-1.5 relative"
          >
            <span>Got it, continue to notes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return null;
};
