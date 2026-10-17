import React from 'react';
import { useNotesStore } from '../../stores/notesStore';
import { useConfirmStore } from '../../stores/confirmStore';
import { RotateCcw, Trash2, Eye } from 'lucide-react';
import type { LocalNote } from '../../types/note';

interface TrashViewProps {
  onRestoreSuccess?: () => void;
}

export const TrashView: React.FC<TrashViewProps> = ({ onRestoreSuccess }) => {
  const { trashNotes, restoreFromTrash, deletePermanently, emptyTrash, selectNote, setTrashView } = useNotesStore();
  const confirmModal = useConfirmStore((s) => s.confirm);

  const handleOpenTrashNote = (id: string) => {
    setTrashView(true);
    selectNote(id);
    if (onRestoreSuccess) onRestoreSuccess();
  };

  const handleRestore = async (id: string) => {
    await restoreFromTrash(id);
    setTrashView(false);
    selectNote(id);
    if (onRestoreSuccess) onRestoreSuccess();
  };

  const handleEmpty = async () => {
    const ok = await confirmModal({
      title: 'Empty Recycle Bin?',
      description: `Permanently delete all ${trashNotes.length} note${trashNotes.length > 1 ? 's' : ''} in Trash? This action cannot be undone.`,
      confirmText: 'EMPTY TRASH',
      cancelText: 'Cancel',
      badgeText: `${trashNotes.length} notes`,
      variant: 'danger',
    });
    if (ok) {
      await emptyTrash();
    }
  };

  const handleDeletePermanently = async (note: LocalNote) => {
    const ok = await confirmModal({
      title: 'Delete Note Permanently?',
      description: `Permanently delete "${note.title || 'Untitled Note'}"? This cannot be undone.`,
      confirmText: 'DELETE NOTE',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (ok) {
      await deletePermanently(note.id);
    }
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-white dark:bg-zinc-950 p-8 flex flex-col gap-6 select-none transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[11px] font-mono tracking-[0.25em] font-semibold text-zinc-400 dark:text-zinc-500 uppercase">
            RECYCLE BIN
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
            Trash.
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Review soft-deleted notes, restore them to workspace, or empty permanently.
          </p>
        </div>

        {trashNotes.length > 0 && (
          <button
            type="button"
            onClick={handleEmpty}
            className="px-3.5 py-1.5 rounded-[2px] bg-rose-600 hover:bg-rose-700 text-white text-xs font-mono font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>EMPTY TRASH</span>
          </button>
        )}
      </div>

      {/* Trash Items List */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-[2px] divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
        {trashNotes.map((note) => (
          <div
            key={note.id}
            className="p-4 flex items-center justify-between gap-4 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/60 transition-colors group"
          >
            <div
              onClick={() => handleOpenTrashNote(note.id)}
              className="flex flex-col gap-1 min-w-0 cursor-pointer flex-1"
            >
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:underline">
                {note.title || 'Untitled Note'}
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-lg">
                {note.content?.replace(/<[^>]*>?/gm, '').trim() || 'No preview available'}
              </p>
              <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                Deleted on {new Date(note.deletedAt || note.updatedAt).toLocaleDateString()} • Click to preview
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenTrashNote(note.id)}
                title="Preview Note in Editor"
                className="px-2.5 py-1.5 rounded-[2px] border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-800 text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer flex items-center gap-1 transition-colors"
              >
                <Eye className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                <span>PREVIEW</span>
              </button>
              <button
                type="button"
                onClick={() => handleRestore(note.id)}
                className="px-3 py-1.5 rounded-[2px] border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-zinc-800 text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>RESTORE</span>
              </button>
              <button
                type="button"
                onClick={() => handleDeletePermanently(note)}
                className="p-1.5 rounded-[2px] border border-rose-200 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/40 hover:bg-rose-100/70 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-400 cursor-pointer transition-colors"
                title="Delete Permanently"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {trashNotes.length === 0 && (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-2 text-zinc-400 dark:text-zinc-500">
            <Trash2 className="w-8 h-8 stroke-1" />
            <span className="text-xs font-mono">Recycle bin is clean and empty.</span>
          </div>
        )}
      </div>
    </div>
  );
};
