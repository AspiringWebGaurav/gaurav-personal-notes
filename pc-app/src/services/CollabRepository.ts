import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  getDocs,
  query,
  where,
  DocumentSnapshot,
} from 'firebase/firestore';

export interface ActiveRoom {
  roomId: string;
  updatedAt: number;
}

export function uint8ArrayToBase64(buffer: Uint8Array): string {
  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}

export class CollabRepository {
  private getDocRef(roomId: string) {
    return doc(db, 'collab_rooms', roomId);
  }

  async getRoom(
    roomId: string
  ): Promise<{ stateUpdate: string; deleted?: boolean; updatedAt?: number } | null> {
    const docRef = this.getDocRef(roomId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) {
      return null;
    }
    return snapshot.data() as {
      stateUpdate: string;
      deleted?: boolean;
      updatedAt?: number;
    };
  }

  async getActiveRooms(): Promise<ActiveRoom[]> {
    const q = query(collection(db, 'collab_rooms'), where('deleted', '==', false));
    const querySnapshot = await getDocs(q);

    const now = Date.now();
    const THREE_HOURS = 3 * 60 * 60 * 1000;

    const activeRooms: ActiveRoom[] = [];
    const roomsToDelete: string[] = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const updatedAt = data.updatedAt || 0;

      if (now - updatedAt > THREE_HOURS) {
        roomsToDelete.push(docSnap.id);
      } else {
        activeRooms.push({ roomId: docSnap.id, updatedAt });
      }
    });

    if (roomsToDelete.length > 0) {
      Promise.all(roomsToDelete.map((id) => this.deleteRoom(id))).catch(console.error);
    }

    return activeRooms.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Pure event-driven real-time listener (zero dumb polling):
   * Fires instantaneously whenever any peer creates, edits, or deletes a room on any device.
   */
  subscribeToActiveRooms(callback: (rooms: ActiveRoom[]) => void): () => void {
    const q = query(collection(db, 'collab_rooms'), where('deleted', '==', false));
    let currentDocs: DocumentSnapshot[] = [];

    const evaluate = () => {
      const now = Date.now();
      const THREE_HOURS = 3 * 60 * 60 * 1000;
      const activeRooms: ActiveRoom[] = [];
      const roomsToDelete: string[] = [];
      const deletingSet = new Set<string>();

      currentDocs.forEach((docSnap) => {
        const data = docSnap.data() as any;
        const updatedAt = data?.updatedAt || 0;

        if (now - updatedAt <= THREE_HOURS) {
          activeRooms.push({ roomId: docSnap.id, updatedAt });
        } else if (!deletingSet.has(docSnap.id)) {
          deletingSet.add(docSnap.id);
          roomsToDelete.push(docSnap.id);
        }
      });

      if (roomsToDelete.length > 0) {
        Promise.all(roomsToDelete.map((id) => this.deleteRoom(id))).catch(console.error);
      }

      callback(activeRooms.sort((a, b) => b.updatedAt - a.updatedAt));
    };

    const unsub = onSnapshot(
      q,
      (querySnapshot) => {
        currentDocs = querySnapshot.docs;
        evaluate();
      },
      (error) => {
        console.warn('[CollabRepository] Real-time snapshot listener error:', error);
        callback([]);
      }
    );

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        evaluate();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      evaluate();
    }, 180000);

    return () => {
      clearInterval(intervalId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      unsub();
    };
  }

  async saveRoom(roomId: string, stateUpdateBase64: string): Promise<void> {
    await setDoc(this.getDocRef(roomId), {
      stateUpdate: stateUpdateBase64,
      updatedAt: Date.now(),
      deleted: false,
    });
  }

  async deleteRoom(roomId: string): Promise<void> {
    await setDoc(this.getDocRef(roomId), { deleted: true });
  }

  /**
   * Real-time listener for room deletion / closure (zero polling)
   */
  listenToRoom(roomId: string, onDeleted: () => void): () => void {
    const docRef = this.getDocRef(roomId);
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.deleted) {
            onDeleted();
          }
        }
      },
      (error) => {
        console.warn('[CollabRepository] Room listener error:', error);
      }
    );
  }
}
