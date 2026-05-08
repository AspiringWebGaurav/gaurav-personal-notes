'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Note } from '@/types';
import { Plus, Users, Search, Trash2, Pin, Archive, FileText, ChevronLeft, Loader2 } from 'lucide-react';

export default function AllNotesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'pinned' | 'archived'>('all');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      const notesQuery = query(
        collection(db, 'users', user.uid, 'notes'),
        orderBy('updatedAt', 'desc')
      );

      const unsubscribe = onSnapshot(notesQuery, (snapshot) => {
        const notesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Note[];
        setNotes(notesData);
        setIsLoading(false);
      });

      return () => unsubscribe();
    }

    return undefined;
  }, [user, loading, router]);

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase());

    switch (filterType) {
      case 'pinned':
        return matchesSearch && note.isPinned;
      case 'archived':
        return matchesSearch && note.isArchived;
      default:
        return matchesSearch && !note.isArchived;
    }
  });

  const handleDeleteNote = async (noteId: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'notes', noteId));
      setShowDeleteConfirm(false);
      setNoteToDelete(null);
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (!user || selectedNotes.size === 0) return;

    try {
      const deletePromises = Array.from(selectedNotes).map(noteId =>
        deleteDoc(doc(db, 'users', user.uid, 'notes', noteId))
      );
      await Promise.all(deletePromises);
      setSelectedNotes(new Set());
    } catch (error) {
      console.error('Error deleting notes:', error);
    }
  };

  const toggleNoteSelection = (noteId: string) => {
    const newSelected = new Set(selectedNotes);
    if (newSelected.has(noteId)) {
      newSelected.delete(noteId);
    } else {
      newSelected.add(noteId);
    }
    setSelectedNotes(newSelected);
  };

  const createNewNote = () => {
    const noteId = `note_${Date.now()}`;
    router.push(`/dashboard/notes/${noteId}`);
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400 dark:text-slate-500" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors text-slate-500 dark:text-slate-400"
                title="Go back to dashboard"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <FileText className="h-4 w-4" />
                </div>
                <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">All Notes</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {selectedNotes.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 text-xs font-medium rounded-md hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors border border-red-200 dark:border-red-900/50"
                >
                  Delete {selectedNotes.size} notes
                </button>
              )}
              <button
                onClick={() => router.push('/dashboard/collaborative')}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              >
                <Users className="w-4 h-4" />
                Collaborative
              </button>
              <button
                onClick={createNewNote}
                className="flex items-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-3 py-1.5 rounded-md hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors text-xs font-medium"
              >
                <Plus className="w-4 h-4" />
                New Note
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 space-y-4"
        >
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-700 placeholder:text-slate-400"
              />
            </div>
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-md">
              {(['all', 'pinned', 'archived'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setFilterType(filter)}
                  className={`px-3 py-1 rounded-[4px] text-xs font-medium transition-colors ${filterType === filter
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/50 dark:border-slate-700/50'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Notes Grid */}
        {filteredNotes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 text-slate-400 mb-4">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
              {searchQuery ? 'No notes found' : 'No notes yet'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-medium max-w-[250px]">
              {searchQuery
                ? 'Try adjusting your search terms or filters.'
                : 'Create your first note to capture your thoughts.'
              }
            </p>
            {!searchQuery && (
              <button
                onClick={createNewNote}
                className="flex items-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 rounded-md hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors text-xs font-medium"
              >
                <Plus className="w-4 h-4" />
                Create Note
              </button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredNotes.map((note) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm transition-all overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedNotes.has(note.id)}
                          onChange={() => toggleNoteSelection(note.id)}
                          className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-slate-900 dark:focus:ring-slate-100 bg-transparent"
                          title={`Select note: ${note.title || 'Untitled'}`}
                          aria-label={`Select note: ${note.title || 'Untitled'}`}
                        />
                        {note.isPinned && <Pin className="h-3 w-3 text-amber-500 fill-amber-500/20" />}
                        {note.isArchived && <Archive className="h-3 w-3 text-slate-400" />}
                      </div>
                      <button
                        onClick={() => {
                          setNoteToDelete(note.id);
                          setShowDeleteConfirm(true);
                        }}
                        className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all -m-1 p-1"
                        title="Delete note"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div
                      onClick={() => router.push(`/dashboard/notes/${note.id}`)}
                      className="cursor-pointer"
                    >
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2 truncate">
                        {note.title || 'Untitled'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mb-4 font-medium leading-relaxed">
                        {note.content ? note.content.substring(0, 150) + (note.content.length > 150 ? '...' : '') : 'Empty note'}
                      </p>
                      <div className="flex items-center justify-between text-[10px] font-medium text-slate-400 dark:text-slate-500 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                        <span className="uppercase tracking-wider">{note.type || 'NOTE'}</span>
                        <span>
                          {note.updatedAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-950 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full"
            >
              <div className="text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 mx-auto mb-4">
                  <Trash2 className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Delete Note
                </h3>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-6">
                  Are you sure you want to delete this note? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setNoteToDelete(null);
                    }}
                    className="flex-1 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-md hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => noteToDelete && handleDeleteNote(noteToDelete)}
                    className="flex-1 px-4 py-2 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}