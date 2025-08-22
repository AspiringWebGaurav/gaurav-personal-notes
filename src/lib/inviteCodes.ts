// src/lib/inviteCodes.ts
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export interface InviteCode {
  code: string;
  noteId: string;
  ownerUid: string;
  createdAt: any;
  expiresAt: any;
  used: boolean;
}

/**
 * Generates a simple 6-character invite code (letters and numbers)
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Creates a new invite code for a note
 */
export async function createInviteCode(noteId: string, ownerUid: string): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const code = generateInviteCode();
    
    // Check if code already exists
    const codeRef = doc(db, 'inviteCodes', code);
    const codeSnap = await getDoc(codeRef);
    
    if (!codeSnap.exists()) {
      // Code is unique, create it
      const inviteData: InviteCode = {
        code,
        noteId,
        ownerUid,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        used: false
      };
      
      await setDoc(codeRef, inviteData);
      return code;
    }
    
    attempts++;
  }
  
  throw new Error('Failed to generate unique invite code');
}

/**
 * Joins a note using an invite code
 */
export async function joinWithInviteCode(code: string, uid: string): Promise<{ success: boolean; error?: string; noteId?: string }> {
  try {
    // Get invite code document
    const codeRef = doc(db, 'inviteCodes', code.toUpperCase());
    const codeSnap = await getDoc(codeRef);
    
    if (!codeSnap.exists()) {
      return { success: false, error: 'Invalid invite code' };
    }
    
    const inviteData = codeSnap.data() as InviteCode;
    
    // Check if code is expired
    const now = new Date();
    const expiresAt = inviteData.expiresAt.toDate ? inviteData.expiresAt.toDate() : new Date(inviteData.expiresAt);
    
    if (expiresAt <= now) {
      return { success: false, error: 'Invite code has expired' };
    }
    
    // Check if code is already used
    if (inviteData.used) {
      return { success: false, error: 'Invite code has already been used' };
    }
    
    // Get the note
    const noteRef = doc(db, 'notes', inviteData.noteId);
    const noteSnap = await getDoc(noteRef);
    
    if (!noteSnap.exists()) {
      return { success: false, error: 'Note not found' };
    }
    
    const noteData = noteSnap.data();
    
    // Check if user is already a member
    if (noteData['members'] && noteData['members'].includes(uid)) {
      // Mark code as used and return success
      await updateDoc(codeRef, { used: true });
      return { success: true, noteId: inviteData.noteId };
    }
    
    // Check if room is full
    if (noteData['members'] && noteData['members'].length >= 2) {
      return { success: false, error: 'Room is full (maximum 2 members)' };
    }
    
    // Add user to note members
    const updatedMembers = noteData['members'] ? [...noteData['members'], uid] : [uid];
    
    await updateDoc(noteRef, {
      members: updatedMembers,
      updatedAt: serverTimestamp()
    });
    
    // Mark invite code as used
    await updateDoc(codeRef, { used: true });
    
    return { success: true, noteId: inviteData.noteId };
    
  } catch (error) {
    console.error('Error joining with invite code:', error);
    return { success: false, error: 'Failed to join note' };
  }
}

/**
 * Gets active invite code for a note (if any)
 */
export async function getActiveInviteCode(noteId: string, ownerUid: string): Promise<string | null> {
  try {
    const codesQuery = query(
      collection(db, 'inviteCodes'),
      where('noteId', '==', noteId),
      where('ownerUid', '==', ownerUid),
      where('used', '==', false)
    );
    
    const querySnapshot = await getDocs(codesQuery);
    
    for (const doc of querySnapshot.docs) {
      const inviteData = doc.data() as InviteCode;
      const now = new Date();
      const expiresAt = inviteData.expiresAt.toDate ? inviteData.expiresAt.toDate() : new Date(inviteData.expiresAt);
      
      if (expiresAt > now) {
        return inviteData.code;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting active invite code:', error);
    return null;
  }
}

/**
 * Validates if a user can create an invite for a note
 */
export async function canCreateInvite(noteId: string, uid: string): Promise<boolean> {
  try {
    const noteRef = doc(db, 'notes', noteId);
    const noteSnap = await getDoc(noteRef);
    
    if (!noteSnap.exists()) {
      return false;
    }
    
    const noteData = noteSnap.data();
    
    // Only owner can create invites and only if room has space
    return noteData['ownerUid'] === uid && 
           noteData['members'] && 
           noteData['members'].length < 2;
  } catch (error) {
    console.error('Error checking invite permissions:', error);
    return false;
  }
}