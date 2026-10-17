import { create } from 'zustand';
import { notesService } from '../services/notesService';
import type { LocalNote } from '../types/note';
import { isMarkdownContent, parseMarkdownToHtml } from '../utils/markdownHelper';

interface NotesState {
  notes: LocalNote[];
  trashNotes: LocalNote[];
  activeNoteId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  searchQuery: string;
  isTrashView: boolean;
  saveStatus: 'Saved locally' | 'Saving...' | 'Error';

  // Actions
  loadNotes: (silent?: boolean) => Promise<void>;
  loadTrash: () => Promise<void>;
  selectNote: (id: string | null) => void;
  createNote: (title?: string, content?: string) => Promise<LocalNote>;
  updateNote: (id: string, updates: { title?: string; content?: string }) => Promise<void>;
  moveToTrash: (id: string) => Promise<void>;
  restoreFromTrash: (id: string) => Promise<void>;
  deletePermanently: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setTrashView: (isTrash: boolean) => void;
  performSearch: (query: string) => Promise<void>;
  clearDatabase: () => Promise<void>;
  toggleNoteSyncMode: (id: string) => Promise<void>;
  setNoteSyncMode: (id: string, isLocalOnly: boolean) => Promise<void>;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  trashNotes: [],
  activeNoteId: null,
  isLoading: false,
  isSaving: false,
  searchQuery: '',
  isTrashView: false,
  saveStatus: 'Saved locally',

  loadNotes: async (silent = false) => {
    if (!silent) set({ isLoading: true });
    try {
      const notes = await notesService.listNotes(false);
      let activeId = get().activeNoteId;

      // Only retain activeNoteId if it was already selected and still exists in notes list
      if (activeId && !notes.some((n) => n.id === activeId)) {
        activeId = null;
      }

      set({
        notes,
        isLoading: false,
        activeNoteId: activeId,
      });
    } catch (err) {
      console.error('Failed to load notes:', err);
      set({ isLoading: false });
    }
  },

  loadTrash: async () => {
    try {
      const trashNotes = await notesService.listNotes(true);
      set({ trashNotes });
    } catch (err) {
      console.error('Failed to load trash:', err);
    }
  },

  selectNote: (id: string | null) => {
    set({ activeNoteId: id });
  },

  createNote: async (title = 'Untitled Note', content = '') => {
    set({ isSaving: true, saveStatus: 'Saving...' });
    try {
      const formattedContent =
        content && !content.trim().startsWith('<') && isMarkdownContent(content)
          ? parseMarkdownToHtml(content)
          : content;

      const newNote = await notesService.createNote({
        title,
        content: formattedContent,
      });
      set((state) => ({
        notes: [newNote, ...state.notes],
        activeNoteId: newNote.id,
        isSaving: false,
        saveStatus: 'Saved locally',
      }));
      return newNote;
    } catch (err) {
      console.error('Failed to create note:', err);
      set({ isSaving: false, saveStatus: 'Error' });
      throw err;
    }
  },

  updateNote: async (id: string, updates: { title?: string; content?: string }) => {
    set({ isSaving: true, saveStatus: 'Saving...' });
    try {
      const wordCount = updates.content
        ? updates.content.trim().split(/\s+/).filter(Boolean).length
        : undefined;

      const updated = await notesService.updateNote(id, {
        title: updates.title,
        content: updates.content,
        wordCount,
      });

      set((state) => ({
        notes: state.notes.map((n) => (n.id === id ? updated : n)),
        isSaving: false,
        saveStatus: 'Saved locally',
      }));
    } catch (err) {
      console.error('Failed to update note:', err);
      set({ isSaving: false, saveStatus: 'Error' });
    }
  },

  moveToTrash: async (id: string) => {
    try {
      await notesService.moveToTrash(id);
      const remaining = get().notes.filter((n) => n.id !== id);
      const nextActive = remaining.length > 0 ? remaining[0].id : null;
      set({
        notes: remaining,
        activeNoteId: get().activeNoteId === id ? nextActive : get().activeNoteId,
      });
      await get().loadTrash();
    } catch (err) {
      console.error('Failed to move to trash:', err);
    }
  },

  restoreFromTrash: async (id: string) => {
    try {
      await notesService.restoreFromTrash(id);
      set((state) => ({
        trashNotes: state.trashNotes.filter((n) => n.id !== id),
      }));
      await get().loadNotes();
      set({ activeNoteId: id, isTrashView: false });
    } catch (err) {
      console.error('Failed to restore from trash:', err);
    }
  },

  deletePermanently: async (id: string) => {
    try {
      await notesService.deleteNotePermanently(id);
      set((state) => ({
        trashNotes: state.trashNotes.filter((n) => n.id !== id),
        activeNoteId: get().activeNoteId === id ? null : get().activeNoteId,
      }));
    } catch (err) {
      console.error('Failed to delete note permanently:', err);
    }
  },

  emptyTrash: async () => {
    try {
      await notesService.emptyTrash();
      set({ trashNotes: [], activeNoteId: null });
    } catch (err) {
      console.error('Failed to empty trash:', err);
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    if (!query.trim()) {
      get().loadNotes();
    } else {
      get().performSearch(query);
    }
  },

  setTrashView: (isTrash: boolean) => {
    set({ isTrashView: isTrash });
    if (isTrash) {
      get().loadTrash();
    } else {
      get().loadNotes();
    }
  },

  performSearch: async (query: string) => {
    if (!query.trim()) return;
    try {
      const results = await notesService.searchNotes(query, get().isTrashView);
      if (get().isTrashView) {
        set({ trashNotes: results });
      } else {
        set({ notes: results });
      }
    } catch (err) {
      console.error('FTS5 search failed:', err);
    }
  },

  clearDatabase: async () => {
    try {
      await notesService.clearLocalDatabase();
      set({ notes: [], trashNotes: [], activeNoteId: null, saveStatus: 'Saved locally' });
    } catch (err) {
      console.error('Failed to clear database:', err);
    }
  },

  setNoteSyncMode: async (id: string, isLocalOnly: boolean) => {
    try {
      const updated = await notesService.setNoteSyncMode(id, isLocalOnly);
      set((state) => ({
        notes: state.notes.map((n) => (n.id === id ? updated : n)),
      }));
    } catch (err) {
      console.error('Failed to set note sync mode:', err);
    }
  },

  toggleNoteSyncMode: async (id: string) => {
    const note = get().notes.find((n) => n.id === id);
    if (!note) return;
    const isCurrentlyLocalOnly = note.syncState === 'local_only';
    await get().setNoteSyncMode(id, !isCurrentlyLocalOnly);
  },
}));
