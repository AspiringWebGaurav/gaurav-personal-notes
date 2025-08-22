// src/lib/share.ts
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface InviteToken {
  token: string;
  expiresAt: Timestamp;
  maxMembers: number;
}

/**
 * Ensures a note has a valid invite token, creating one if needed
 */
export async function ensureInvite(noteId: string): Promise<InviteToken> {
  const noteRef = doc(db, 'notes', noteId);
  const noteSnap = await getDoc(noteRef);
  
  if (!noteSnap.exists()) {
    throw new Error('Note not found');
  }
  
  const noteData = noteSnap.data();
  const existingInvite = noteData['invite'];
  
  // Check if existing invite is still valid
  if (existingInvite && existingInvite.expiresAt && existingInvite.token) {
    const now = new Date();
    const expiresAt = existingInvite.expiresAt.toDate();
    
    if (expiresAt > now) {
      return existingInvite as InviteToken;
    }
  }
  
  // Create new invite token
  const token = generateToken();
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)); // 24 hours
  
  const newInvite: InviteToken = {
    token,
    expiresAt,
    maxMembers: 2
  };
  
  await updateDoc(noteRef, {
    invite: newInvite,
    updatedAt: serverTimestamp()
  });
  
  return newInvite;
}

/**
 * Attempts to join a note using an invite token
 */
export async function joinNoteWithToken(noteId: string, uid: string, token: string): Promise<{ success: boolean; error?: string }> {
  try {
    const noteRef = doc(db, 'notes', noteId);
    const noteSnap = await getDoc(noteRef);
    
    if (!noteSnap.exists()) {
      return { success: false, error: 'Note not found' };
    }
    
    const noteData = noteSnap.data();
    
    // Validate invite token
    if (!noteData['invite'] || noteData['invite'].token !== token) {
      return { success: false, error: 'Invalid invite token' };
    }
    
    // Check if token is expired
    const now = new Date();
    const expiresAt = noteData['invite'].expiresAt.toDate();
    if (expiresAt <= now) {
      return { success: false, error: 'Invite token has expired' };
    }
    
    // Check if user is already a member
    if (noteData['members'] && noteData['members'].includes(uid)) {
      return { success: true }; // Already a member, that's fine
    }
    
    // Check if room is full
    if (noteData['members'] && noteData['members'].length >= 2) {
      return { success: false, error: 'Room is full (maximum 2 members)' };
    }
    
    // Add user to members array
    const updatedMembers = noteData['members'] ? [...noteData['members'], uid] : [uid];
    
    await updateDoc(noteRef, {
      members: updatedMembers,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error joining note with token:', error);
    return { success: false, error: 'Failed to join note' };
  }
}

/**
 * Generates a secure random token for invites
 */
function generateToken(): string {
  // Use Web Crypto API for browser compatibility
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
  
  // Fallback for server-side or older browsers
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = '';
  for (let i = 0; i < 43; i++) { // 43 chars ≈ 32 bytes base64url
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Creates a shareable invite URL
 */
export function createInviteUrl(noteId: string, token: string, origin: string): string {
  return `${origin}/share/${noteId}?t=${encodeURIComponent(token)}`;
}

/**
 * Validates if a user can access a note
 */
export async function validateNoteAccess(noteId: string, uid: string): Promise<{ hasAccess: boolean; note?: any }> {
  try {
    const noteRef = doc(db, 'notes', noteId);
    const noteSnap = await getDoc(noteRef);
    
    if (!noteSnap.exists()) {
      return { hasAccess: false };
    }
    
    const noteData = noteSnap.data();
    
    // Check if user is a member
    const hasAccess = noteData['members'] && noteData['members'].includes(uid);
    
    return { 
      hasAccess, 
      note: hasAccess ? { id: noteId, ...noteData } : undefined 
    };
  } catch (error) {
    console.error('Error validating note access:', error);
    return { hasAccess: false };
  }
}