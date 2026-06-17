"use client";

import { useEffect, useState, useCallback } from "react";

// Extend the window object to include the beforeinstallprompt event type
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
}

// Global state to store the prompt event
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(installable: boolean, installed: boolean) => void>();

function notifyListeners() {
  const isInstalled = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && window.navigator.standalone === true)
  );
  listeners.forEach(listener => listener(deferredPrompt !== null, isInstalled));
}

// Global initialization function to be called exactly once
export function initializePWA() {
  if (typeof window === "undefined") return;

  const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    notifyListeners();
  };

  const handleAppInstalled = () => {
    // Clear the deferredPrompt so it can be garbage collected
    deferredPrompt = null;
    notifyListeners();
  };

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', handleAppInstalled);
  
  // Initial check
  notifyListeners();

  return () => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', handleAppInstalled);
  };
}

export function usePWA() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Sync initial state
    const currentIsInstalled = typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && window.navigator.standalone === true)
    );
    setIsInstallable(deferredPrompt !== null);
    setIsInstalled(currentIsInstalled);

    const listener = (installable: boolean, installed: boolean) => {
      setIsInstallable(installable);
      setIsInstalled(installed);
    };

    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      console.warn("No PWA install prompt available.");
      return;
    }
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // We've used the prompt, and can't use it again, throw it away
    deferredPrompt = null;
    notifyListeners();
    
    return outcome; // 'accepted' or 'dismissed'
  }, []);

  return { isInstallable, isInstalled, promptInstall };
}
