import React from 'react';

export interface SegmentedToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export const SegmentedToggle: React.FC<SegmentedToggleProps> = ({
  enabled,
  onChange,
  disabled = false,
}) => {
  return (
    <div
      className={`inline-flex border border-zinc-300 dark:border-zinc-700 rounded-[2px] overflow-hidden bg-white dark:bg-zinc-900 select-none transition-opacity ${
        disabled ? 'opacity-50 pointer-events-none' : 'cursor-pointer'
      }`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(true)}
        className={`px-3 py-1 text-xs font-mono font-semibold tracking-wider transition-colors cursor-pointer ${
          enabled
            ? 'bg-black dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold'
            : 'bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800'
        }`}
      >
        ON
      </button>
      <div className="w-[1px] bg-zinc-300 dark:bg-zinc-700" />
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(false)}
        className={`px-3 py-1 text-xs font-mono font-semibold tracking-wider transition-colors cursor-pointer ${
          !enabled
            ? 'bg-black dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold'
            : 'bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800'
        }`}
      >
        OFF
      </button>
    </div>
  );
};
