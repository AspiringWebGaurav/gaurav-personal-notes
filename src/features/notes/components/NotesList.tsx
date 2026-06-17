"use client";

import { useEffect, useState } from "react";
import { NotesRepository, Note } from "@/features/notes/NotesRepository";
import { useAuthStore } from "@/features/auth/useAuthStore";
import { FileText, Plus, Pencil } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export function NotesList() {
  const { user } = useAuthStore();
  const [notes, setNotes] = useState<Note[]>([]);
  const [repo, setRepo] = useState<NotesRepository | null>(null);
  const [sortOrder, setSortOrder] = useState("updatedAt");

  useEffect(() => {
    // Initial sort load
    setSortOrder(localStorage.getItem('notes-sort') || 'updatedAt');
    
    // Listen for cross-component storage changes
    const handleStorage = () => {
      setSortOrder(localStorage.getItem('notes-sort') || 'updatedAt');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (user?.uid) {
      const repository = new NotesRepository(user.uid);
      setRepo(repository);
      
      const unsubscribe = repository.subscribeToNotes((updatedNotes) => {
        setNotes(updatedNotes);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const sortedNotes = [...notes].sort((a, b) => {
    if (sortOrder === 'title') {
      return (a.title || 'Untitled').localeCompare(b.title || 'Untitled');
    }
    return b.updatedAt - a.updatedAt;
  });

  const handleCreateNote = async () => {
    if (!repo) return;
    const newId = crypto.randomUUID();
    await repo.createNote(newId, {
      title: "Untitled Note",
      content: "",
      wordCount: 0,
      isArchived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    // Let the subscription handle the UI update
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50/30 dark:bg-zinc-950/30 border-r border-zinc-200/80 dark:border-zinc-800/80 relative">
      <div className="p-5 border-b border-zinc-200/80 dark:border-zinc-800/80 flex justify-between items-center bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-10">
        <h2 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
          <FileText size={18} className="text-violet-500" />
          My Notes
        </h2>
        <button 
          onClick={handleCreateNote}
          className="w-8 h-8 flex items-center justify-center bg-violet-500 hover:bg-violet-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all active:scale-95"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {sortedNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-pulse">
            <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800/50 rounded-full flex items-center justify-center text-zinc-400 mb-3">
              <FileText size={20} />
            </div>
            <p className="text-sm font-medium text-zinc-500">No notes yet</p>
            <p className="text-xs text-zinc-400 mt-1">Click the + to create one</p>
          </div>
        ) : (
          sortedNotes.map(note => (
            <NoteItem key={note.id} note={note} repo={repo!} />
          ))
        )}
      </div>
    </div>
  );
}

function NoteItem({ note, repo }: { note: Note, repo: NotesRepository }) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const params = useParams();
  const isActive = params?.id === note.id;

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (title.trim() !== note.title) {
       await repo.updateNote(note.id, { title: title.trim() || "Untitled Note" });
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="block mx-2 my-1 p-3 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/10 transition-all shadow-[0_0_0_2px_rgba(139,92,246,0.1)]">
        <form onSubmit={handleSave} className="flex items-center gap-2">
           <FileText size={16} className="text-violet-400 shrink-0" />
           <input 
             autoFocus
             value={title}
             onChange={(e) => setTitle(e.target.value)}
             onBlur={handleSave}
             className="flex-1 min-w-0 bg-white dark:bg-zinc-950 border border-violet-200 dark:border-violet-800 rounded-lg px-2.5 py-1 text-sm outline-none font-medium focus:ring-2 focus:ring-violet-500/20 text-zinc-900 dark:text-zinc-100"
             onClick={(e) => e.stopPropagation()}
           />
        </form>
      </div>
    );
  }

  return (
    <Link 
      href={`/dashboard/notes/${note.id}`}
      className={`group block mx-2 my-1 p-3 rounded-xl transition-all relative overflow-hidden ${
        isActive 
          ? "bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200/80 dark:border-zinc-800/80" 
          : "border border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900/50"
      }`}
    >
      {isActive && (
        <div className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-cyan-500 to-violet-500 rounded-r-full"></div>
      )}
      
      <div className="flex items-center gap-3 pr-8 relative z-10">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
          isActive 
            ? "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400" 
            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
        }`}>
          <FileText size={16} className={isActive ? "stroke-[2.5]" : "stroke-[2]"} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm truncate transition-colors ${
            isActive 
              ? "font-semibold text-zinc-900 dark:text-zinc-100" 
              : "font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200"
          }`}>
            {note.title || "Untitled"}
          </h3>
          <p className={`text-xs mt-0.5 truncate flex items-center gap-1.5 ${
            isActive 
              ? "font-medium text-violet-600/70 dark:text-violet-400/70" 
              : "font-medium text-zinc-400 dark:text-zinc-500"
          }`}>
            {isActive && <span className="w-1 h-1 rounded-full bg-emerald-500"></span>}
            {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>
      
      <button 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setTitle(note.title);
          setIsEditing(true);
        }}
        className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all z-20 ${
          isActive 
            ? "opacity-100 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-500" 
            : "opacity-0 group-hover:opacity-100 bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-400 shadow-sm border border-zinc-200 dark:border-zinc-700"
        }`}
        title="Rename"
      >
        <Pencil size={14} />
      </button>
    </Link>
  );
}
