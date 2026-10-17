import React, { useEffect } from 'react';
import { useConfirmStore } from '../stores/confirmStore';
import { AlertCircle, X } from 'lucide-react';

export const ConfirmModal: React.FC = () => {
  const { isOpen, options, handleConfirm, handleCancel } = useConfirmStore();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleConfirm, handleCancel]);

  if (!isOpen) return null;

  const {
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
  } = options;

  const isDanger = variant === 'danger';

  return (
    <div
      onClick={handleCancel}
      className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-100"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[380px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden relative animate-in zoom-in-95 duration-100"
      >
        {/* Header Close */}
        <div className="flex items-center justify-between px-5 pt-4 pb-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Confirmation
            </span>
          </div>

          <button
            type="button"
            onClick={handleCancel}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded-md transition-colors cursor-pointer"
            title="Cancel (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-5 pb-5 pt-3 space-y-4">
          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal">
                {description}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="py-1.5 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition cursor-pointer"
            >
              {cancelText}
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              autoFocus
              className={`py-1.5 px-3.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                isDanger
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:bg-black dark:hover:bg-white'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
