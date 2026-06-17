"use client";

import { useAuthStore } from "@/features/auth/useAuthStore";
import { NotesRepository, Note } from "@/features/notes/NotesRepository";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, FileText } from "lucide-react";
import { NoteItem } from "./components/NoteItem";

export default function MobileNotesList() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user?.uid) {
      const repo = new NotesRepository(user.uid);
      const unsub = repo.subscribeToNotes((newNotes) => {
        setNotes(newNotes);
        setLoading(false);
      });
      return () => unsub();
    }
  }, [user]);

  const filteredNotes = useMemo(() => {
    return notes
      .filter((n) => !n.isArchived)
      .filter((n) => n.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, searchQuery]);

  const handleCreateNote = useCallback(async () => {
    if (!user?.uid) return;
    const repo = new NotesRepository(user.uid);
    const newNoteId = crypto.randomUUID();
    await repo.createNote(newNoteId, {
      title: "Untitled Note",
      content: "",
      wordCount: 0,
      isArchived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    router.push(`/mobile/notes/${newNoteId}`);
  }, [user, router]);

  const handleDeleteNote = useCallback(async (id: string) => {
    if (!user?.uid) return;
    
    // Optimistic UI Update
    setNotes(prev => prev.filter(n => n.id !== id));
    
    const repo = new NotesRepository(user.uid);
    await repo.moveToTrash(id).catch(err => {
      console.error("Failed to delete note:", err);
      // Ideally rollback optimistic update here, but for simplicity we rely on the Firestore snapshot sync
    });
  }, [user]);



  return (
    <div className="flex flex-col min-h-full shrink-0 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="sticky top-0 z-20 bg-zinc-50/90 dark:bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 p-4 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-black tracking-tight">Notes</h1>
          <button 
            onClick={handleCreateNote}
            className="w-12 h-12 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shadow-lg shadow-violet-500/20 transition-all active:scale-95"
          >
            <Plus size={24} strokeWidth={2.5} />
          </button>
        </div>
        
        <div className="relative mb-2">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-12 pr-4 text-base font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/50 shadow-sm transition-all"
          />
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex flex-col gap-3 pb-safe animate-pulse">
             {[...Array(5)].map((_, i) => (
                <div key={i} className="w-full h-[82px] bg-zinc-200 dark:bg-zinc-800/50 rounded-3xl" />
             ))}
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center h-full">
            <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center text-zinc-400 mb-4 shadow-inner">
              <FileText size={40} />
            </div>
            <h3 className="text-xl font-bold text-zinc-700 dark:text-zinc-300">No notes found</h3>
            <p className="text-sm text-zinc-500 mt-2">Tap the + button to create one.</p>
          </div>
        ) : (
          <div className="flex flex-col pb-safe">
            {filteredNotes.map((note) => (
              <NoteItem key={note.id} note={note} onDelete={handleDeleteNote} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
