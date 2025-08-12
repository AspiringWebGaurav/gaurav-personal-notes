// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  setPersistence, 
  browserLocalPersistence,
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  collection, 
  addDoc,
  query,
  orderBy,
  Timestamp,
  deleteDoc,
  updateDoc
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Configure Google Auth provider
provider.setCustomParameters({
  prompt: 'select_account'
});

// Set persistence for auth state
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error('Error setting auth persistence:', error);
  });
}

// Auth functions
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    return result;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}

export async function signOutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

// Firestore helper functions
export const createUserDocument = async (user: User) => {
  if (!user) return { isNewUser: false };
  
  const userRef = doc(db, 'users', user.uid);
  
  try {
    // Check if user document already exists
    const { getDoc } = await import('firebase/firestore');
    const userDoc = await getDoc(userRef);
    const isNewUser = !userDoc.exists();
    
    const userData: {
      uid: string;
      email: string | null;
      displayName: string | null;
      photoURL: string | null;
      lastLoginAt: Timestamp;
      preferences: {
        theme: string;
        defaultTemplate: string;
        autoSaveInterval: number;
      };
      createdAt?: Timestamp;
    } = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastLoginAt: Timestamp.now(),
      preferences: {
        theme: 'light',
        defaultTemplate: 'quick-notes',
        autoSaveInterval: 300
      }
    };
    
    if (isNewUser) {
      // First time user - set createdAt
      userData.createdAt = Timestamp.now();
      await setDoc(userRef, userData);
    } else {
      // Existing user - only update lastLoginAt and other fields, preserve createdAt
      await setDoc(userRef, userData, { merge: true });
    }
    
    return { isNewUser };
  } catch (error) {
    console.error('Error creating user document:', error);
    return { isNewUser: false };
  }
};

// Helper function to check if user is new (created within last 5 minutes)
export const isUserNew = async (user: User): Promise<boolean> => {
  if (!user) return false;
  
  try {
    const { getDoc } = await import('firebase/firestore');
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return true;
    
    const userData = userDoc.data();
    const createdAt = userData.createdAt?.toDate();
    
    if (!createdAt) return false;
    
    // Check if user was created within the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return createdAt > fiveMinutesAgo;
  } catch (error) {
    console.error('Error checking if user is new:', error);
    return false;
  }
};

// Helper function to check if user has visited before (server-side detection)
export const hasUserVisitedBefore = async (user: User): Promise<boolean> => {
  if (!user) return false;
  
  try {
    const { getDoc } = await import('firebase/firestore');
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return false;
    
    const userData = userDoc.data();
    const createdAt = userData.createdAt?.toDate();
    const lastLoginAt = userData.lastLoginAt?.toDate();
    
    if (!createdAt || !lastLoginAt) return false;
    
    // If last login is significantly after creation, user has visited before
    const timeDifference = lastLoginAt.getTime() - createdAt.getTime();
    return timeDifference > 60000; // More than 1 minute difference
  } catch (error) {
    console.error('Error checking if user has visited before:', error);
    return false;
  }
};

// Enhanced function to get user's display name with fallback
export const getUserDisplayName = (user: User): string => {
  if (!user) return '';
  return user.displayName || user.email?.split('@')[0] || 'User';
};

// Helper function to get user's first name
export const getUserFirstName = (user: User): string => {
  if (!user?.displayName) return '';
  return user.displayName.split(' ')[0];
};

// Export types
export type { User };
export { onAuthStateChanged, Timestamp };