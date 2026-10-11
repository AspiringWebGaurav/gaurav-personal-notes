import React, { useState } from 'react';
import { useNotesStore } from '../../stores/notesStore';
import { useSyncStore } from '../../stores/syncStore';
import { useAuthStore } from '../../stores/authStore';
import { useConfirmStore } from '../../stores/confirmStore';
import { notesService } from '../../services/notesService';
import {
  Database,
  HardDrive,
  CheckCircle2,
  RefreshCw,
  FileText,
  Cloud,
  Check,
  ArrowRight,
  Lock,
} from 'lucide-react';

export interface DatabaseViewProps {
  onOpenNote?: (id: string) => void;
}

export const DatabaseView: React.FC<DatabaseViewProps> = ({ onOpenNote }) => {
  const { notes, clearDatabase } = useNotesStore();
  const { triggerSync, isSyncing } = useSyncStore();
  const { isAuthenticated } = useAuthStore();
  const confirmModal = useConfirmStore((s) => s.confirm);
  const [reindexing, setReindexing] = useState(false);
  const [reindexSuccess, setReindexSuccess] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const handleReindex = async () => {
    setReindexing(true);
    try {
      await notesService.reindexSearch();
      setReindexSuccess(true);
      setTimeout(() => setReindexSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to rebuild search index:', err);
    } finally {
      setReindexing(false);
    }
  };

  const handleClearDatabase = async () => {
    const ok = await confirmModal({
      title: 'Clean Local Database?',
      description: 'Wipe and completely clean the local database? All local notes, search indexes, and sync records will be permanently erased.',
      confirmText: 'CLEAN DATABASE',
      cancelText: 'Cancel',
      badgeText: `${notes.length} notes will be erased`,
      variant: 'danger',
    });
    if (ok) {
      setIsCleaning(true);
      try {
        await clearDatabase();
      } finally {
        setIsCleaning(false);
      }
    }
  };

  // Accurate storage size calculation: exactly 0 KB when notes is empty
  const totalChars = notes.reduce(
    (acc, n) => acc + (n.content?.length || 0) + (n.title?.length || 0),
    0
  );
  const approxKb =
    notes.length === 0
      ? '0 KB'
      : `${Math.max(1, Math.round((totalChars * 2) / 1024))} KB`;

  return (
    <div className="flex-1 h-full overflow-hidden bg-white dark:bg-zinc-950 p-6 md:p-8 flex flex-col gap-4 select-none transition-colors">
      {/* 1. Header (Compact) */}
      <div className="flex items-start justify-between shrink-0">
        <div>
          <span className="text-[11px] font-mono tracking-[0.2em] font-semibold text-zinc-400 dark:text-zinc-500 uppercase">
            LOCAL STORAGE
          </span>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-0.5">
            Database
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Your notes are securely saved on your computer for fast, offline access.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          {reindexSuccess && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 font-mono">
              <Check className="w-3.5 h-3.5" /> Updated
            </span>
          )}

          <button
            type="button"
            disabled={isCleaning || notes.length === 0}
            onClick={handleClearDatabase}
            className="px-3 py-1.5 rounded-[2px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono font-semibold text-zinc-600 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900 hover:bg-rose-50/50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shadow-2xs"
            title="Clean local database and erase all local notes"
          >
            <span>{isCleaning ? 'CLEANING...' : 'CLEAN DATABASE'}</span>
          </button>

          <button
            type="button"
            disabled={reindexing}
            onClick={handleReindex}
            className="px-3 py-1.5 rounded-[2px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
            title="Refresh search index for faster note searches"
          >
            <RefreshCw className={`w-3 h-3 ${reindexing ? 'animate-spin' : ''}`} />
            <span>{reindexing ? 'REFRESHING...' : 'REFRESH SEARCH'}</span>
          </button>

          <button
            type="button"
            disabled={isSyncing}
            onClick={() => triggerSync()}
            className="px-3.5 py-1.5 rounded-[2px] bg-black dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-mono font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
            title={isAuthenticated ? 'Sync notes with cloud now' : 'Trigger sync'}
          >
            <Cloud className="w-3 h-3" />
            <span>{isSyncing ? 'SYNCING...' : 'SYNC NOW'}</span>
          </button>
        </div>
      </div>

      {/* 2. Three Simple Metric Cards (Single Row, Compact) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 border border-zinc-200 dark:border-zinc-800 rounded-[2px] divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900 shrink-0 shadow-2xs">
        {/* Card 1: Status */}
        <div className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-[10px] font-mono font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
              STATUS
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Healthy & Ready
            </span>
          </div>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            {isAuthenticated ? 'Cloud sync connected' : 'Local private mode'}
          </span>
        </div>

        {/* Card 2: Saved Notes */}
        <div className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-[10px] font-mono font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
              SAVED NOTES
            </span>
            <Database className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
          </div>
          <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'}
          </div>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Stored in local SQLite database
          </span>
        </div>

        {/* Card 3: Storage Used */}
        <div className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-[10px] font-mono font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
              STORAGE USED
            </span>
            <HardDrive className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
          </div>
          <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            {approxKb}
          </div>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Instant load on your machine
          </span>
        </div>
      </div>

      {/* 3. Saved Notes List (Flexes to fill remaining height, NO outer page scroll) */}
      <div className="flex-1 min-h-0 border border-zinc-200 dark:border-zinc-800 rounded-[2px] flex flex-col overflow-hidden bg-white dark:bg-zinc-900 shadow-2xs">
        {/* Table Header */}
        <div className="px-4 py-2.5 bg-zinc-50/80 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Saved Notes on this Device
            </span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-200/60 dark:bg-zinc-800">
              {notes.length}
            </span>
          </div>
          <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
            Instant search active
          </span>
        </div>

        {/* Table Content (Internal scroll only when notes exceed available space) */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
          {notes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-400 dark:text-zinc-500 select-none">
              <div className="w-10 h-10 rounded-[2px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-400 dark:text-zinc-400 mb-2.5">
                <Database className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              </div>
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Your database is clean and fresh
              </p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 max-w-xs mt-1">
                When you create notes in the workspace, they will automatically be saved and listed here.
              </p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                onClick={() => onOpenNote?.(note.id)}
                className={`px-4 py-2.5 flex items-center justify-between text-xs transition-colors ${
                  onOpenNote
                    ? 'hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 cursor-pointer group'
                    : 'hover:bg-zinc-50/60 dark:hover:bg-zinc-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate max-w-[55%]">
                  <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0 group-hover:text-black dark:group-hover:text-white transition-colors" />
                  <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate group-hover:underline">
                    {note.title || 'Untitled Note'}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-zinc-500 dark:text-zinc-400 font-mono text-[11px] shrink-0">
                  <span className="text-zinc-400 dark:text-zinc-500 hidden sm:inline">
                    {note.wordCount || 0} words
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-[2px] border text-[10px] uppercase flex items-center gap-1 ${
                      note.syncState === 'local_only'
                        ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                        : note.syncState === 'synced'
                        ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                        : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    {note.syncState === 'local_only' && <Lock className="w-2.5 h-2.5" />}
                    <span>{note.syncState === 'local_only' ? 'Local Only' : note.syncState === 'synced' ? 'Synced' : 'Saved'}</span>
                  </span>
                  <span className="text-zinc-400 dark:text-zinc-500">
                    {new Date(note.updatedAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  {onOpenNote && (
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
