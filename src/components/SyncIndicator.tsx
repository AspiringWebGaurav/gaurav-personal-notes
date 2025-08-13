'use client';

import { memo, useEffect, useState } from 'react';

export interface SyncIndicatorProps {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  hasUnsyncedChanges?: boolean;
  isOnline: boolean;
  className?: string;
}

type SyncState = 'syncing' | 'synced' | 'unsynced' | 'waiting';

const SyncIndicator = memo(function SyncIndicator({
  isSyncing,
  lastSyncTime,
  hasUnsyncedChanges,
  isOnline,
  className = ''
}: SyncIndicatorProps) {
  const [displayTime, setDisplayTime] = useState<string>('');

  // Determine sync state based on props
  const getSyncState = (): SyncState => {
    if (isSyncing) {
      return 'syncing';
    }
    
    if (!isOnline && hasUnsyncedChanges) {
      return 'unsynced';
    }
    
    if (lastSyncTime) {
      return 'synced';
    }
    
    // Online but no sync has happened yet
    return 'waiting';
  };

  const syncState = getSyncState();

  // Update display time when lastSyncTime changes
  useEffect(() => {
    if (syncState === 'synced' && lastSyncTime) {
      const timeString = lastSyncTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
      setDisplayTime(timeString);
    }
  }, [syncState, lastSyncTime]);

  const getStatusConfig = (state: SyncState) => {
    switch (state) {
      case 'syncing':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          dotColor: 'bg-blue-500',
          text: 'Syncing...',
          icon: '🔵',
          animated: true
        };
      case 'synced':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          dotColor: 'bg-green-500',
          text: `Last synced ${displayTime}`,
          icon: '🟢',
          animated: false
        };
      case 'unsynced':
        return {
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          dotColor: 'bg-orange-500',
          text: 'Unsynced changes',
          icon: '⚠️',
          animated: false
        };
      case 'waiting':
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          dotColor: 'bg-gray-500',
          text: 'Waiting to sync',
          icon: '⏳',
          animated: false
        };
    }
  };

  const config = getStatusConfig(syncState);

  return (
    <div
      className={`
        flex items-center px-2 py-1 rounded-md text-xs font-medium
        border transition-colors duration-150 ease-out
        ${config.color} ${className}
      `}
    >
      {/* Status indicator dot */}
      <div className="flex items-center mr-1.5">
        {config.animated ? (
          <div
            className={`w-1.5 h-1.5 rounded-full ${config.dotColor} animate-pulse`}
          />
        ) : (
          <div className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
        )}
      </div>

      {/* Status text */}
      <span className="whitespace-nowrap">
        {config.text}
      </span>
    </div>
  );
});

export default SyncIndicator;