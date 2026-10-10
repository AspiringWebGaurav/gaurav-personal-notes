"use client";

import { use, useEffect, useState, useRef, useCallback } from "react";
import { useAuthStore } from "@/features/auth/useAuthStore";
import { NotesRepository, Note } from "@/features/notes/NotesRepository";
import { db } from "@/core/config/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { Editor } from "@/features/notes/components/Editor";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NoteEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuthStore();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const repoRef = useRef<NotesRepository | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const titleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!user?.uid) return;
    const repo = new NotesRepository(user.uid);
    repoRef.current = repo;

    const unsubscribe = onSnapshot(doc(db, "users", user.uid, "notes", id), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setNote((prev) => ({
          id: snap.id,
          title: data.title ?? (prev?.title || "Untitled Note"),
          content: data.content ?? (prev?.content || ""),
          wordCount: typeof data.wordCount === "number" ? data.wordCount : (prev?.wordCount || 0),
          isArchived: Boolean(data.isArchived),
          createdAt: data.createdAt || Date.now(),
          updatedAt: data.updatedAt || Date.now(),
        }));
      }
      setLoading(false);
    }, (err) => {
      console.warn("Real-time note listener error:", err);
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
    };
  }, [user?.uid, id]);

  const handleUpdate = useCallback((content: string, newWordCount: number) => {
    // Keep local note state synchronized with editor content
    setNote((prev) => (prev ? { ...prev, content, wordCount: newWordCount } : null));

    // Debounce network save to prevent Firestore rate limits and lag
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (repoRef.current) {
        repoRef.current.updateNote(id, { content, wordCount: newWordCount }).catch((err) => {
          console.error("Failed to save note:", err);
        });
      }
    }, 1000);
  }, [id]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setNote((prev) => (prev ? { ...prev, title: newTitle } : null));

    if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
    titleTimeoutRef.current = setTimeout(() => {
      if (repoRef.current) {
        repoRef.current.updateNote(id, { title: newTitle.trim() || "Untitled Note" }).catch((err) => {
          console.error("Failed to save note title:", err);
        });
      }
    }, 350);
  };

  const handleDelete = async () => {
    if (repoRef.current) {
      await repoRef.current.moveToTrash(id);
      router.push("/dashboard/notes");
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!note) {
    return <div className="p-8 text-red-500">Note not found.</div>;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shrink-0 flex items-center gap-4">
        <input 
          type="text" 
          value={note.title} 
          onChange={handleTitleChange}
          className="text-2xl font-bold bg-transparent outline-none flex-1 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
          placeholder="Untitled Note"
        />

        <button 
          onClick={() => setIsDeleteModalOpen(true)}
          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition shrink-0"
          title="Delete Note"
        >
          <Trash2 size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
        <div className="max-w-4xl mx-auto h-full shadow-sm">
          <Editor 
            initialContent={note.content} 
            onUpdate={handleUpdate} 
          />
        </div>
      </div>

      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        title="Move to Trash"
        message="Are you sure you want to move this note to the trash? You can restore it later."
        confirmText="Move to Trash"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}
