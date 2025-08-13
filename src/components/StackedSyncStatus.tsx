'use client';

import { memo } from 'react';
import OnlineStatus from './OnlineStatus';
import SyncIndicator from './SyncIndicator';

export interface StackedSyncStatusProps {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  hasUnsyncedChanges?: boolean;
  className?: string;
}

const StackedSyncStatus = memo(function StackedSyncStatus({
  isOnline,
  isSyncing,
  lastSyncTime,
  hasUnsyncedChanges,
  className = ''
}: StackedSyncStatusProps) {
  return (
    <div className={`flex flex-col space-y-1 ${className}`}>
      {/* Online Status - Top */}
      <OnlineStatus 
        isOnline={isOnline}
      />
      
      {/* Sync Indicator - Bottom */}
      <SyncIndicator
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
        hasUnsyncedChanges={hasUnsyncedChanges}
        isOnline={isOnline}
      />
    </div>
  );
});

export default StackedSyncStatus;