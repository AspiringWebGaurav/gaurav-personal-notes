import React, { useState, useEffect, useCallback } from 'react';
import {
  Folder,
  FolderPlus,
  ChevronRight,
  Upload,
  Trash2,
  Edit3,
  MoveRight,
  Check,
  X,
  Loader2,
  RefreshCw,
  FileText,
  Copy,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import {
  gphostService,
  GpHostFolderItem,
  GpHostFolderFileItem,
  GpHostBreadcrumb,
} from '../services/gphostService';

export interface CloudFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPath?: string;
  onSelectFolder?: (folderPath: string) => void;
  selectionMode?: boolean;
}

export const CloudFolderModal: React.FC<CloudFolderModalProps> = ({
  isOpen,
  onClose,
  initialPath = '',
  onSelectFolder,
  selectionMode = false,
}) => {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [breadcrumbs, setBreadcrumbs] = useState<GpHostBreadcrumb[]>([]);
  const [subfolders, setSubfolders] = useState<GpHostFolderItem[]>([]);
  const [files, setFiles] = useState<GpHostFolderFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // New folder dialog
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Rename folder dialog
  const [renamingFolder, setRenamingFolder] = useState<GpHostFolderItem | null>(null);
  const [renameInput, setRenameInput] = useState('');

  // Move folder dialog
  const [movingFolder, setMovingFolder] = useState<GpHostFolderItem | null>(null);
  const [moveDestination, setMoveDestination] = useState('');

  // Move file dialog
  const [movingFile, setMovingFile] = useState<GpHostFolderFileItem | null>(null);
  const [moveFileDestination, setMoveFileDestination] = useState('');

  // File upload state
  const [isUploading, setIsUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchFolder = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await gphostService.listFolder(path);
      if (data.error && !data.success) {
        setError(data.error);
      } else {
        setCurrentPath(data.currentPath || path);
        setBreadcrumbs(data.breadcrumbs || []);
        setSubfolders(data.subfolders || []);
        setFiles(data.files || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch folder');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchFolder(initialPath);
    }
  }, [isOpen, initialPath, fetchFolder]);

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const clean = newFolderName.trim().replace(/[\/\\]/g, '');
    const target = currentPath ? `${currentPath}/${clean}` : clean;

    setLoading(true);
    setError(null);
    try {
      const res = await gphostService.createFolder(target);
      if (res.error && !res.success) {
        setError(res.error);
      } else {
        showNotification(`Folder '${clean}' created`);
        setNewFolderName('');
        setIsCreatingFolder(false);
        await fetchFolder(currentPath);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
    } finally {
      setLoading(false);
    }
  };

  const handleRenameFolder = async () => {
    if (!renamingFolder || !renameInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await gphostService.renameFolder(renamingFolder.path, renameInput.trim());
      if (res.error && !res.success) {
        setError(res.error);
      } else {
        showNotification(`Renamed to '${renameInput.trim()}'`);
        setRenamingFolder(null);
        await fetchFolder(currentPath);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rename failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMoveFolder = async () => {
    if (!movingFolder) return;
    setLoading(true);
    setError(null);
    try {
      const dest = moveDestination.trim() === '' ? null : moveDestination.trim();
      const res = await gphostService.moveFolder(movingFolder.path, dest);
      if (res.error && !res.success) {
        setError(res.error);
      } else {
        showNotification(`Moved folder to '${dest || 'Root'}'`);
        setMovingFolder(null);
        await fetchFolder(currentPath);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Move failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFolder = async (folder: GpHostFolderItem) => {
    // Protection guard
    if (
      folder.path.toLowerCase() === 'gpn' ||
      folder.path.toLowerCase() === 'gpn-dynamic-update/base'
    ) {
      setError('Base v0.0.0 installer folder is permanently protected and cannot be deleted.');
      return;
    }

    const confirmed = window.confirm(
      `Delete folder '${folder.name}' and all its contents recursively?`
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      const success = await gphostService.deleteFolder(folder.path, true);
      if (success) {
        showNotification(`Folder '${folder.name}' deleted`);
        await fetchFolder(currentPath);
      } else {
        setError('Failed to delete folder.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    try {
      await gphostService.uploadFileToFolder(file, currentPath);
      showNotification(`File '${file.name}' uploaded to ${currentPath || 'Root'}`);
      await fetchFolder(currentPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleMoveFile = async () => {
    if (!movingFile) return;
    setLoading(true);
    setError(null);
    try {
      const ok = await gphostService.moveFileToFolder(movingFile.id, moveFileDestination.trim());
      if (ok) {
        showNotification(`File moved to '${moveFileDestination.trim() || 'Root'}'`);
        setMovingFile(null);
        await fetchFolder(currentPath);
      } else {
        setError('Failed to move file.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Move file failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (url?: string, id?: string) => {
    if (!url && !id) return;
    const finalUrl = url || `https://gphost.eu.cc/f/${id}`;
    navigator.clipboard.writeText(finalUrl);
    setCopiedId(id || url || null);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FolderTreeIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Cloud Folders & Vault Storage
                {selectionMode && (
                  <span className="text-[10px] font-mono uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                    Select Folder
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Organize attachments, notes, and vault backups hierarchically
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => fetchFolder(currentPath)}
              disabled={loading}
              title="Refresh current folder"
              aria-label="Refresh current folder"
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close modal"
              aria-label="Close modal"
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Breadcrumb Navigation Bar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-zinc-100/70 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto text-xs">
          <div className="flex items-center gap-1 min-w-0">
            <button
              type="button"
              onClick={() => fetchFolder('')}
              className={`font-medium hover:underline flex items-center gap-1 px-1.5 py-0.5 rounded ${
                currentPath === ''
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              <span>Storage</span>
            </button>

            {breadcrumbs
              .filter((b) => b.path !== '')
              .map((crumb, idx) => {
                const isLast = idx === breadcrumbs.filter((b) => b.path !== '').length - 1;
                return (
                  <React.Fragment key={crumb.path}>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <button
                      type="button"
                      onClick={() => fetchFolder(crumb.path)}
                      className={`hover:underline truncate max-w-[140px] px-1 py-0.5 rounded ${
                        isLast
                          ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                          : 'text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                );
              })}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsCreatingFolder(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>New Folder</span>
            </button>

            <label className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-750 transition-colors cursor-pointer">
              {isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>{isUploading ? 'Uploading...' : 'Upload File'}</span>
              <input
                type="file"
                className="hidden"
                disabled={isUploading}
                onChange={handleFileUpload}
              />
            </label>

            {selectionMode && onSelectFolder && (
              <button
                type="button"
                onClick={() => {
                  onSelectFolder(currentPath);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Select Folder</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications & Error alerts */}
        {actionSuccess && (
          <div className="px-6 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs border-b border-emerald-200 dark:border-emerald-900/40 flex items-center gap-2">
            <Check className="w-3.5 h-3.5" /> {actionSuccess}
          </div>
        )}
        {error && (
          <div className="px-6 py-2 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs border-b border-red-200 dark:border-red-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" /> {error}
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body / Folder Explorer */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Create Folder Inline Form */}
          {isCreatingFolder && (
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 border border-emerald-500/30 rounded-xl flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-emerald-500 shrink-0" />
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder();
                  if (e.key === 'Escape') setIsCreatingFolder(false);
                }}
                placeholder="Folder name (e.g. Backups or Notes/2026)"
                autoFocus
                className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleCreateFolder}
                disabled={loading || !newFolderName.trim()}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg disabled:opacity-50"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingFolder(false);
                  setNewFolderName('');
                }}
                className="px-2 py-1 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 text-xs"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Subfolders Grid */}
          <div>
            <h3 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
              Folders ({subfolders.length})
            </h3>
            {subfolders.length === 0 ? (
              <div className="py-4 text-center text-xs text-zinc-400 dark:text-zinc-600 bg-zinc-50/50 dark:bg-zinc-800/20 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                No subfolders in this location.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {subfolders.map((folder) => {
                  const isProtected =
                    folder.path.toLowerCase() === 'gpn' ||
                    folder.path.toLowerCase() === 'gpn-dynamic-update/base';

                  return (
                    <div
                      key={folder.id}
                      className="group flex items-center justify-between p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/30 hover:border-emerald-500/40 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => fetchFolder(folder.path)}
                        className="flex items-center gap-2.5 min-w-0 text-left flex-1"
                      >
                        <Folder className="w-4 h-4 text-emerald-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
                            {folder.name}
                            {isProtected && (
                              <span className="text-[9px] font-mono bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded font-semibold">
                                Protected
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            {folder.file_count || 0} files • {folder.subfolder_count || 0} subfolders
                          </p>
                        </div>
                      </button>

                      {/* Folder Actions */}
                      {!isProtected && (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                          <button
                            type="button"
                            onClick={() => {
                              setRenamingFolder(folder);
                              setRenameInput(folder.name);
                            }}
                            title="Rename folder"
                            aria-label={`Rename folder ${folder.name}`}
                            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMovingFolder(folder);
                              setMoveDestination(folder.parent_path || '');
                            }}
                            title="Move folder"
                            aria-label={`Move folder ${folder.name}`}
                            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded"
                          >
                            <MoveRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFolder(folder)}
                            title="Delete folder"
                            aria-label={`Delete folder ${folder.name}`}
                            className="p-1 text-red-400 hover:text-red-600 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Files List in Current Folder */}
          <div className="pt-2">
            <h3 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
              Files ({files.length})
            </h3>
            {files.length === 0 ? (
              <div className="py-4 text-center text-xs text-zinc-400 dark:text-zinc-600 bg-zinc-50/50 dark:bg-zinc-800/20 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                No files in this folder.
              </div>
            ) : (
              <div className="space-y-1.5">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/20 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {file.filename || file.sanitized_name}
                        </p>
                        <p className="text-[10px] text-zinc-400">
                          {formatBytes(file.byte_size || 0)} • {file.mime_type || 'octet-stream'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(file.download_url, file.id)}
                        title="Copy CDN link"
                        aria-label={`Copy CDN link for ${file.filename || file.sanitized_name}`}
                        className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs flex items-center gap-1 font-mono"
                      >
                        {copiedId === (file.download_url || file.id) ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMovingFile(file);
                          setMoveFileDestination(currentPath);
                        }}
                        title="Move to another folder"
                        aria-label={`Move ${file.filename || file.sanitized_name} to another folder`}
                        className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <MoveRight className="w-3.5 h-3.5" />
                      </button>

                      {file.download_url && (
                        <a
                          href={file.download_url}
                          target="_blank"
                          rel="noreferrer"
                          title="Open link"
                          className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Rename Modal Overlay */}
        {renamingFolder && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xl">
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Rename Folder &apos;{renamingFolder.name}&apos;
              </h4>
              <input
                type="text"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRenameFolder()}
                autoFocus
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 mb-3 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenamingFolder(null)}
                  className="px-3 py-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRenameFolder}
                  disabled={loading || !renameInput.trim()}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Move Folder Modal Overlay */}
        {movingFolder && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xl">
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                Move Folder &apos;{movingFolder.name}&apos;
              </h4>
              <p className="text-[11px] text-zinc-500 mb-2">
                Enter target destination parent (leave blank for Root):
              </p>
              <input
                type="text"
                value={moveDestination}
                onChange={(e) => setMoveDestination(e.target.value)}
                placeholder="e.g. GPN or leave empty for Root"
                autoFocus
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 mb-3 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMovingFolder(null)}
                  className="px-3 py-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleMoveFolder}
                  disabled={loading}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg"
                >
                  Move
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Move File Modal Overlay */}
        {movingFile && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xl">
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                Move File &apos;{movingFile.filename || movingFile.sanitized_name}&apos;
              </h4>
              <p className="text-[11px] text-zinc-500 mb-2">
                Enter target destination folder path:
              </p>
              <input
                type="text"
                value={moveFileDestination}
                onChange={(e) => setMoveFileDestination(e.target.value)}
                placeholder="e.g. GPN/Backups or GPN/Attachments"
                autoFocus
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 mb-3 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMovingFile(null)}
                  className="px-3 py-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleMoveFile}
                  disabled={loading}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg"
                >
                  Move File
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px]">
              Path: {currentPath ? `/${currentPath}` : '/ (Root)'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function FolderTreeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 8 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      <path d="M12 10v4" />
      <path d="M10 12h4" />
    </svg>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
