"use client";

import { use, useEffect, useState, useRef } from "react";
import { useAuthStore } from "@/features/auth/useAuthStore";
import { NotesRepository, Note } from "@/features/notes/NotesRepository";
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
  const router = useRouter();

  useEffect(() => {
    if (user?.uid) {
      const repo = new NotesRepository(user.uid);
      repoRef.current = repo;
      
      repo.getNote(id).then(fetchedNote => {
        setNote(fetchedNote);
        setLoading(false);
      });
    }
  }, [user, id]);

  const handleUpdate = (content: string) => {
    if (repoRef.current && note) {
      // Optimistic UI could go here
      repoRef.current.updateNote(id, { content }).catch(err => {
         console.error("Failed to save note:", err);
      });
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    if (note) setNote({ ...note, title: newTitle });
    
    if (repoRef.current) {
       repoRef.current.updateNote(id, { title: newTitle });
    }
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
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0 flex items-center gap-4">
        <input 
          type="text" 
          value={note.title} 
          onChange={handleTitleChange}
          className="text-2xl font-bold bg-transparent outline-none flex-1"
          placeholder="Untitled Note"
        />
        <button 
          onClick={() => setIsDeleteModalOpen(true)}
          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
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
