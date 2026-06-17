import { db } from "@/core/config/firebase";
import { doc, getDoc, setDoc, onSnapshot, collection, getDocs, query, where } from "firebase/firestore";

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
    return doc(db, "collab_rooms", roomId);
  }

  async getRoom(roomId: string): Promise<{ stateUpdate: string, deleted?: boolean, updatedAt?: number } | null> {
    const docRef = this.getDocRef(roomId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) {
      return null;
    }
    return snapshot.data() as { stateUpdate: string, deleted?: boolean, updatedAt?: number };
  }

  async getActiveRooms(): Promise<ActiveRoom[]> {
    const q = query(collection(db, "collab_rooms"), where("deleted", "==", false));
    const querySnapshot = await getDocs(q);
    
    const now = Date.now();
    const THREE_HOURS = 3 * 60 * 60 * 1000;
    
    const activeRooms: ActiveRoom[] = [];
    const roomsToDelete: string[] = [];
    
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const updatedAt = data.updatedAt || 0;
      
      if (now - updatedAt > THREE_HOURS) {
        // Queue for deletion
        roomsToDelete.push(docSnap.id);
      } else {
        activeRooms.push({ roomId: docSnap.id, updatedAt });
      }
    });
    
    // Clean up expired rooms asynchronously
    Promise.all(roomsToDelete.map(id => this.deleteRoom(id))).catch(console.error);
    
    // Sort by most recently updated
    return activeRooms.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  subscribeToActiveRooms(callback: (rooms: ActiveRoom[]) => void): () => void {
    const q = query(collection(db, "collab_rooms"), where("deleted", "==", false));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentDocs: any[] = [];

    const evaluate = () => {
      const now = Date.now();
      const THREE_HOURS = 3 * 60 * 60 * 1000;
      const activeRooms: ActiveRoom[] = [];
      const roomsToDelete: string[] = [];
      
      currentDocs.forEach((docSnap) => {
        const data = docSnap.data();
        const updatedAt = data.updatedAt || 0;
        
        if (now - updatedAt <= THREE_HOURS) {
          activeRooms.push({ roomId: docSnap.id, updatedAt });
        } else {
          roomsToDelete.push(docSnap.id);
        }
      });
      
      // Auto-clean expired rooms so they drop from the active count
      Promise.all(roomsToDelete.map(id => this.deleteRoom(id))).catch(console.error);
      
      callback(activeRooms.sort((a, b) => b.updatedAt - a.updatedAt));
    };

    const unsub = onSnapshot(q, (querySnapshot) => {
      currentDocs = querySnapshot.docs;
      evaluate();
    });

    // Re-evaluate every 60 seconds to catch rooms that expire while the dashboard is open
    const intervalId = setInterval(evaluate, 60000);

    return () => {
      clearInterval(intervalId);
      unsub();
    };
  }



  async saveRoom(roomId: string, stateUpdateBase64: string): Promise<void> {
    await setDoc(this.getDocRef(roomId), {
      stateUpdate: stateUpdateBase64,
      updatedAt: Date.now(),
      deleted: false
    });
  }

  async deleteRoom(roomId: string): Promise<void> {
    // Mark as deleted so active listeners can immediately detect closure
    await setDoc(this.getDocRef(roomId), { deleted: true });
  }

  listenToRoom(roomId: string, onDeleted: () => void) {
    const docRef = this.getDocRef(roomId);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.deleted) {
          onDeleted();
        }
      }
    });
  }
}
