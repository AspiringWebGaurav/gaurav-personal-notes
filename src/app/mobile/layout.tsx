"use client";

import { BottomNav } from "./components/BottomNav";
import { OfflineBanner } from "./components/OfflineBanner";
import { useAuthStore } from "@/features/auth/useAuthStore";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname?.startsWith("/mobile/login") || false;
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !user && !isLoginPage) {
      router.push("/mobile/login");
    }
  }, [user, loading, router, isLoginPage]);

  return (
    <div className="fixed inset-0 flex flex-col bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      <OfflineBanner />

      {(!isMounted || (loading && !isLoginPage) || (!user && !isLoginPage)) && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <div className="w-10 h-10 border-4 border-zinc-200 dark:border-zinc-800 border-t-violet-500 rounded-full animate-spin"></div>
        </div>
      )}
      {/* 
        The pb-16 gives room for the fixed 16-h BottomNav at the bottom 
        h-[100dvh] ensures it takes exactly the dynamic viewport height, perfect for mobile browsers.
      */}
      <main className={`flex-1 flex flex-col w-full overflow-y-auto overflow-x-hidden min-h-0 scroll-smooth overscroll-y-contain [-webkit-overflow-scrolling:touch] ${!isLoginPage ? 'pb-16' : ''}`}>
        {children}
      </main>

      {!isLoginPage && <BottomNav />}
    </div>
  );
}
