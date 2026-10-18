"use client";

import { useEffect } from "react";
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from "firebase/auth";
import { auth, googleProvider } from "@/core/config/firebase";
import { useAuthStore } from "./useAuthStore";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    // Process any returning redirect authentication results cleanly
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setUser(result.user);
          setLoading(false);
        }
      })
      .catch((error) => {
        const code = error?.code;
        if (code && code !== "auth/null-user" && code !== "auth/cancelled-popup-request") {
          console.warn("Firebase getRedirectResult status:", code);
        }
      });

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
    googleProvider.setCustomParameters({ prompt: "select_account" });
    const result = await signInWithPopup(auth, googleProvider);
    return result;
  } catch (error) {
    const err = error as { code?: string; message?: string };

    // Ignore intentional user cancellations
    if (
      err.code === "auth/popup-closed-by-user" ||
      err.code === "auth/cancelled-popup-request"
    ) {
      return null;
    }

    // Handle popup blocking or COOP restrictions
    if (
      err.code === "auth/popup-blocked" ||
      err.code === "auth/cross-origin-opener-policy-failed"
    ) {
      console.warn("Google Sign-In popup restricted by browser:", err.code);

      // In modern browsers, storage partitioning causes cross-origin signInWithRedirect
      // to fail with 'missing initial state' if redirected to firebaseapp.com.
      // If the user is on localhost or an IP address (e.g. mobile testing on 192.168.x.x),
      // cross-origin redirect is guaranteed to fail or be rejected by Google OAuth.
      const isIpOrLocal =
        typeof window !== "undefined" &&
        (/^(\d{1,3}\.){3}\d{1,3}$/.test(window.location.hostname) ||
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1");

      if (!isIpOrLocal && typeof window !== "undefined") {
        try {
          googleProvider.setCustomParameters({ prompt: "select_account" });
          await signInWithRedirect(auth, googleProvider);
          return null;
        } catch (redirectErr) {
          console.error("signInWithRedirect failed:", redirectErr);
        }
      }

      // If redirect cannot be safely run, throw a clear friendly error so UI can prompt user to tap again
      const friendlyError = new Error(
        "Pop-up was blocked. Please tap 'Continue with Google' again or allow pop-ups for this site."
      );
      (friendlyError as { code?: string }).code = "auth/popup-blocked";
      throw friendlyError;
    }

    console.error("Login failed:", error);
    throw error;
  }
};

export const logout = async () => {
  await signOut(auth);
};