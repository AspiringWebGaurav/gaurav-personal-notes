'use client';

import { memo } from 'react';

export interface StaticSyncStatusProps {
  className?: string;
}

const StaticSyncStatus = memo(function StaticSyncStatus({
  className = ''
}: StaticSyncStatusProps) {
  // Get current time in 12-hour IST format
  const getCurrentISTTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const currentTime = getCurrentISTTime();

  return (
    <div
      className={`
        flex items-center px-3 py-1.5 rounded-full text-sm font-medium
        border transition-colors duration-150 ease-out
        bg-green-100 text-green-800 border-green-200 ${className}
      `}
    >
      {/* Static green dot */}
      <div className="flex items-center mr-2">
        <div className="w-2 h-2 rounded-full bg-green-500" />
      </div>

      {/* "Last Synced" with IST timestamp */}
      <span className="whitespace-nowrap">
        Last Synced {currentTime}
      </span>
    </div>
  );
});

export default StaticSyncStatus;