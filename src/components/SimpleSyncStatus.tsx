'use client';

import { memo, useEffect, useState, useRef } from 'react';

export interface SimpleSyncStatusProps {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  hasUnsyncedChanges?: boolean;
  className?: string;
}

type SyncState = 'syncing' | 'synced' | 'unsynced';

const SimpleSyncStatus = memo(function SimpleSyncStatus({
  isOnline,
  isSyncing,
  lastSyncTime,
  hasUnsyncedChanges,
  className = ''
}: SimpleSyncStatusProps) {
  const [displayTime, setDisplayTime] = useState<string>('');
  const lastSyncRef = useRef<Date | null>(null);

  // Determine sync state based on props - NEVER show online/offline status
  const getSyncState = (): SyncState => {
    if (isSyncing) {
      return 'syncing';
    }
    
    if (hasUnsyncedChanges) {
      return 'unsynced';
    }
    
    // Always default to synced - we don't care about online/offline status
    return 'synced';
  };

  const syncState = getSyncState();

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

  const getStatusConfig = (state: SyncState) => {
    switch (state) {
      case 'syncing':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          dotColor: 'bg-blue-500',
          text: 'Syncing...',
          animated: true
        };
      case 'synced':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          dotColor: 'bg-green-500',
          text: displayTime ? `Synced ${displayTime}` : 'Synced',
          animated: false
        };
      case 'unsynced':
        return {
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          dotColor: 'bg-orange-500',
          text: 'Unsynced changes',
          animated: false
        };
    }
  };

  const config = getStatusConfig(syncState);

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

export default SimpleSyncStatus;