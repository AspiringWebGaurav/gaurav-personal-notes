import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'gaurav-personal-notes.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'gaurav-personal-notes',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'gaurav-personal-notes.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '213415532994',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:213415532994:web:ec1234ede45d26aa331e5b',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://gaurav-personal-notes-default-rtdb.firebaseio.com',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = typeof window !== 'undefined'
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  : initializeFirestore(app, {});
const rtdb = getDatabase(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { app, auth, db, rtdb, googleProvider };
