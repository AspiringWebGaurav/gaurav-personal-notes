'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

interface SyncStatus {
  [x: string]: string;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  isOnline: boolean;
  syncingDocuments: Set<string>;
  hasUnsyncedChanges: boolean;
}

interface SyncStatusContextType {
  syncStatus: SyncStatus;
  startSyncing: (documentId: string) => void;
  finishSyncing: (documentId: string) => void;
  setOnlineStatus: (isOnline: boolean) => void;
  updateLastSyncTime: () => void;
}

const SyncStatusContext = createContext<SyncStatusContextType | undefined>(undefined);

interface SyncStatusProviderProps {
  children: ReactNode;
}

export function SyncStatusProvider({ children }: SyncStatusProviderProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncTime: null,
    isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
    syncingDocuments: new Set(),
    hasUnsyncedChanges: false,
  });

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: false }));
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const startSyncing = useCallback((documentId: string) => {
    setSyncStatus(prev => {
      const newSyncingDocuments = new Set(prev.syncingDocuments);
      newSyncingDocuments.add(documentId);
      return {
        ...prev,
        isSyncing: true,
        syncingDocuments: newSyncingDocuments,
      };
    });
  }, []);

  const finishSyncing = useCallback((documentId: string) => {
    setSyncStatus(prev => {
      const newSyncingDocuments = new Set(prev.syncingDocuments);
      newSyncingDocuments.delete(documentId);
      return {
        ...prev,
        isSyncing: newSyncingDocuments.size > 0,
        syncingDocuments: newSyncingDocuments,
        lastSyncTime: newSyncingDocuments.size === 0 ? new Date() : prev.lastSyncTime,
      };
    });
  }, []);


  const setOnlineStatus = useCallback((isOnline: boolean) => {
    setSyncStatus(prev => ({
      ...prev,
      isOnline,
    }));
  }, []);

  const updateLastSyncTime = useCallback(() => {
    setSyncStatus(prev => ({
      ...prev,
      lastSyncTime: new Date(),
    }));
  }, []);

  const value: SyncStatusContextType = {
    syncStatus,
    startSyncing,
    finishSyncing,
    setOnlineStatus,
    updateLastSyncTime,
  };

  return (
    <SyncStatusContext.Provider value={value}>
      {children}
    </SyncStatusContext.Provider>
  );
}

export function useSyncStatus(): SyncStatusContextType {
  const context = useContext(SyncStatusContext);
  if (context === undefined) {
    throw new Error('useSyncStatus must be used within a SyncStatusProvider');
  }
  return context;
}