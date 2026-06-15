"use client";

import { useEffect, useState } from "react";
import { NotesRepository, Note } from "@/features/notes/NotesRepository";
import { useAuthStore } from "@/features/auth/useAuthStore";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { FileText, RotateCcw, Trash2 } from "lucide-react";

export default function TrashPage() {
  const { user } = useAuthStore();
  const [notes, setNotes] = useState<Note[]>([]);
  const [repo, setRepo] = useState<NotesRepository | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    if (user?.uid) {
      const repository = new NotesRepository(user.uid);
      setRepo(repository);
      
      const unsubscribe = repository.subscribeToTrash((updatedNotes) => {
        setNotes(updatedNotes.sort((a, b) => b.updatedAt - a.updatedAt));
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleEmptyTrash = async () => {
    if (!repo) return;
    setConfirmAction({
      title: "Empty Trash",
      message: "Are you sure you want to permanently delete all items in the trash? This action cannot be undone.",
      confirmText: "Empty Trash",
      onConfirm: async () => {
        await repo.emptyTrash();
      }
    });
  };

  const handleRestore = async (id: string) => {
    if (!repo) return;
    await repo.restoreFromTrash(id);
  };

  const handleDeleteForever = async (id: string) => {
    if (!repo) return;
    setConfirmAction({
      title: "Delete Forever",
      message: "Permanently delete this note? This action cannot be undone.",
      confirmText: "Delete",
      onConfirm: async () => {
        await repo.deleteNote(id);
      }
    });
  };

  return (
    <div className="p-8 w-full h-full flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h1 className="text-3xl font-bold">Trash</h1>
        {notes.length > 0 && (
          <button 
            onClick={handleEmptyTrash}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition shadow-sm"
          >
            <Trash2 size={18} />
            Empty Trash
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Trash2 size={48} className="mb-4 opacity-50" />
            <h3 className="text-xl font-medium mb-2">Trash is empty</h3>
            <p className="text-sm">Notes you delete will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map(note => (
              <div 
                key={note.id} 
                className="p-4 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 rounded-xl shadow-sm hover:shadow transition flex flex-col"
              >
                <div className="flex items-center gap-3 mb-4 opacity-70">
                  <FileText size={20} className="text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{note.title || "Untitled"}</h3>
                    <p className="text-xs text-gray-500">Deleted {new Date(note.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="mt-auto flex gap-2 border-t border-gray-100 dark:border-gray-800 pt-4">
                  <button 
                    onClick={() => handleRestore(note.id)}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 py-2 rounded transition font-medium text-sm"
                  >
                    <RotateCcw size={16} />
                    Restore
                  </button>
                  <button 
                    onClick={() => handleDeleteForever(note.id)}
                    className="flex items-center justify-center p-2 text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/50 rounded transition"
                    title="Delete Forever"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal 
        isOpen={confirmAction !== null}
        title={confirmAction?.title || ""}
        message={confirmAction?.message || ""}
        confirmText={confirmAction?.confirmText}
        isDestructive={true}
        onConfirm={() => confirmAction?.onConfirm()}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
