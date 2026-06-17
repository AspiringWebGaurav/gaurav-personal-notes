"use client";

import { use, useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/features/auth/useAuthStore";
import { NotesRepository, Note } from "@/features/notes/NotesRepository";
import { ChevronLeft, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@/features/notes/components/Editor").then(m => m.Editor), { 
  ssr: false,
  loading: () => <div className="p-8 text-zinc-400 animate-pulse text-sm">Loading rich-text editor...</div>
});

export default function MobileNoteEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const repoRef = useRef<NotesRepository | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user?.uid) {
      const repo = new NotesRepository(user.uid);
      repoRef.current = repo;

      repo.getNote(id).then((fetchedNote) => {
        if (fetchedNote) {
          setNote(fetchedNote);
          setTitle(fetchedNote.title);
        } else {
          router.push("/mobile/notes");
        }
        setLoading(false);
      });
    }
  }, [user, id, router]);

  const handleUpdate = useCallback((content: string, newWordCount: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (repoRef.current) {
        repoRef.current.updateNote(id, { content, wordCount: newWordCount }).catch(err => {
           console.error("Failed to save note:", err);
        });
      }
    }, 1000);
  }, [id]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (repoRef.current) {
      repoRef.current.updateNote(id, { title: newTitle });
    }
  };

  const handleArchive = async () => {
    if (repoRef.current) {
      await repoRef.current.moveToTrash(id);
      router.push("/mobile/notes");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-white dark:bg-[#0f1115] text-zinc-500 absolute inset-0 z-50">
        Loading...
      </div>
    );
  }

  if (!note) {
    return null;
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-white dark:bg-[#0f1115] text-zinc-900 dark:text-zinc-100 absolute inset-0 z-50">
      {/* Top App Bar */}
      <div className="flex items-center justify-between p-2 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#0f1115]/80 backdrop-blur-md sticky top-0 z-10">
        <button 
          onClick={() => router.push("/mobile/notes")}
          className="p-2 -ml-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 font-medium"
        >
          <ChevronLeft size={24} />
          <span className="text-sm">Back</span>
        </button>
        
        <button 
          onClick={handleArchive}
          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full transition-colors"
        >
          <Trash2 size={20} />
        </button>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col relative">
        <div className="p-4 pb-2 bg-white dark:bg-[#0f1115] z-0">
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Note Title"
            className="w-full text-3xl font-black bg-transparent border-none focus:outline-none focus:ring-0 placeholder-zinc-300 dark:placeholder-zinc-700 mb-2"
          />
        </div>
        
        <div className="flex-1 w-full bg-white dark:bg-[#0f1115] z-0 pb-[100px]">
          <Editor 
            initialContent={note.content} 
            onUpdate={handleUpdate} 
          />
        </div>
      </div>
    </div>
  );
}
