import { z } from "zod";
import { db } from "@/core/config/firebase";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, onSnapshot } from "firebase/firestore";

const parseTimestamp = (val: unknown) => {
  if (val && typeof (val as { toMillis?: () => number }).toMillis === 'function') return (val as { toMillis: () => number }).toMillis();
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return new Date(val).getTime();
  return Date.now();
};

export const NoteSchema = z.object({
  id: z.string(),
  title: z.string().default("Untitled Note"),
  content: z.any().optional().default(""),
  isArchived: z.boolean().optional().default(false),
  createdAt: z.preprocess(parseTimestamp, z.number()),
  updatedAt: z.preprocess(parseTimestamp, z.number()),
});

export type Note = z.infer<typeof NoteSchema>;

export class NotesRepository {
  private uid: string;

  constructor(uid: string) {
    this.uid = uid;
  }

  private getCollectionRef() {
    // According to the legacy data map, notes are stored in users/{uid}/notes
    return collection(db, "users", this.uid, "notes");
  }

  private getDocRef(noteId: string) {
    return doc(db, "users", this.uid, "notes", noteId);
  }

  async getNote(noteId: string): Promise<Note | null> {
    const snapshot = await getDoc(this.getDocRef(noteId));
    if (!snapshot.exists()) return null;
    
    const parsed = NoteSchema.safeParse({ id: snapshot.id, ...snapshot.data() });
    return parsed.success ? parsed.data : null;
  }

  async getAllNotes(): Promise<Note[]> {
    const snapshot = await getDocs(this.getCollectionRef());
    return snapshot.docs
      .map(doc => {
        const parsed = NoteSchema.safeParse({ id: doc.id, ...doc.data() });
        return parsed.success ? parsed.data : null;
      })
      .filter((n): n is Note => n !== null);
  }

  subscribeToNotes(callback: (notes: Note[]) => void): () => void {
    const q = query(this.getCollectionRef(), where("isArchived", "==", false));
    return onSnapshot(q, (snapshot) => {
      const notes = snapshot.docs
        .map(doc => {
          const parsed = NoteSchema.safeParse({ id: doc.id, ...doc.data() });
          return parsed.success ? parsed.data : null;
        })
        .filter((n): n is Note => n !== null);
      callback(notes);
    });
  }

  async createNote(noteId: string, data: Omit<Note, "id">): Promise<void> {
    await setDoc(this.getDocRef(noteId), data);
  }

  async updateNote(noteId: string, data: Partial<Note>): Promise<void> {
    await updateDoc(this.getDocRef(noteId), { ...data, updatedAt: Date.now() });
  }

  async deleteNote(noteId: string): Promise<void> {
    await deleteDoc(this.getDocRef(noteId));
  }

  async moveToTrash(noteId: string): Promise<void> {
    await this.updateNote(noteId, { isArchived: true });
  }

  async restoreFromTrash(noteId: string): Promise<void> {
    await this.updateNote(noteId, { isArchived: false });
  }

  subscribeToTrash(callback: (notes: Note[]) => void): () => void {
    const q = query(this.getCollectionRef(), where("isArchived", "==", true));
    return onSnapshot(q, (snapshot) => {
      const notes = snapshot.docs
        .map(doc => {
          const parsed = NoteSchema.safeParse({ id: doc.id, ...doc.data() });
          return parsed.success ? parsed.data : null;
        })
        .filter((n): n is Note => n !== null);
      callback(notes);
    });
  }

  async emptyTrash(): Promise<void> {
    const q = query(this.getCollectionRef(), where("isArchived", "==", true));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);
  }
}
