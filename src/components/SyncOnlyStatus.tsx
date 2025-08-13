'use client';

import { memo, useEffect, useState, useRef } from 'react';

export interface SyncOnlyStatusProps {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  hasUnsyncedChanges?: boolean;
  className?: string;
}

const SyncOnlyStatus = memo(function SyncOnlyStatus({
  isSyncing,
  lastSyncTime,
  hasUnsyncedChanges,
  className = ''
}: SyncOnlyStatusProps) {
  const [displayTime, setDisplayTime] = useState<string>('');
  const lastSyncRef = useRef<Date | null>(null);

  // Only update display time when lastSyncTime actually changes (not on every render)
  useEffect(() => {
    if (lastSyncTime && lastSyncTime !== lastSyncRef.current) {
      const timeString = lastSyncTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
      setDisplayTime(timeString);
      lastSyncRef.current = lastSyncTime;
    }
  }, [lastSyncTime]);

  // Determine what to show - NEVER show online/offline status
  const getStatusConfig = () => {
    if (isSyncing) {
      return {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        dotColor: 'bg-blue-500',
        text: 'Syncing...',
        animated: true
      };
    }
    
    if (hasUnsyncedChanges) {
      return {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        dotColor: 'bg-orange-500',
        text: 'Unsynced changes',
        animated: false
      };
    }
    
    // Default: show synced status
    return {
      color: 'bg-green-100 text-green-800 border-green-200',
      dotColor: 'bg-green-500',
      text: displayTime ? `Synced ${displayTime}` : 'Synced',
      animated: false
    };
  };

  const config = getStatusConfig();

  return (
    <div
      className={`
        flex items-center px-3 py-1.5 rounded-full text-sm font-medium
        border transition-colors duration-150 ease-out
        ${config.color} ${className}
      `}
    >
      {/* Status indicator dot */}
      <div className="flex items-center mr-2">
        {config.animated ? (
          <div
            className={`w-2 h-2 rounded-full ${config.dotColor} animate-pulse`}
          />
        ) : (
          <div className={`w-2 h-2 rounded-full ${config.dotColor}`} />
        )}
      </div>

      {/* Status text */}
      <span className="whitespace-nowrap">
        {config.text}
      </span>
    </div>
  );
});

export default SyncOnlyStatus;