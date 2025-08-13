// src/hooks/useAutosave.ts
import { useEffect, useRef, useCallback } from 'react';
import { debounce } from 'lodash';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { AutosaveData, OfflineQueueItem } from '@/types';
import { useSyncStatus } from '@/components/SyncStatusProvider';

const LOCAL_KEY = (uid: string, id: string) => `autosave:${uid}:${id}`;
const QUEUE_KEY = (uid: string) => `writeQueue:${uid}`;
const LAST_SYNC_KEY = (uid: string) => `lastSync:${uid}`;

// Local storage utilities
const getLocalData = (uid: string, id: string): any => {
  try {
    const data = localStorage.getItem(LOCAL_KEY(uid, id));
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return null;
  }
};

const setLocalData = (uid: string, id: string, data: any): void => {
  try {
    localStorage.setItem(LOCAL_KEY(uid, id), JSON.stringify(data));
  } catch (error) {
    console.error('Error writing to localStorage:', error);
  }
};

const getOfflineQueue = (uid: string): OfflineQueueItem[] => {
  try {
    const queue = localStorage.getItem(QUEUE_KEY(uid));
    return queue ? JSON.parse(queue) : [];
  } catch (error) {
    console.error('Error reading offline queue:', error);
    return [];
  }
};

const addToOfflineQueue = (uid: string, item: OfflineQueueItem): void => {
  try {
    const queue = getOfflineQueue(uid);
    // Remove any existing item with same collection and id to avoid duplicates
    const filteredQueue = queue.filter(
      queueItem => !(queueItem.collection === item.collection && queueItem.id === item.id)
    );
    filteredQueue.push(item);
    localStorage.setItem(QUEUE_KEY(uid), JSON.stringify(filteredQueue));
  } catch (error) {
    console.error('Error adding to offline queue:', error);
  }
};

const clearOfflineQueue = (uid: string): void => {
  try {
    localStorage.removeItem(QUEUE_KEY(uid));
  } catch (error) {
    console.error('Error clearing offline queue:', error);
  }
};

// Flush offline queue to Firestore
const flushOfflineQueue = async (uid: string): Promise<void> => {
  const queue = getOfflineQueue(uid);
  if (queue.length === 0) return;

  console.log(`Flushing ${queue.length} items from offline queue`);

  const successfulItems: OfflineQueueItem[] = [];
  
  for (const item of queue) {
    try {
      // Validate that we have all required fields for a valid document reference
      if (!item.collection || !item.id) {
        console.warn('Skipping invalid queue item:', item);
        successfulItems.push(item); // Remove invalid items from queue
        continue;
      }
      
      const docRef = doc(db, 'users', uid, item.collection, item.id);
      
      if (item.operation === 'delete') {
        // Handle delete operation if needed
        continue;
      }
      
      await setDoc(docRef, {
        ...item.data,
        updatedAt: Timestamp.now()
      }, { merge: true });
      
      successfulItems.push(item);
      
      // Clear local backup after successful sync
      localStorage.removeItem(LOCAL_KEY(uid, item.id));
      
    } catch (error) {
      console.error('Error syncing item:', error);
      // Keep failed items in queue for next attempt
    }
  }

  // Remove successfully synced items from queue
  if (successfulItems.length > 0) {
    const remainingQueue = queue.filter(
      item => !successfulItems.some(
        success => success.collection === item.collection && success.id === item.id
      )
    );
    
    if (remainingQueue.length === 0) {
      clearOfflineQueue(uid);
    } else {
      localStorage.setItem(QUEUE_KEY(uid), JSON.stringify(remainingQueue));
    }
    
    // Update last sync timestamp
    localStorage.setItem(LAST_SYNC_KEY(uid), Date.now().toString());
  }
};

interface UseAutosaveOptions {
  id: string;
  collection: string;
  data: any;
  enabled?: boolean;
  debounceMs?: number;
}

export function useAutosave({
  id,
  collection,
  data,
  enabled = true,
  debounceMs = 300
}: UseAutosaveOptions) {
  const uid = auth.currentUser?.uid;
  const isOnlineRef = useRef(navigator.onLine);
  const lastSaveRef = useRef<string>('');
  const { startSyncing, finishSyncing, setOnlineStatus } = useSyncStatus();

  // Create debounced save function
  const debouncedSave = useRef(
    debounce(async (payload: any) => {
      if (!uid || !enabled || !id || !collection) return;

      // Skip if data hasn't changed
      const dataString = JSON.stringify(payload);
      if (dataString === lastSaveRef.current) return;
      
      lastSaveRef.current = dataString;

      // Start syncing indicator
      startSyncing(id);

      try {
        if (isOnlineRef.current) {
          // Try to save to Firestore
          const docRef = doc(db, 'users', uid, collection, id);
          await setDoc(docRef, {
            ...payload,
            updatedAt: Timestamp.now()
          }, { merge: true });
          
          // Clear local backup after successful save
          localStorage.removeItem(LOCAL_KEY(uid, id));
          
          // Successfully synced to Firestore
          
        } else {
          throw new Error('Offline - saving locally');
        }
      } catch (error) {
        console.log('Saving offline:', error instanceof Error ? error.message : 'Unknown error');
        
        // Save to localStorage
        setLocalData(uid, id, payload);
        
        // Add to offline queue
        addToOfflineQueue(uid, {
          collection,
          id,
          data: payload,
          operation: 'update',
          timestamp: Date.now()
        });
        
        // Data saved offline
      } finally {
        // Finish syncing indicator
        finishSyncing(id);
      }
    }, debounceMs)
  ).current;

  // Handle online/offline events
  const handleOnline = useCallback(async () => {
    isOnlineRef.current = true;
    setOnlineStatus(true);
    if (uid) {
      await flushOfflineQueue(uid);
    }
  }, [uid, setOnlineStatus]);

  const handleOffline = useCallback(() => {
    isOnlineRef.current = false;
    setOnlineStatus(false);
  }, [setOnlineStatus]);

  // Immediate save function for critical moments
  const saveImmediately = useCallback(async (payload?: any) => {
    if (!uid || !enabled || !id || !collection) return;
    
    const dataToSave = payload || data;
    
    // Start syncing indicator
    startSyncing(id);
    
    try {
      // Always save to localStorage first for immediate persistence
      setLocalData(uid, id, dataToSave);
      
      if (isOnlineRef.current) {
        const docRef = doc(db, 'users', uid, collection, id);
        await setDoc(docRef, {
          ...dataToSave,
          updatedAt: Timestamp.now()
        }, { merge: true });
        
        // Clear local backup after successful save
        localStorage.removeItem(LOCAL_KEY(uid, id));
      } else {
        // Add to offline queue
        addToOfflineQueue(uid, {
          collection,
          id,
          data: dataToSave,
          operation: 'update',
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error in immediate save:', error);
    } finally {
      // Finish syncing indicator
      finishSyncing(id);
    }
  }, [uid, id, collection, data, enabled, startSyncing, finishSyncing]);

  // Effect for debounced autosave
  useEffect(() => {
    if (!uid || !enabled || !data || !id || !collection) return;
    
    // Save to localStorage immediately for instant persistence
    setLocalData(uid, id, data);
    
    // Trigger debounced save
    debouncedSave(data);
  }, [uid, id, collection, data, enabled, debounceMs, debouncedSave]);

  // Effect for online/offline listeners
  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Handle page visibility change and beforeunload
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && uid && data) {
        // Immediate save when page becomes hidden
        setLocalData(uid, id, data);
      }
    };
    
    const handleBeforeUnload = () => {
      if (uid && data) {
        // Synchronous save to localStorage before page unload
        try {
          setLocalData(uid, id, data);
        } catch (error) {
          console.error('Error saving before unload:', error);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Flush queue on mount if online
    if (uid && isOnlineRef.current) {
      flushOfflineQueue(uid);
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      debouncedSave.cancel();
    };
  }, [uid, handleOnline, handleOffline, debouncedSave, id, data]);

  // Return utilities
  return {
    saveImmediately,
    isOnline: isOnlineRef.current,
    getLocalData: () => uid ? getLocalData(uid, id) : null,
    hasUnsyncedChanges: () => uid ? getOfflineQueue(uid).length > 0 : false,
    flushQueue: () => uid ? flushOfflineQueue(uid) : Promise.resolve()
  };
}

// Hook for managing offline sync status
export function useOfflineSync() {
  const uid = auth.currentUser?.uid;
  
  const getQueueLength = useCallback(() => {
    return uid ? getOfflineQueue(uid).length : 0;
  }, [uid]);
  
  const getLastSyncTime = useCallback(() => {
    if (!uid) return null;
    const timestamp = localStorage.getItem(LAST_SYNC_KEY(uid));
    return timestamp ? new Date(parseInt(timestamp)) : null;
  }, [uid]);
  
  const forceSync = useCallback(async () => {
    if (uid && navigator.onLine) {
      await flushOfflineQueue(uid);
    }
  }, [uid]);
  
  return {
    queueLength: getQueueLength(),
    lastSyncTime: getLastSyncTime(),
    forceSync,
    isOnline: navigator.onLine
  };
}