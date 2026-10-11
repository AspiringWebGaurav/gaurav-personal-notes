import { invoke } from '@tauri-apps/api/core';
import type { CreateNoteInput, LocalNote, UpdateNoteInput } from '../types/note';
import { gphostService } from './gphostService';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

// Fallback in-memory / localStorage storage when running directly in browser (`npm run dev`)
const STORAGE_KEY = 'gpn_browser_notes';

function getLocalNotes(): LocalNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const notes: LocalNote[] = JSON.parse(raw);
    // Cleanse any legacy placeholder notes
    const freshNotes = notes.filter(
      (n) => n.id !== 'note-welcome-1' && !n.title.toLowerCase().includes('welcome to gaurav')
    );
    if (freshNotes.length !== notes.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(freshNotes));
    }
    return freshNotes;
  } catch {
    return [];
  }
}

function saveLocalNotes(notes: LocalNote[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

export const notesService = {
  async listNotes(isArchived = false): Promise<LocalNote[]> {
    if (isTauri) {
      return await invoke<LocalNote[]>('cmd_list_notes', { isArchived });
    }
    return getLocalNotes().filter((n) => n.isArchived === isArchived && !n.isDeleted);
  },

  async getNote(id: string): Promise<LocalNote | null> {
    if (isTauri) {
      return await invoke<LocalNote | null>('cmd_get_note', { id });
    }
    return getLocalNotes().find((n) => n.id === id) || null;
  },

  async createNote(input: CreateNoteInput): Promise<LocalNote> {
    const title = input.title || 'Untitled Note';
    const content = input.content || '';

    if (isTauri) {
      return await invoke<LocalNote>('cmd_create_note', {
        title,
        content,
        customId: input.id || null,
      });
    }

    const newNote: LocalNote = {
      id: input.id || 'note-' + Date.now(),
      userId: 'local-user',
      title,
      content,
      wordCount: content.split(/\s+/).filter(Boolean).length,
      isArchived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      remoteUpdatedAt: 0,
      syncVersion: 1,
      syncState: 'pending',
      isDeleted: false,
      deletedAt: null,
    };
    const notes = [newNote, ...getLocalNotes()];
    saveLocalNotes(notes);
    return newNote;
  },

  async updateNote(id: string, input: UpdateNoteInput): Promise<LocalNote> {
    if (isTauri) {
      return await invoke<LocalNote>('cmd_update_note', {
        id,
        title: input.title,
        content: input.content,
        wordCount: input.wordCount,
      });
    }

    const notes = getLocalNotes();
    const idx = notes.findIndex((n) => n.id === id);
    if (idx === -1) throw new Error('Note not found');

    const updated: LocalNote = {
      ...notes[idx],
      title: input.title !== undefined ? (input.title || 'Untitled Note') : notes[idx].title,
      content: input.content !== undefined ? (input.content || '') : notes[idx].content,
      wordCount:
        input.wordCount !== undefined
          ? input.wordCount
          : (input.content ? input.content.split(/\s+/).filter(Boolean).length : notes[idx].wordCount),
      updatedAt: Date.now(),
    };
    notes[idx] = updated;
    saveLocalNotes(notes);
    return updated;
  },

  async moveToTrash(id: string): Promise<boolean> {
    if (isTauri) {
      await invoke<void>('cmd_move_to_trash', { id });
      return true;
    }
    const notes = getLocalNotes().map((n) =>
      n.id === id ? { ...n, isArchived: true, updatedAt: Date.now() } : n
    );
    saveLocalNotes(notes);
    return true;
  },

  async restoreFromTrash(id: string): Promise<boolean> {
    if (isTauri) {
      await invoke<void>('cmd_restore_from_trash', { id });
      return true;
    }
    const notes = getLocalNotes().map((n) =>
      n.id === id ? { ...n, isArchived: false, updatedAt: Date.now() } : n
    );
    saveLocalNotes(notes);
    return true;
  },

  async deleteNotePermanently(id: string): Promise<boolean> {
    try {
      const note = await this.getNote(id);
      if (note && note.content) {
        const media = gphostService.extractGphostMedia(note.content);
        if (media.length > 0) {
          gphostService.deleteMediaBatch(media).catch(console.warn);
        }
      }
    } catch {}

    if (isTauri) {
      await invoke<void>('cmd_delete_note_permanently', { id });
      return true;
    }
    const notes = getLocalNotes().filter((n) => n.id !== id);
    saveLocalNotes(notes);
    return true;
  },

  async emptyTrash(): Promise<number> {
    try {
      const allTrash = await this.listNotes(true);
      for (const note of allTrash) {
        if (note.content) {
          const media = gphostService.extractGphostMedia(note.content);
          if (media.length > 0) {
            gphostService.deleteMediaBatch(media).catch(console.warn);
          }
        }
      }
    } catch {}

    if (isTauri) {
      return await invoke<number>('cmd_empty_trash');
    }
    const remaining = getLocalNotes().filter((n) => !n.isArchived);
    const count = getLocalNotes().length - remaining.length;
    saveLocalNotes(remaining);
    return count;
  },

  async searchNotes(query: string, isArchived = false): Promise<LocalNote[]> {
    if (isTauri) {
      return await invoke<LocalNote[]>('cmd_search_notes', { query, isArchived });
    }
    const q = query.toLowerCase();
    return getLocalNotes().filter(
      (n) =>
        n.isArchived === isArchived &&
        (n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
    );
  },

  async setNoteSyncMode(id: string, isLocalOnly: boolean): Promise<LocalNote> {
    if (isTauri) {
      return await invoke<LocalNote>('cmd_set_note_sync_mode', { id, isLocalOnly });
    }
    const notes = getLocalNotes();
    const idx = notes.findIndex((n) => n.id === id);
    if (idx === -1) throw new Error('Note not found');
    const updated: LocalNote = {
      ...notes[idx],
      syncState: isLocalOnly ? 'local_only' : 'pending',
      updatedAt: Date.now(),
    };
    notes[idx] = updated;
    saveLocalNotes(notes);
    return updated;
  },

  async clearLocalDatabase(): Promise<void> {
    if (isTauri) {
      await invoke<void>('cmd_clear_local_database');
    }
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  },

  async reindexSearch(): Promise<void> {
    if (isTauri) {
      await invoke<void>('cmd_reindex_notes');
    }
  },
};
