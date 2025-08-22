// src/lib/presence.ts
import { getDatabase, ref, onDisconnect, set, serverTimestamp, update, onValue, off } from "firebase/database";
import { rtdb } from "./firebase";
import { User } from "firebase/auth";

export interface PresenceData {
  online: boolean;
  displayName: string;
  photoURL?: string | null;
  updatedAt: any;
  typing?: boolean;
}

/**
 * Sets user as online for a specific note and handles cleanup on disconnect
 */
export async function goOnline(noteId: string, user: User): Promise<() => void> {
  const uid = user.uid;
  const displayName = user.displayName || user.email?.split('@')[0] || 'Anonymous';
  const photoURL = user.photoURL;
  
  const presenceRef = ref(rtdb, `presence/${noteId}/${uid}`);
  
  // Set initial presence data
  const presenceData: PresenceData = {
    online: true,
    displayName,
    photoURL: photoURL || null,
    updatedAt: serverTimestamp()
  };
  
  await set(presenceRef, presenceData);
  
  // Set up disconnect handler to remove presence when user goes offline
  await onDisconnect(presenceRef).remove();
  
  // Set up heartbeat to keep presence alive
  const heartbeatInterval = setInterval(async () => {
    try {
      await update(presenceRef, { updatedAt: serverTimestamp() });
    } catch (error) {
      console.error('Error updating presence heartbeat:', error);
    }
  }, 30000); // Update every 30 seconds
  
  // Return cleanup function
  return () => {
    clearInterval(heartbeatInterval);
    set(presenceRef, null).catch(console.error);
  };
}

/**
 * Listens to presence changes for a specific note
 */
export function listenToPresence(
  noteId: string, 
  currentUserId: string,
  onPresenceChange: (presenceData: Record<string, PresenceData>) => void
): () => void {
  const presenceRef = ref(rtdb, `presence/${noteId}`);
  
  const unsubscribe = onValue(presenceRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      
      // Filter out stale presence data (older than 2 minutes)
      const now = Date.now();
      const filtered: Record<string, PresenceData> = {};
      
      Object.entries(data).forEach(([uid, presence]: [string, any]) => {
        if (presence && presence.updatedAt) {
          const lastSeen = typeof presence.updatedAt === 'number' 
            ? presence.updatedAt 
            : new Date(presence.updatedAt).getTime();
          
          // Keep presence data if it's less than 2 minutes old
          if (now - lastSeen < 120000) {
            filtered[uid] = presence as PresenceData;
          }
        }
      });
      
      onPresenceChange(filtered);
    } else {
      onPresenceChange({});
    }
  });
  
  return () => {
    off(presenceRef, 'value', unsubscribe);
  };
}

/**
 * Gets current presence data for a note
 */
export async function getPresence(noteId: string): Promise<Record<string, PresenceData>> {
  return new Promise((resolve) => {
    const presenceRef = ref(rtdb, `presence/${noteId}`);
    
    onValue(presenceRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        
        // Filter out stale presence data
        const now = Date.now();
        const filtered: Record<string, PresenceData> = {};
        
        Object.entries(data).forEach(([uid, presence]: [string, any]) => {
          if (presence && presence.updatedAt) {
            const lastSeen = typeof presence.updatedAt === 'number' 
              ? presence.updatedAt 
              : new Date(presence.updatedAt).getTime();
            
            if (now - lastSeen < 120000) {
              filtered[uid] = presence as PresenceData;
            }
          }
        });
        
        resolve(filtered);
      } else {
        resolve({});
      }
    }, { onlyOnce: true });
  });
}

/**
 * Updates typing status for a user
 */
export async function updateTypingStatus(noteId: string, uid: string, isTyping: boolean): Promise<void> {
  const presenceRef = ref(rtdb, `presence/${noteId}/${uid}`);
  
  try {
    await update(presenceRef, {
      typing: isTyping,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating typing status:', error);
  }
}

/**
 * Generates a consistent color for a user based on their UID
 */
export function getUserColor(uid: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length] || '#FF6B6B';
}