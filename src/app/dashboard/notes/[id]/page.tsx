'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAutosave } from '@/hooks/useAutosave';
import { useSyncStatus } from '@/components/SyncStatusProvider';
import StaticSyncStatus from '@/components/StaticSyncStatus';
import { motion } from 'framer-motion';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Note } from '@/types';
import { getTemplateById } from '@/lib/templates';

interface NoteEditorProps {
  params: Promise<{ id: string }>;
}

export default function NoteEditor({ params }: NoteEditorProps) {
  // Unwrap the params Promise using React.use()
  const { id } = use(params);
  
  // All hooks must be called unconditionally at the top level
  const { user, loading } = useAuth();
  const { syncStatus } = useSyncStatus();
  const router = useRouter();
  const searchParams = useSearchParams();
  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  
  // State hooks
  const [note, setNote] = useState<Partial<Note>>({
    id: id,
    title: '',
    content: '',
    type: 'note',
    tags: [],
    isArchived: false,
    isPinned: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
  
  const [isLoading, setIsLoading] = useState(true);
  
  // Derived values
  const templateId = searchParams.get('template');
  
  // Auto-save functionality - always call this hook
  const { saveImmediately, isOnline, hasUnsyncedChanges } = useAutosave({
    id: id,
    collection: 'notes',
    data: note,
    enabled: !!user && !loading // Enable only when user is authenticated and not loading
  });

  // Effect for authentication redirect - must be called unconditionally
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Load note from Firestore or apply template
  useEffect(() => {
    if (!user || loading) return;

    // If template is specified, load template content
    if (templateId) {
      const template = getTemplateById(templateId);
      if (template) {
        setNote(prev => ({
          ...prev,
          title: template.title,
          content: template.content,
          type: template.type as 'note' | 'list' | 'todo',
          templateId: template.id
        }));
        setIsLoading(false);
        return;
      }
    }

    // Load existing note
    const noteRef = doc(db, 'users', user.uid, 'notes', id);
    const unsubscribe = onSnapshot(noteRef, (docSnap) => {
      if (docSnap.exists()) {
        const noteData = { id: docSnap.id, ...docSnap.data() } as Note;
        setNote(noteData);
      } else {
        // Check localStorage for offline data
        const localData = localStorage.getItem(`autosave:${user.uid}:${id}`);
        if (localData) {
          try {
            const parsedData = JSON.parse(localData);
            setNote(prev => ({ ...prev, ...parsedData }));
          } catch (error) {
            console.error('Error parsing local data:', error);
          }
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, loading, id, templateId]);

  // Remove the problematic interval that was causing "jumping like breathing" behavior
  // The sync status will now only update when actual sync events occur

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setNote(prev => ({ ...prev, title: newTitle }));
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setNote(prev => ({ ...prev, content: newContent }));
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Save on Ctrl+S
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      saveImmediately();
    }
  };

  const togglePin = () => {
    setNote(prev => ({ ...prev, isPinned: !prev.isPinned }));
  };

  const toggleArchive = () => {
    setNote(prev => ({ ...prev, isArchived: !prev.isArchived }));
  };

  const goBack = () => {
    router.push('/dashboard');
  };

  // Early returns after all hooks have been called
  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Editor */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Note Actions Bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={goBack}
              className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all"
              title="Go back to dashboard"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center space-x-2">
              <span className="text-xl">📝</span>
              <span className="text-lg font-medium text-gray-900">
                {note.title || 'Untitled Note'}
              </span>
            </div>
          </div>

          {/* Sync Status and Action buttons */}
          <div className="flex items-center space-x-3">
            {/* Static Sync Status - positioned left of pinned icon */}
            <StaticSyncStatus className="mr-2" />

            {/* Action buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={togglePin}
                className={`p-2 rounded-lg transition-colors ${
                  note.isPinned
                    ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
                title={note.isPinned ? 'Unpin note' : 'Pin note'}
              >
                📌
              </button>
              
              <button
                onClick={toggleArchive}
                className={`p-2 rounded-lg transition-colors ${
                  note.isArchived
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
                title={note.isArchived ? 'Unarchive note' : 'Archive note'}
              >
                📦
              </button>
            </div>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm min-h-[calc(100vh-200px)]"
        >
          <div className="p-8">
            {/* Title Input */}
            <input
              ref={titleRef}
              type="text"
              value={note.title || ''}
              onChange={handleTitleChange}
              onKeyDown={handleKeyDown}
              placeholder="Note title..."
              className="w-full text-3xl font-bold text-gray-900 placeholder-gray-400 border-none outline-none resize-none mb-6"
            />

            {/* Content Textarea */}
            <textarea
              ref={contentRef}
              value={note.content || ''}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              placeholder="Start writing..."
              className="w-full text-lg text-gray-700 placeholder-gray-400 border-none outline-none resize-none min-h-[500px] leading-relaxed"
              style={{ fontFamily: 'inherit' }}
            />
          </div>
        </motion.div>

        {/* Keyboard shortcuts help */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 text-center text-sm text-gray-500"
        >
          <p>
            Press <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl+S</kbd> to save manually
          </p>
        </motion.div>
      </main>
    </div>
  );
}