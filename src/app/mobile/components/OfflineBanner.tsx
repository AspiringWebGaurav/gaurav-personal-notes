"use client";

import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Initial check
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 w-full z-[100] bg-orange-500 text-white p-2 flex items-center justify-center gap-2 shadow-md animate-in slide-in-from-top-full duration-300">
      <WifiOff size={16} className="animate-pulse" />
      <span className="text-xs font-bold tracking-wide">You are offline. Changes will be saved locally.</span>
    </div>
  );
}
