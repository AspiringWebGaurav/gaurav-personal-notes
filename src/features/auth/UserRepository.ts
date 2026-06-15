import { z } from "zod";
import { db } from "@/core/config/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

export const UserSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().optional().nullable(),
  preferences: z.record(z.string(), z.unknown()).optional().default({}),
  lastLoginAt: z.number(),
});

export type UserProfile = z.infer<typeof UserSchema>;

export class UserRepository {
  async getUser(uid: string): Promise<UserProfile | null> {
    const docRef = doc(db, "users", uid);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    
    const parsed = UserSchema.safeParse({ uid: snapshot.id, ...snapshot.data() });
    return parsed.success ? parsed.data : null;
  }

  async createUser(data: UserProfile): Promise<void> {
    const { uid, ...rest } = data;
    const docRef = doc(db, "users", uid);
    await setDoc(docRef, rest);
  }

  async updateUser(uid: string, data: Partial<Omit<UserProfile, "uid">>): Promise<void> {
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, data);
  }
}
