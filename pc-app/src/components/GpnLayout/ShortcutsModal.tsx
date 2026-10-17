import React from 'react';
import { X, Keyboard } from 'lucide-react';

export interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl + Shift + N / C', desc: 'Gaurav Personal Notes Capture (works even when app is closed)' },
    { key: 'Ctrl + Shift + B', desc: 'Smart Burn: View-Once Encrypted Note' },
    { key: 'Ctrl + K', desc: 'Search notes' },
    { key: 'Ctrl + N', desc: 'Create new note in workspace' },
    { key: 'Ctrl + ,', desc: 'Settings' },
    { key: 'Ctrl + Enter', desc: 'Save & dismiss capture note' },
    { key: 'Ctrl + B / I', desc: 'Bold / Italic rich text formatting' },
    { key: 'Esc', desc: 'Close modals / return to workspace' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2px] shadow-xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Keyboard Shortcuts &amp; FAQ
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-[2px] text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
          {shortcuts.map((item, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between gap-4">
              <span className="text-zinc-600 dark:text-zinc-400">{item.desc}</span>
              <kbd className="px-2 py-1 rounded-[2px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 shrink-0">
                {item.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-50/70 dark:bg-zinc-950/70 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
          <span>Gaurav Personal Notes</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-[2px] bg-black dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 font-mono text-xs cursor-pointer transition-colors font-semibold"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};
