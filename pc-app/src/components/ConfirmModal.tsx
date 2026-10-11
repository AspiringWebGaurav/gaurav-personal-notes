import React, { useEffect } from 'react';
import { useConfirmStore } from '../stores/confirmStore';
import { Trash2, AlertTriangle, AlertCircle, X, CornerDownLeft } from 'lucide-react';

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
    badgeText,
  } = options;

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';

  return (
    <div
      onClick={handleCancel}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] bg-white dark:bg-[#0c0e14] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden transition-all duration-150 relative animate-in zoom-in-95 duration-150"
      >
        {/* Top Laser Glow Beam */}
        <div
          className={`absolute top-0 left-0 right-0 h-[2px] ${
            isDanger
              ? 'bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_14px_rgba(244,63,94,0.7)]'
              : isWarning
              ? 'bg-gradient-to-r from-transparent via-amber-500 to-transparent shadow-[0_0_14px_rgba(245,158,11,0.7)]'
              : 'bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_14px_rgba(16,185,129,0.7)]'
          }`}
        />

        {/* Header Close */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          {badgeText ? (
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                isDanger
                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                  : isWarning
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {badgeText}
            </span>
          ) : (
            <div />
          )}

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
        <div className="px-6 pb-6 pt-1 flex flex-col items-center text-center gap-3.5">
          {/* Icon Badge */}
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              isDanger
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
                : isWarning
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
            }`}
          >
            {isDanger ? (
              <Trash2 className="w-5 h-5" />
            ) : isWarning ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {title}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed font-normal">
              {description}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full pt-3">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>{cancelText}</span>
              <kbd className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Esc</kbd>
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              autoFocus
              className={`flex-1 py-2.5 px-4 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isDanger
                  ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-[0_0_18px_rgba(244,63,94,0.35)]'
                  : isWarning
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 shadow-[0_0_18px_rgba(245,158,11,0.35)]'
                  : 'bg-gradient-to-r from-emerald-600 to-[#76b900] hover:from-emerald-500 hover:to-[#88d600] text-zinc-950 shadow-[0_0_18px_rgba(118,185,0,0.35)]'
              }`}
            >
              <span>{confirmText}</span>
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
