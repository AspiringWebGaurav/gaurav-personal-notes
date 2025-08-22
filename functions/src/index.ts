// functions/src/index.ts
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp } from 'firebase-admin/app';

// Local types for Cloud Functions
interface CreateInviteCodeResponse {
  code: string;
}

interface JoinByCodeResponse {
  lobbyId: string;
  noteId: string;
}

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();
const auth = getAuth();

// Generate base36 code of specified length
function generateBase36Code(length: number): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// Create unique invite code with retry logic
async function createUniqueCode(): Promise<string> {
  const maxRetries = 10;
  let attempts = 0;
  let codeLength = 4;

  while (attempts < maxRetries) {
    const code = generateBase36Code(codeLength);
    
    // Check if code already exists
    const codeDoc = await db.collection('inviteCodes').doc(code).get();
    
    if (!codeDoc.exists) {
      return code;
    }
    
    attempts++;
    
    // Increase code length after 5 attempts
    if (attempts === 5) {
      codeLength = 5;
    } else if (attempts === 8) {
      codeLength = 6;
    }
  }
  
  throw new HttpsError('internal', 'Failed to generate unique invite code');
}

export const createInviteCode = onCall<{}, CreateInviteCodeResponse>(async (request: CallableRequest<{}>) => {
  // Verify authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const uid = request.auth.uid;

  try {
    // Check if user already has an active invite code
    const profileDoc = await db.collection('profiles').doc(uid).get();
    
    if (profileDoc.exists) {
      const profileData = profileDoc.data();
      if (profileData?.inviteCodeId) {
        // Check if existing code is still active
        const existingCodeDoc = await db.collection('inviteCodes').doc(profileData.inviteCodeId).get();
        if (existingCodeDoc.exists && existingCodeDoc.data()?.active) {
          return { code: profileData.inviteCodeId };
        }
      }
    }

    // Generate new unique code
    const code = await createUniqueCode();
    
    // Use transaction to ensure consistency
    await db.runTransaction(async (transaction: any) => {
      const codeRef = db.collection('inviteCodes').doc(code);
      const profileRef = db.collection('profiles').doc(uid);
      
      // Create invite code document
      transaction.set(codeRef, {
        ownerUid: uid,
        active: true,
        createdAt: Timestamp.now(),
        expiresAt: null // No expiration for now
      });
      
      // Update or create profile with invite code
      const userRecord = await auth.getUser(uid);
      const firstName = userRecord.displayName?.split(' ')[0] || 'Anonymous';
      
      transaction.set(profileRef, {
        uid,
        firstName,
        avatarUrl: userRecord.photoURL || null,
        inviteCodeId: code,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }, { merge: true });
    });

    return { code };
  } catch (error) {
    console.error('Error creating invite code:', error);
    throw new HttpsError('internal', 'Failed to create invite code');
  }
});

export const joinByCode = onCall<{ code: string }, JoinByCodeResponse>(async (request: CallableRequest<{ code: string }>) => {
  // Verify authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { code } = request.data;
  const joinerUid = request.auth.uid;

  if (!code || typeof code !== 'string' || code.length < 4 || code.length > 6) {
    throw new HttpsError('invalid-argument', 'Invalid invite code format');
  }

  try {
    // Validate invite code
    const codeDoc = await db.collection('inviteCodes').doc(code).get();
    
    if (!codeDoc.exists) {
      throw new HttpsError('not-found', 'Invite code not found');
    }
    
    const codeData = codeDoc.data();
    if (!codeData?.active) {
      throw new HttpsError('failed-precondition', 'Invite code is not active');
    }
    
    const hostUid = codeData.ownerUid;
    
    if (hostUid === joinerUid) {
      throw new HttpsError('invalid-argument', 'Cannot join your own invite code');
    }

    // Generate pair key for consistent lobby/note identification
    const pairKey = [hostUid, joinerUid].sort().join('__');
    
    let lobbyId: string = '';
    let noteId: string = '';

    // Use transaction to handle lobby and note creation
    await db.runTransaction(async (transaction: any) => {
      // Check if lobby already exists for this pair
      const existingLobbiesQuery = await db.collection('lobbies')
        .where('pairKey', '==', pairKey)
        .where('status', 'in', ['waiting', 'active'])
        .limit(1)
        .get();

      if (!existingLobbiesQuery.empty) {
        // Use existing lobby
        const existingLobby = existingLobbiesQuery.docs[0];
        lobbyId = existingLobby.id;
        noteId = existingLobby.data().noteId;
        
        // Update lobby status to active
        transaction.update(existingLobby.ref, {
          status: 'active',
          updatedAt: Timestamp.now()
        });
      } else {
        // Create new lobby and note
        const lobbyRef = db.collection('lobbies').doc();
        const noteRef = db.collection('collabNotes').doc();
        
        lobbyId = lobbyRef.id;
        noteId = noteRef.id;
        
        // Create collaborative note
        transaction.set(noteRef, {
          title: 'Collaborative Note',
          createdBy: hostUid,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        
        // Create lobby
        transaction.set(lobbyRef, {
          createdBy: hostUid,
          status: 'active',
          noteId,
          pairKey,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        
        // Add note members
        const hostMemberRef = db.collection('collabNotes').doc(noteId).collection('members').doc(hostUid);
        const joinerMemberRef = db.collection('collabNotes').doc(noteId).collection('members').doc(joinerUid);
        
        transaction.set(hostMemberRef, {
          role: 'owner',
          addedAt: Timestamp.now()
        });
        
        transaction.set(joinerMemberRef, {
          role: 'editor',
          addedAt: Timestamp.now()
        });
      }
      
      // Add lobby members
      const hostLobbyMemberRef = db.collection('lobbies').doc(lobbyId).collection('members').doc(hostUid);
      const joinerLobbyMemberRef = db.collection('lobbies').doc(lobbyId).collection('members').doc(joinerUid);
      
      transaction.set(hostLobbyMemberRef, {
        role: 'host',
        joinedAt: Timestamp.now()
      }, { merge: true });
      
      transaction.set(joinerLobbyMemberRef, {
        role: 'guest',
        joinedAt: Timestamp.now()
      });
      
      // Ensure joiner has a profile
      const joinerUserRecord = await auth.getUser(joinerUid);
      const joinerFirstName = joinerUserRecord.displayName?.split(' ')[0] || 'Anonymous';
      
      const joinerProfileRef = db.collection('profiles').doc(joinerUid);
      transaction.set(joinerProfileRef, {
        uid: joinerUid,
        firstName: joinerFirstName,
        avatarUrl: joinerUserRecord.photoURL || null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }, { merge: true });
    });

    return { lobbyId, noteId };
  } catch (error) {
    console.error('Error joining by code:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError('internal', 'Failed to join collaborative session');
  }
});