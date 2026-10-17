import React, { useState, useEffect } from 'react';
import {
  Download,
  X,
  FileText,
  FolderArchive,
  CheckCircle2,
  Loader2,
  BookOpen,
  User,
  Clock,
  FolderOpen,
  ExternalLink,
  Cloud,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { openExternalUrl } from '../utils/urlHelper';
import { useNotesStore } from '../stores/notesStore';
import { useAuthStore } from '../stores/authStore';
import { gphostService } from '../services/gphostService';
import { CloudFolderModal } from './CloudFolderModal';
import {
  executeVaultBackup,
  BackupResult,
  getBackupCooldownRemaining,
  BACKUP_COOLDOWN_SECONDS,
} from '../utils/vaultBackupHelper';

export interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ isOpen, onClose }) => {
  const { notes } = useNotesStore();
  const { user, isAuthenticated } = useAuthStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [backupResult, setBackupResult] = useState<BackupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(() => getBackupCooldownRemaining());
  const [isCloudFolderOpen, setIsCloudFolderOpen] = useState(false);
  const [isUploadingToCloud, setIsUploadingToCloud] = useState(false);
  const [cloudUploadSuccess, setCloudUploadSuccess] = useState<string | null>(null);

  // Reset state and sync cooldown when opened
  useEffect(() => {
    if (isOpen) {
      setIsProcessing(false);
      setBackupResult(null);
      setError(null);
      setIsCloudFolderOpen(false);
      setIsUploadingToCloud(false);
      setCloudUploadSuccess(null);
      setCooldownRemaining(getBackupCooldownRemaining());
    }
  }, [isOpen]);

  // Live 1-second countdown ticker for cooldown
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      const remaining = getBackupCooldownRemaining();
      setCooldownRemaining(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Handle ESC key to close, Enter to confirm
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        onClose();
      } else if (e.key === 'Enter' && !isProcessing && !backupResult && cooldownRemaining === 0) {
        handleConfirmBackup();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isProcessing, backupResult, cooldownRemaining, onClose]);

  if (!isOpen) return null;

  const totalNotes = notes.length;
  const cloudCount = notes.filter((n) => n.syncState !== 'local_only').length;
  const localCount = notes.filter((n) => n.syncState === 'local_only').length;
  const userEmail = isAuthenticated && user?.email ? user.email : 'Local Guest';

  const handleConfirmBackup = async () => {
    if (cooldownRemaining > 0) return;
    setIsProcessing(true);
    setError(null);
    try {
      const result = await executeVaultBackup(notes, userEmail, {
        triggerBrowser: false,
        triggerLocalSave: true,
      });
      setBackupResult(result);
      setCooldownRemaining(BACKUP_COOLDOWN_SECONDS);
    } catch (err) {
      console.error('Backup failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to create backup file');
      setCooldownRemaining(getBackupCooldownRemaining());
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShowInFolder = async () => {
    if (backupResult?.savedFilePath && typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      try {
        await invoke('cmd_show_in_folder', { path: backupResult.savedFilePath });
      } catch (err) {
        console.error('Failed to open folder:', err);
      }
    }
  };

  const handleOpenBrowserDownload = async () => {
    if (backupResult?.downloadUrl) {
      await openExternalUrl(backupResult.downloadUrl);
    }
  };

  const handleSelectCloudFolder = async (folderPath: string) => {
    if (!backupResult?.blob) return;
    setIsUploadingToCloud(true);
    setError(null);
    try {
      const res = await gphostService.uploadFileToFolder(
        backupResult.blob,
        folderPath,
        backupResult.filename
      );
      if (res.success) {
        setCloudUploadSuccess(`Saved to /${folderPath || 'Root'}`);
      } else {
        setError('Failed to upload backup to cloud folder');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cloud folder upload failed');
    } finally {
      setIsUploadingToCloud(false);
    }
  };

  return (
    <div
      onClick={!isProcessing ? onClose : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none p-4 animate-in fade-in duration-100"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[560px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2px] shadow-2xl overflow-hidden flex flex-col transition-colors animate-in zoom-in-95 duration-100"
      >
        {/* Header: Symmetrical GPN Workstation Header */}
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2.5">
            <FolderArchive className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Backup All Notes
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 rounded-[2px] bg-zinc-100 dark:bg-zinc-800 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
              Esc
            </kbd>
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="p-1 rounded-[2px] text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-40"
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Content: Clean, Open Layout with GPN Workstation Styling */}
        <div className="p-5 space-y-4 text-xs font-sans">
          {!backupResult ? (
            <>
              {/* Short explanation */}
              <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed font-normal">
                Export a full backup archive of all notes from this PC and your cloud storage into a zip file on your computer.
              </p>

              {/* Horizontal Stats Row */}
              <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 py-2.5 px-3 rounded-[2px] bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-400 uppercase text-[10px]">TOTAL:</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{totalNotes}</span>
                </div>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-400 uppercase text-[10px]">SYNCED:</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">{cloudCount}</span>
                </div>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-400 uppercase text-[10px]">LOCAL PC:</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">{localCount}</span>
                </div>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 min-w-0">
                  <User size={11} className="text-zinc-400 shrink-0" />
                  <span className="truncate max-w-[160px] text-[10px]">{userEmail}</span>
                </div>
              </div>

              {/* Cooldown Notice (Bot resistance & server protection) */}
              {cooldownRemaining > 0 && (
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-[2px] bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-mono">
                  <Clock size={13} className="shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    Backup downloaded recently. Next download ready in <strong className="font-semibold">{cooldownRemaining}s</strong>.
                  </span>
                </div>
              )}

              {/* Open What's Included Rows (Clean Hairline Dividers) */}
              <div className="space-y-1 pt-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-semibold mb-2">
                  What is included in the zip
                </div>

                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 border-y border-zinc-100 dark:border-zinc-800/80">
                  <div className="py-2.5 flex items-start gap-3">
                    <FileText size={15} className="text-zinc-500 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                        All Notes in Markdown (.md)
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400 text-[11px] block mt-0.5">
                        Clean text files you can view or import anywhere.
                      </span>
                    </div>
                  </div>

                  <div className="py-2.5 flex items-start gap-3">
                    <BookOpen size={15} className="text-zinc-500 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                        README Guide &amp; Notes Data (.json)
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400 text-[11px] block mt-0.5">
                        Includes restore instructions and a complete notes data snapshot.
                      </span>
                    </div>
                  </div>

                  <div className="py-2.5 flex items-start gap-3">
                    <Download size={15} className="text-zinc-500 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                        Direct Save to Downloads
                      </span>
                      <span className="text-zinc-500 dark:text-zinc-400 text-[11px] block mt-0.5">
                        Saves the backup zip archive directly to your Downloads folder without errors.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-2.5 rounded-[2px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                  {error}
                </div>
              )}
            </>
          ) : (
            /* Success State */
            <div className="py-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[2px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Backup Complete
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Your backup zip file is saved and ready on your computer.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-[2px] bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">File Name:</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{backupResult.filename}</span>
                </div>
                {backupResult.savedFilePath && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Location:</span>
                    <span className="text-zinc-700 dark:text-zinc-300 font-semibold">Downloads</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Notes Saved:</span>
                  <span className="text-zinc-700 dark:text-zinc-300">{backupResult.totalNotes} notes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">File Size:</span>
                  <span className="text-zinc-700 dark:text-zinc-300">{(backupResult.byteSize / 1024).toFixed(1)} KB</span>
                </div>
                {cloudUploadSuccess && (
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold pt-1 border-t border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-400">Cloud Vault:</span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 size={12} /> {cloudUploadSuccess}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer: Consistent GPN Workstation Bar */}
        <div className="p-3 px-5 bg-zinc-50/70 dark:bg-zinc-950/70 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
          <span>Gaurav Personal Notes</span>
          <div className="flex items-center gap-2">
            {!backupResult ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isProcessing}
                  className="px-3 py-1.5 rounded-[2px] border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono text-xs cursor-pointer transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmBackup}
                  disabled={isProcessing || totalNotes === 0 || cooldownRemaining > 0}
                  className="px-4 py-1.5 rounded-[2px] bg-black dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-mono text-xs cursor-pointer transition-colors font-semibold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>PREPARING...</span>
                    </>
                  ) : cooldownRemaining > 0 ? (
                    <>
                      <Clock size={13} />
                      <span>WAIT {cooldownRemaining}S</span>
                    </>
                  ) : (
                    <>
                      <Download size={13} />
                      <span>DOWNLOAD BACKUP (.ZIP)</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                {backupResult.savedFilePath && (
                  <button
                    type="button"
                    onClick={handleShowInFolder}
                    className="px-3 py-1.5 rounded-[2px] border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-mono text-xs cursor-pointer transition-colors flex items-center gap-1.5"
                    title="Open the folder containing this backup file"
                  >
                    <FolderOpen size={13} />
                    <span>SHOW IN FOLDER</span>
                  </button>
                )}
                {backupResult.downloadUrl && (
                  <button
                    type="button"
                    onClick={handleOpenBrowserDownload}
                    className="px-3 py-1.5 rounded-[2px] border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono text-xs cursor-pointer transition-colors flex items-center gap-1.5"
                    title="Open download link in your browser"
                  >
                    <ExternalLink size={13} />
                    <span>BROWSER LINK</span>
                  </button>
                )}
                {backupResult.blob && (
                  <button
                    type="button"
                    onClick={() => setIsCloudFolderOpen(true)}
                    disabled={isUploadingToCloud}
                    className="px-3 py-1.5 rounded-[2px] border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-mono text-xs cursor-pointer transition-colors flex items-center gap-1.5"
                    title="Upload backup directly to custom GPHost cloud folder"
                  >
                    {isUploadingToCloud ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Cloud size={13} />
                    )}
                    <span>{isUploadingToCloud ? 'SAVING...' : 'CLOUD FOLDER'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-[2px] bg-black dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-mono text-xs cursor-pointer transition-colors font-semibold shadow-2xs"
                >
                  DONE
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <CloudFolderModal
        isOpen={isCloudFolderOpen}
        onClose={() => setIsCloudFolderOpen(false)}
        selectionMode={true}
        onSelectFolder={handleSelectCloudFolder}
      />
    </div>
  );
};
