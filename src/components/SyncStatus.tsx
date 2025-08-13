'use client';

import { memo, useEffect, useState, useRef } from 'react';

/**
 * @deprecated Use StackedSyncStatus instead for better UX separation of concerns.
 * This component combines online/offline status with sync status in a single badge,
 * which can be confusing for users. The new StackedSyncStatus provides:
 * - Clear separation between network connectivity and data synchronization
 * - Better visual hierarchy with stacked layout
 * - More intuitive user experience
 */
export interface SyncStatusProps {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  hasUnsyncedChanges?: boolean;
  className?: string;
}

type SyncState = 'disconnected' | 'offline' | 'online' | 'syncing' | 'synced';

const SyncStatus = memo(function SyncStatus({
  isOnline,
  isSyncing,
  lastSyncTime,
  hasUnsyncedChanges,
  className = ''
}: SyncStatusProps) {
  const [syncState, setSyncState] = useState<SyncState>('disconnected');
  const [displayTime, setDisplayTime] = useState<string>('');
  const lastStateRef = useRef<SyncState>('disconnected');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Determine sync state with priority order (removed typing logic)
  useEffect(() => {
    let newState: SyncState;

    if (!isOnline && hasUnsyncedChanges) {
      newState = 'disconnected';
    } else if (!isOnline) {
      newState = 'offline';
    } else if (isSyncing) {
      newState = 'syncing';
    } else if (lastSyncTime) {
      newState = 'synced';
    } else {
      // When online but no sync has happened yet
      newState = 'online';
    }

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Update state immediately for responsive feel
    if (newState !== lastStateRef.current) {
      setSyncState(newState);
      lastStateRef.current = newState;
    }
  }, [isOnline, isSyncing, lastSyncTime, hasUnsyncedChanges]);

  // Static time display - only updates when lastSyncTime changes
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
      case 'disconnected':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          dotColor: 'bg-red-500',
          text: 'Disconnected',
          icon: '🔴'
        };
      case 'offline':
        return {
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          dotColor: 'bg-orange-500',
          text: 'Offline',
          icon: '🟠'
        };
      case 'online':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          dotColor: 'bg-blue-500',
          text: 'Online',
          icon: '🔵'
        };
      case 'syncing':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          dotColor: 'bg-blue-500',
          text: 'Syncing...',
          icon: '🔵'
        };
      case 'synced':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          dotColor: 'bg-green-500',
          text: `Last synced at ${displayTime}`,
          icon: '🟢'
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
        {syncState === 'syncing' ? (
          <div
            className={`w-2 h-2 rounded-full ${config.dotColor} animate-spin`}
            style={{
              animation: 'spin 1s linear infinite'
            }}
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

export default SyncStatus;