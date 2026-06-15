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
      isArchived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    // Let the subscription handle the UI update
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
        <h2 className="font-semibold text-lg">My Notes</h2>
        <button 
          onClick={handleCreateNote}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition"
        >
          <Plus size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sortedNotes.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No notes yet. Click + to create one.
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
      <div className="block p-4 border-b border-gray-100 dark:border-gray-900 bg-gray-50 dark:bg-gray-900 transition">
        <form onSubmit={handleSave} className="flex items-center gap-2">
           <FileText size={18} className="text-gray-400 shrink-0" />
           <input 
             autoFocus
             value={title}
             onChange={(e) => setTitle(e.target.value)}
             onBlur={handleSave}
             className="flex-1 min-w-0 bg-white dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-800"
             onClick={(e) => e.stopPropagation()}
           />
        </form>
      </div>
    );
  }

  return (
    <Link 
      href={`/dashboard/notes/${note.id}`}
      className={`group block p-4 border-b transition cursor-pointer relative ${
        isActive 
          ? "bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-l-blue-500 border-b-blue-100 dark:border-b-blue-900/30" 
          : "border-l-4 border-l-transparent border-b-gray-100 dark:border-b-gray-900 hover:bg-gray-50 dark:hover:bg-gray-900"
      }`}
    >
      <div className={`flex items-center gap-3 pr-8 ${isActive ? "text-blue-900 dark:text-blue-100" : ""}`}>
        <FileText size={18} className={isActive ? "text-blue-500" : "text-gray-400"} />
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm truncate ${isActive ? "font-semibold" : "font-medium"}`}>{note.title || "Untitled"}</h3>
          <p className={`text-xs truncate mt-1 ${isActive ? "text-blue-600/70 dark:text-blue-300/70" : "text-gray-500"}`}>
            {new Date(note.updatedAt).toLocaleDateString()}
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
        className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition bg-white dark:bg-gray-950 shadow-sm border border-gray-200 dark:border-gray-800 rounded"
        title="Rename"
      >
        <Pencil size={14} />
      </button>
    </Link>
  );
}
