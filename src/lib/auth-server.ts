// src/lib/auth-server.ts
import { NextRequest } from 'next/server';
import { auth } from './firebase';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env['NEXT_PUBLIC_FIREBASE_PROJECT_ID']!,
        clientEmail: process.env['FIREBASE_CLIENT_EMAIL']!,
        privateKey: process.env['FIREBASE_PRIVATE_KEY']?.replace(/\\n/g, '\n')!,
      }),
    });
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
  }
}

/**
 * Extracts and validates the Firebase ID token from the request
 * Returns the user's UID if valid, throws error if invalid
 */
export async function getUidFromRequest(req: NextRequest): Promise<string> {
  try {
    // Try to get token from Authorization header
    const authHeader = req.headers.get('authorization');
    let idToken: string | null = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      idToken = authHeader.substring(7);
    }
    
    // If no Authorization header, try to get from cookies (for browser requests)
    if (!idToken) {
      // In a real implementation, you might store the token in an httpOnly cookie
      // For now, we'll expect the token to be passed in the Authorization header
      throw new Error('No authentication token provided');
    }
    
    // Verify the ID token using Firebase Admin SDK
    const adminAuth = getAuth();
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    if (!decodedToken.uid) {
      throw new Error('Invalid token: no UID found');
    }
    
    return decodedToken.uid;
  } catch (error) {
    console.error('Error verifying auth token:', error);
    throw new Error('Authentication failed');
  }
}

/**
 * Alternative method for client-side requests where we can't use Firebase Admin
 * This is a simplified version that would need proper implementation
 */
export async function getUidFromClientRequest(req: NextRequest): Promise<string> {
  // In a production app, you'd want to implement proper session management
  // For this implementation, we'll rely on the client to send the UID
  // This is NOT secure for production use
  
  const body = await req.json().catch(() => ({}));
  const uid = body.uid || req.headers.get('x-user-id');
  
  if (!uid) {
    throw new Error('No user ID provided');
  }
  
  // In production, you'd validate this UID against a secure session
  return uid;
}

/**
 * Middleware helper to validate authentication
 */
export function withAuth(handler: (req: NextRequest, uid: string) => Promise<Response>) {
  return async (req: NextRequest) => {
    try {
      const uid = await getUidFromRequest(req);
      return await handler(req, uid);
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  };
}