"use client";

import { useEffect } from "react";
import { initializePWA } from "@/hooks/usePWA";

export function PWAProvider() {
  useEffect(() => {
    const cleanup = initializePWA();
    
    // Register service worker manually for Next.js App Router
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerSW = () => {
        navigator.serviceWorker.register('/sw.js').catch(err => {
          console.error('ServiceWorker registration failed: ', err);
        });
      };
      
      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
      }
    }

    return cleanup;
  }, []);

  return null;
}
