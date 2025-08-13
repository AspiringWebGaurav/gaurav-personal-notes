// src/components/auth/AuthProvider.tsx
'use client';

import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithGoogle, signOutUser, createUserDocument, auth, isUserNew, getUserFirstName, hasUserVisitedBefore, getUserDisplayName, handleRedirectResult } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
  isNewUser: boolean;
  userFirstName: string;
  hasVisitedBefore: boolean;
  userDisplayName: string;
  authMethod: 'popup' | 'redirect' | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [userFirstName, setUserFirstName] = useState('');
  const [hasVisitedBefore, setHasVisitedBefore] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState('');
  const [authMethod, setAuthMethod] = useState<'popup' | 'redirect' | null>(null);

  useEffect(() => {
    // Handle redirect result on app initialization
    const handleInitialRedirectResult = async () => {
      try {
        const result = await handleRedirectResult();
        if (result) {
          console.log('Redirect authentication successful');
          setAuthMethod('redirect');
        }
      } catch (error) {
        console.error('Error handling redirect result:', error);
        setError(error instanceof Error ? error.message : 'Redirect authentication failed');
      }
    };

    handleInitialRedirectResult();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      try {
        if (firebaseUser) {
          // Create or update user document in Firestore
          const result = await createUserDocument(firebaseUser);
          const visitedBefore = await hasUserVisitedBefore(firebaseUser);
          
          setUser(firebaseUser);
          setIsNewUser(result?.isNewUser || false);
          setUserFirstName(getUserFirstName(firebaseUser));
          setHasVisitedBefore(visitedBefore);
          setUserDisplayName(getUserDisplayName(firebaseUser));
        } else {
          setUser(null);
          setIsNewUser(false);
          setUserFirstName('');
          setHasVisitedBefore(false);
          setUserDisplayName('');
          setAuthMethod(null);
        }
      } catch (err) {
        console.error('Error handling auth state change:', err);
        setError(err instanceof Error ? err.message : 'Authentication error');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const authResult = await signInWithGoogle();
      
      if (authResult.method === 'popup') {
        setAuthMethod('popup');
        console.log('Popup authentication successful');
      } else if (authResult.method === 'redirect') {
        setAuthMethod('redirect');
        console.log('Redirecting for authentication...');
        // Note: The page will redirect, so this code won't continue
      }
    } catch (err: any) {
      console.error('Error signing in:', err);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to sign in';
      
      if (err.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked. Please allow popups and try again.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in was cancelled. Please try again.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.message?.includes('Cross-Origin-Opener-Policy')) {
        errorMessage = 'Authentication popup blocked. Trying alternative method...';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      setLoading(true);
      await signOutUser();
    } catch (err) {
      console.error('Error signing out:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
    error,
    isNewUser,
    userFirstName,
    hasVisitedBefore,
    userDisplayName,
    authMethod
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for checking if user is authenticated
export function useRequireAuth() {
  const { user, loading } = useAuth();
  
  return {
    user,
    loading,
    isAuthenticated: !!user,
    isUnauthenticated: !user && !loading
  };
}