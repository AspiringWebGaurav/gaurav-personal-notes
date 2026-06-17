"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function ViewportRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const isMobileViewport = window.innerWidth < 768;
      
      const isMobileRoute = pathname.startsWith('/mobile');
      const isDashboardRoute = pathname.startsWith('/dashboard');
      const isBurnRoute = pathname.startsWith('/burn');
      const isRootRoute = pathname === '/';

      if (isMobileViewport) {
        if (isRootRoute) {
          router.replace('/mobile');
        } else if (isDashboardRoute) {
          router.replace(pathname.replace('/dashboard', '/mobile'));
        } else if (isBurnRoute && !pathname.startsWith('/mobile/burn')) {
          router.replace(`/mobile${pathname}`);
        }
      } else {
        // Desktop viewport
        if (isMobileRoute) {
          if (pathname === '/mobile') {
            router.replace('/dashboard');
          } else if (pathname === '/mobile/login') {
            router.replace('/');
          } else if (pathname.startsWith('/mobile/burn')) {
            router.replace(pathname.replace('/mobile/burn', '/burn'));
          } else {
            router.replace(pathname.replace('/mobile', '/dashboard'));
          }
        }
      }
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pathname, router]);

  return null;
}
