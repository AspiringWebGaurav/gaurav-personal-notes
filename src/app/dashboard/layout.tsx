"use client";

import { useAuthStore } from "@/features/auth/useAuthStore";
import { logout } from "@/features/auth/AuthProvider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { NotesRepository } from "@/features/notes/NotesRepository";
import { Book, LayoutDashboard, LogOut, Settings, Trash2, Flame, Users } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [activeNotesCount, setActiveNotesCount] = useState<number>(0);
  const [trashNotesCount, setTrashNotesCount] = useState<number>(0);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.uid) {
      const repo = new NotesRepository(user.uid);
      const unsubNotes = repo.subscribeToNotes((notes) => setActiveNotesCount(notes.length));
      const unsubTrash = repo.subscribeToTrash((notes) => setTrashNotesCount(notes.length));
      return () => {
        unsubNotes();
        unsubTrash();
      };
    }
  }, [user]);

  if (loading || !user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Logo animate size={80} />
        <p className="mt-8 text-slate-500 font-medium animate-pulse">Initializing Environment...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Global Sidebar */}
      <aside className="w-16 md:w-64 border-r border-slate-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-950/50 backdrop-blur-xl flex flex-col items-center md:items-stretch z-20">
        <Link href="/dashboard" className="h-20 flex items-center justify-center md:justify-start md:px-5 border-b border-slate-200/60 dark:border-gray-800/60 hover:opacity-80 transition-opacity gap-3">
          <Logo size={32} />
          <span className="font-black text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 hidden md:block mt-0.5">
            GPN
          </span>
        </Link>
        
        <nav className="flex-1 py-6 flex flex-col gap-1.5 w-full px-3">
          <Link 
            href="/dashboard" 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${pathname === '/dashboard' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-gray-800/50 text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-white'}`}
          >
            <LayoutDashboard size={20} className="shrink-0" />
            <span className="hidden md:block">Dashboard</span>
          </Link>
          <Link 
            href="/dashboard/notes" 
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 ${pathname?.startsWith('/dashboard/notes') ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-gray-800/50 text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-white'}`}
          >
            <div className="flex items-center gap-3">
              <Book size={20} className="shrink-0" />
              <span className="hidden md:block">Notes</span>
            </div>
            {activeNotesCount > 0 && (
              <span className={`hidden md:flex items-center justify-center text-[10px] font-bold px-2 py-0.5 rounded-full ${pathname?.startsWith('/dashboard/notes') ? 'bg-blue-200/50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300' : 'bg-slate-200 dark:bg-gray-700 text-slate-600 dark:text-slate-300'}`}>
                {activeNotesCount}
              </span>
            )}
          </Link>
          <Link 
            href="/dashboard/collab" 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${pathname?.startsWith('/dashboard/collab') ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-gray-800/50 text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-white'}`}
          >
            <Users size={20} className="shrink-0" />
            <span className="hidden md:block">Co-op Notes</span>
          </Link>
          <Link 
            href="/dashboard/burn" 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${pathname?.startsWith('/dashboard/burn') ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-gray-800/50 text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-white'}`}
          >
            <Flame size={20} className="shrink-0" />
            <span className="hidden md:block">Smart Burn</span>
          </Link>
          <Link 
            href="/dashboard/trash" 
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 ${pathname?.startsWith('/dashboard/trash') ? 'bg-slate-100 dark:bg-gray-800 text-slate-900 dark:text-white font-bold shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-gray-800/50 text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-white'}`}
          >
            <div className="flex items-center gap-3">
              <Trash2 size={20} className="shrink-0" />
              <span className="hidden md:block">Trash</span>
            </div>
            {trashNotesCount > 0 && (
              <span className={`hidden md:flex items-center justify-center text-[10px] font-bold px-2 py-0.5 rounded-full ${pathname?.startsWith('/dashboard/trash') ? 'bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-slate-300' : 'bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400'}`}>
                {trashNotesCount}
              </span>
            )}
          </Link>
        </nav>

        <div className="p-3 border-t border-slate-200/60 dark:border-gray-800/60 w-full flex flex-col gap-1.5 bg-slate-50/50 dark:bg-gray-950/50">
          <Link 
            href="/dashboard/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 font-medium w-full ${pathname?.startsWith('/dashboard/settings') ? 'bg-slate-200/50 dark:bg-gray-800 text-slate-900 dark:text-white shadow-sm' : 'hover:bg-slate-200/50 dark:hover:bg-gray-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
          >
             <Settings size={20} className="shrink-0" />
             <span className="hidden md:block">Settings</span>
          </Link>
          <button onClick={() => logout()} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 text-red-600 dark:hover:bg-red-500/10 dark:text-red-400 transition-all font-medium w-full group">
            <LogOut size={20} className="shrink-0 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden md:block ml-1">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden bg-white dark:bg-gray-950">
        {children}
      </main>
    </div>
  );
}
