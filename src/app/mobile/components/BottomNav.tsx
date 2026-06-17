"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, Users, Flame, Settings } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/mobile", icon: Home },
    { name: "Notes", href: "/mobile/notes", icon: FileText },
    { name: "Co-op", href: "/mobile/collab", icon: Users },
    { name: "Burn", href: "/mobile/burn", icon: Flame },
    { name: "Settings", href: "/mobile/settings", icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full h-16 bg-white dark:bg-[#0f1115] border-t border-gray-200 dark:border-gray-800 flex items-center justify-around px-2 z-50 pb-safe">
      {navItems.map((item) => {
        // Active check: Exact match for home, or starts with for others (so /mobile/notes/[id] still shows Notes active)
        const isActive = item.href === "/mobile" 
          ? pathname === "/mobile" 
          : pathname.startsWith(item.href);

        const Icon = item.icon;

        return (
          <Link 
            key={item.href} 
            href={item.href}
            className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${
              isActive 
                ? "text-violet-600 dark:text-violet-400" 
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            <div className={`relative ${isActive ? "scale-110 transition-transform" : ""}`}>
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              {isActive && (
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-600 dark:bg-violet-400" />
              )}
            </div>
            <span className="text-[10px] font-medium tracking-wide">
              {item.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
