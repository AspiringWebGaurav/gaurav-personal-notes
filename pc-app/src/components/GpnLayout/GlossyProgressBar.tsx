import React from 'react';

export interface GlossyProgressBarProps {
  progress?: number; // 0 to 100
  isIndeterminate?: boolean;
  className?: string;
  height?: string | number;
}

export const GlossyProgressBar: React.FC<GlossyProgressBarProps> = ({
  progress = 0,
  isIndeterminate = false,
  className = '',
  height,
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div
      role="progressbar"
      aria-valuenow={clampedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{ height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined }}
      className={`relative overflow-hidden rounded-[3px] border border-[#a4a4a4] dark:border-[#3f3f46] bg-gradient-to-b from-[#dcdcdc] via-[#e8e8e8] to-[#f5f5f5] dark:from-[#1c1c1f] dark:via-[#232326] dark:to-[#2a2a2e] shadow-[inset_0_1px_2px_rgba(0,0,0,0.22)] p-[1px] select-none ${className}`}
    >
      <div
        className="h-full rounded-[2px] transition-all duration-150 ease-out relative overflow-hidden"
        style={{
          width: isIndeterminate ? '100%' : `${clampedProgress}%`,
          background: 'linear-gradient(to bottom, #a2f84b 0%, #5fe624 45%, #2ad009 49%, #15a802 50%, #20be04 80%, #2bdc07 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85), inset 0 -1px 0 rgba(0,0,0,0.28), inset 1px 0 0 rgba(255,255,255,0.4)',
        }}
      >
        {/* Top glossy specular reflection highlight */}
        <div
          className="absolute inset-x-0 top-0 h-[45%] pointer-events-none opacity-80"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.15) 100%)',
          }}
        />
        {/* Subtle horizontal light shimmer if indeterminate */}
        {isIndeterminate && (
          <div
            className="absolute inset-0 w-full h-full animate-[pulse_1.5s_ease-in-out_infinite] opacity-30"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
            }}
          />
        )}
      </div>
    </div>
  );
};

export default GlossyProgressBar;
