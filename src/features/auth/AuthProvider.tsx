"use client";

import { useEffect } from "react";
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";
import { auth, googleProvider } from "@/core/config/firebase";
import { useAuthStore } from "./useAuthStore";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);

  return <>{children}</>;
}

export const loginWithGoogle = async () => {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    const err = error as { code?: string };
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/cross-origin-opener-policy-failed') {
      await signInWithRedirect(auth, googleProvider);
    } else {
      // Don't trigger the Next.js dev overlay for intentional user cancellations
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        console.error("Login failed:", error);
      }
      throw error;
    }
  }
};

export const logout = async () => {
  await signOut(auth);
};
