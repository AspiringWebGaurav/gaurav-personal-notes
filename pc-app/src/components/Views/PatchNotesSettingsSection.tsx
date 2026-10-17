import React, { useState, useEffect } from 'react';
import { patchNotesService } from '../../services/patchNotesService';
import { DynamicPatchNotes } from '../../data/patchNotes';
import { formatVersion, cleanVersion } from '../../utils/version';
import { APP_VERSION } from '../../services/updateService';
import {
  Sparkles,
  Calendar,
  Check,
  RefreshCw,
  Cloud,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface PatchNotesSettingsSectionProps {
  currentRunningVersion?: string;
}

export const PatchNotesSettingsSection: React.FC<PatchNotesSettingsSectionProps> = ({
  currentRunningVersion = APP_VERSION,
}) => {
  const [notes, setNotes] = useState<DynamicPatchNotes[]>(() =>
    patchNotesService.getLocalPatchNotes()
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number>(() =>
    patchNotesService.getLastSyncedAt()
  );
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  const runningVersionClean = cleanVersion(currentRunningVersion);

  // Subscribe to service updates
  useEffect(() => {
    const unsubscribe = patchNotesService.subscribe((updatedNotes) => {
      setNotes(updatedNotes);
    });
    return unsubscribe;
  }, []);

  // On first mount into this section, trigger on-demand cloud sync (zero polling)
  useEffect(() => {
    handleCloudSync();
  }, []);

  const handleCloudSync = async () => {
    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const res = await patchNotesService.fetchCloudPatchNotes();
      setNotes(res.notes);
      setLastSyncTime(res.lastSyncedAt);
      if (res.fromCloud) {
        setSyncStatusMsg('Synced with Cloud');
      } else if (res.error) {
        setSyncStatusMsg(res.error);
      } else {
        setSyncStatusMsg('Up to date with Cloud');
      }
    } catch {
      setSyncStatusMsg('Using offline cached history');
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleExpand = (v: string) => {
    setExpandedNotes((prev) => ({ ...prev, [v]: !prev[v] }));
  };

  const formatSyncTime = (ts: number) => {
    if (!ts) return 'Never';
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-200">
      {/* Cloud Sync & Status Action Bar */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-[2px] p-4 bg-white dark:bg-zinc-900 shadow-2xs flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[2px] bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800/80 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Cloud Release History
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                <Cloud className="w-2.5 h-2.5" />
                <span>{lastSyncTime ? `Synced ${formatSyncTime(lastSyncTime)}` : 'Local Cache'}</span>
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              {syncStatusMsg || 'Fetches latest changelogs on demand across all versions.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCloudSync}
          disabled={isSyncing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-[2px] transition-all cursor-pointer select-none disabled:opacity-60 shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-violet-500' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync from Cloud'}</span>
        </button>
      </div>

      {/* Timeline ordering hint */}
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 px-1">
        <span className="font-semibold text-zinc-700 dark:text-zinc-300">Release Changelogs</span>
        <span className="flex items-center gap-1 text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
          <span>Latest version first • Scroll down for earlier releases</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </span>
      </div>

      {/* Version History Timeline Cards */}
      <div className="flex flex-col gap-4">
        {notes.map((item, idx) => {
          const itemCleanVer = cleanVersion(item.version);
          const isCurrentRunning = itemCleanVer === runningVersionClean;
          const isLatest = idx === 0 && itemCleanVer !== '0.0.0';
          const isExpanded = !!expandedNotes[itemCleanVer];

          return (
            <div
              key={itemCleanVer}
              className={`border rounded-[2px] p-5 bg-white dark:bg-zinc-900 shadow-2xs transition-all ${
                isCurrentRunning
                  ? 'border-emerald-300/90 dark:border-emerald-800/80 ring-1 ring-emerald-400/20'
                  : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-base font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
                    {formatVersion(item.version)}
                  </span>

                  {isCurrentRunning && (
                    <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/60">
                      CURRENT RUNNING VERSION
                    </span>
                  )}

                  {isLatest && !isCurrentRunning && (
                    <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-semibold bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-300 border border-violet-300/80 dark:border-violet-700/60">
                      LATEST OTA RELEASE
                    </span>
                  )}

                  {itemCleanVer === '0.0.0' && (
                    <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                      LIFETIME BASE ANCHOR
                    </span>
                  )}
                </div>

                {item.releaseDate && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 font-mono">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{item.releaseDate}</span>
                  </div>
                )}
              </div>

              {/* Title */}
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-2">
                {item.title}
              </h4>

              {/* Highlights List */}
              <div className="mt-3.5 pt-3.5 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col gap-2">
                {item.highlights && item.highlights.length > 0 ? (
                  item.highlights.map((h, hIdx) => (
                    <div key={hIdx} className="flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                      <div className="w-4 h-4 rounded-[2px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200 dark:border-emerald-800/60">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>{h}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-400">Performance enhancements and security updates.</p>
                )}
              </div>

              {/* Expandable Raw Release Note */}
              {item.rawNotes && (
                <div className="mt-4 pt-3 border-t border-dashed border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => toggleExpand(itemCleanVer)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer select-none"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                    <span>{isExpanded ? 'Hide manifest notes' : 'View release manifest note'}</span>
                  </button>

                  {isExpanded && (
                    <div className="mt-2 p-2.5 rounded bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/70 dark:border-zinc-800/70 font-mono text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed break-words whitespace-pre-wrap select-text animate-in fade-in duration-150">
                      {item.rawNotes}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
