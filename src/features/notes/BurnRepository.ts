import { db } from "@/core/config/firebase";
import { collection, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

export interface BurnNote {
  id: string;
  content: string;
  createdAt: number;
}

export class BurnRepository {
  private getCollectionRef() {
    return collection(db, "burn_notes");
  }

  private getDocRef(token: string) {
    return doc(db, "burn_notes", token);
  }

  /**
   * Creates a new burn note with the given token.
   */
  async createBurnNote(token: string, content: string): Promise<void> {
    await setDoc(this.getDocRef(token), {
      content,
      createdAt: Date.now()
    });
  }

  /**
   * Reads the note and IMMEDIATELY deletes it from the database (View-Once).
   * @returns The note content, or null if it doesn't exist.
   */
  async readAndBurn(token: string): Promise<string | null> {
    const docRef = this.getDocRef(token);
    const snapshot = await getDoc(docRef);
    
    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data() as BurnNote;
    
    // 🔥 BURN IT! Delete immediately after reading.
    await deleteDoc(docRef);

    return data.content;
  }
}
