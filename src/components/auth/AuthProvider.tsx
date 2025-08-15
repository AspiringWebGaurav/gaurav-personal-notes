// src/components/auth/AuthProvider.tsx
"use client";

import {
  useState,
  useEffect,
  useContext,
  createContext,
  ReactNode,
} from "react";
import {
  User,
  onAuthStateChanged,
  signInWithGoogle,
  signOutUser,
  createUserDocument,
  auth,
  hasUserVisitedBefore,
  getUserFirstName,
  getUserDisplayName,
  handleRedirectResult,
} from "@/lib/firebase";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
  authMethod: "popup" | "redirect" | null;
  registerListener: (unsubscribeFn: () => void) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Global array of active listeners
let activeListeners: Array<() => void> = [];

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [userFirstName, setUserFirstName] = useState("");
  const [hasVisitedBefore, setHasVisitedBefore] = useState(false);
  const [userDisplayName, setUserDisplayName] = useState("");
  const [authMethod, setAuthMethod] = useState<"popup" | "redirect" | null>(
    null
  );

  // Helper to register unsubscribe functions
  const registerListener = (unsubscribeFn: () => void) => {
    activeListeners.push(unsubscribeFn);
  };

  // Stop all active Firestore listeners
  const stopAllListeners = () => {
    activeListeners.forEach((unsub) => unsub());
    activeListeners = [];
  };

  useEffect(() => {
    const handleInitialRedirectResult = async () => {
      try {
        const result = await handleRedirectResult();
        if (result) {
          console.log("Redirect authentication successful");
          setAuthMethod("redirect");
        }
      } catch (error) {
        console.error("Error handling redirect result:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Redirect authentication failed"
        );
      }
    };

    handleInitialRedirectResult();

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (firebaseUser: User | null) => {
        try {
          // Stop previous listeners on auth change
          stopAllListeners();

          if (firebaseUser) {
            const result = await createUserDocument(firebaseUser);
            const visitedBefore = await hasUserVisitedBefore(firebaseUser);

            setUser(firebaseUser);
            setIsNewUser(result?.isNewUser || false);
            setUserFirstName(getUserFirstName(firebaseUser));
            setHasVisitedBefore(visitedBefore);
            setUserDisplayName(getUserDisplayName(firebaseUser));

            // Listen to user document and register it
            const userDocRef = doc(db, "users", firebaseUser.uid);
            const unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
              if (doc.exists()) {
                const userData = doc.data();
                setUser((prevUser) => {
                  if (!prevUser) return prevUser;
                  return {
                    ...prevUser,
                    photoURL: userData.photoURL || prevUser.photoURL,
                    displayName: userData.displayName || prevUser.displayName,
                  };
                });
              }
            });

            registerListener(unsubscribeSnapshot);
          } else {
            // Reset all user data
            setUser(null);
            setIsNewUser(false);
            setUserFirstName("");
            setHasVisitedBefore(false);
            setUserDisplayName("");
            setAuthMethod(null);
          }
        } catch (err) {
          console.error("Error handling auth state change:", err);
          setError(err instanceof Error ? err.message : "Authentication error");
        } finally {
          setLoading(false);
        }
      }
    );

    return () => {
      unsubscribeAuth();
      stopAllListeners();
    };
  }, []);

  const signIn = async () => {
    try {
      setError(null);
      setLoading(true);
      const authResult = await signInWithGoogle();

      if (authResult.method === "popup") {
        setAuthMethod("popup");
        console.log("Popup authentication successful");
      } else if (authResult.method === "redirect") {
        setAuthMethod("redirect");
        console.log("Redirecting for authentication...");
      }
    } catch (err: any) {
      console.error("Error signing in:", err);
      let errorMessage = "Failed to sign in";
      if (err.code === "auth/popup-blocked")
        errorMessage = "Popup was blocked. Please allow popups and try again.";
      else if (err.code === "auth/popup-closed-by-user")
        errorMessage = "Sign-in was cancelled. Please try again.";
      else if (err.code === "auth/network-request-failed")
        errorMessage =
          "Network error. Please check your connection and try again.";
      else if (err.message?.includes("Cross-Origin-Opener-Policy"))
        errorMessage =
          "Authentication popup blocked. Trying alternative method...";
      else if (err instanceof Error) errorMessage = err.message;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      setLoading(true);

      // Stop all listeners before logging out
      stopAllListeners();

      await signOutUser();
    } catch (err) {
      console.error("Error signing out:", err);
      setError(err instanceof Error ? err.message : "Failed to sign out");
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
    authMethod,
    registerListener,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useRequireAuth() {
  const { user, loading } = useAuth();
  return {
    user,
    loading,
    isAuthenticated: !!user,
    isUnauthenticated: !user && !loading,
  };
}
