import { useEffect, useState, useRef } from 'react';
import { useNotesStore } from '../stores/notesStore';
import { notesService } from '../services/notesService';
import type { LocalNote } from '../types/note';
import { Search, X, FileText, ArrowRight } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNoteSelected?: () => void;
}

export const SearchModal = ({ isOpen, onClose, onNoteSelected }: SearchModalProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocalNote[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { selectNote } = useNotesStore();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const found = await notesService.searchNotes(query, false);
        setResults(found);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      selectNote(results[selectedIndex].id);
      if (onNoteSelected) onNoteSelected();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-start justify-center pt-20 px-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2px] shadow-2xl overflow-hidden flex flex-col max-h-[70vh] transition-colors"
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <Search className="w-4 h-4 text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search all notes using SQLite FTS5..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="px-1.5 py-0.5 rounded-[2px] bg-zinc-100 dark:bg-zinc-800 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
            Esc
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-zinc-400 dark:text-zinc-500 font-mono">Searching local SQLite index...</div>
          ) : results.length > 0 ? (
            <div className="space-y-1">
              {results.map((note, index) => {
                const isSelected = index === selectedIndex;
                const snippet = note.content
                  .replace(/<[^>]*>?/gm, '')
                  .trim()
                  .slice(0, 100);

                return (
                  <div
                    key={note.id}
                    onClick={() => {
                      selectNote(note.id);
                      if (onNoteSelected) onNoteSelected();
                      onClose();
                    }}
                    className={`flex items-start justify-between gap-3 p-3 rounded-[2px] cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <FileText
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          isSelected ? 'text-black dark:text-white' : 'text-zinc-400'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <h4
                          className={`text-xs font-semibold truncate ${
                            isSelected ? 'text-black dark:text-white' : 'text-zinc-800 dark:text-zinc-200'
                          }`}
                        >
                          {note.title || 'Untitled Note'}
                        </h4>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5 font-normal">
                          {snippet || 'Empty note'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-[10px] text-zinc-400 font-mono">
                      <span>{note.wordCount} words</span>
                      {isSelected && (
                        <ArrowRight className="w-3.5 h-3.5 text-black dark:text-white" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : query.trim() ? (
            <div className="p-8 text-center text-xs text-zinc-400 dark:text-zinc-500 font-mono">
              No matching notes found for &quot;{query}&quot;.
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-zinc-400 dark:text-zinc-500 font-mono">
              Type keywords to search across titles and note contents.
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500 select-none font-mono">
          <div className="flex items-center gap-2">
            <span>Navigation:</span>
            <kbd className="px-1 py-0.5 rounded-[2px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">↑</kbd>
            <kbd className="px-1 py-0.5 rounded-[2px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">↓</kbd>
          </div>
          <div className="flex items-center gap-2">
            <span>Open:</span>
            <kbd className="px-1.5 py-0.5 rounded-[2px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300">Enter</kbd>
          </div>
        </div>
      </div>
    </div>
  );
};
