// src/components/auth/AuthProvider.tsx
'use client';

import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithGoogle, signOutUser, createUserDocument, auth, isUserNew, getUserFirstName, hasUserVisitedBefore, getUserDisplayName } from '@/lib/firebase';

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

  useEffect(() => {
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
      await signInWithGoogle();
    } catch (err) {
      console.error('Error signing in:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign in');
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
    userDisplayName
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