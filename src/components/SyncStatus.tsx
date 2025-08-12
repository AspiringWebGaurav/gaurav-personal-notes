'use client';

import { memo, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SyncStatusProps {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  hasUnsyncedChanges?: boolean;
  className?: string;
}

type SyncState = 'disconnected' | 'offline' | 'syncing' | 'synced';

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

  // Determine sync state with 1ms response time
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
      newState = 'offline';
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

  // Update display time for synced state
  useEffect(() => {
    if (syncState === 'synced' && lastSyncTime) {
      const updateTime = () => {
        setDisplayTime(lastSyncTime.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }));
      };

      updateTime();
      
      // Update every second to keep time current
      const interval = setInterval(updateTime, 1000);
      return () => clearInterval(interval);
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
      case 'syncing':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          dotColor: 'bg-blue-500',
          text: 'Live syncing...',
          icon: '🔵'
        };
      case 'synced':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          dotColor: 'bg-green-500',
          text: `Synced at ${displayTime}`,
          icon: '🟢'
        };
    }
  };

  const config = getStatusConfig(syncState);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={syncState}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ 
          duration: 0.15,
          ease: "easeOut"
        }}
        className={`
          flex items-center px-3 py-1.5 rounded-full text-sm font-medium
          border transition-all duration-150 ease-out
          ${config.color} ${className}
        `}
      >
        {/* Status indicator dot */}
        <div className="flex items-center mr-2">
          {syncState === 'syncing' ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ 
                duration: 1, 
                repeat: Infinity, 
                ease: "linear" 
              }}
              className={`w-2 h-2 rounded-full ${config.dotColor}`}
            />
          ) : (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                duration: 0.2,
                type: "spring",
                stiffness: 300
              }}
              className={`w-2 h-2 rounded-full ${config.dotColor}`}
            />
          )}
        </div>

        {/* Status text */}
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ 
            duration: 0.2,
            delay: 0.05
          }}
          className="whitespace-nowrap"
        >
          {config.text}
        </motion.span>
      </motion.div>
    </AnimatePresence>
  );
});

export default SyncStatus;