"use client";

import { useAuthStore } from "@/features/auth/useAuthStore";
import { NotesRepository, Note } from "@/features/notes/NotesRepository";
import { CollabRepository } from "@/features/notes/CollabRepository";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { Book, Users, Flame, ChevronRight, Clock, Plus, LayoutGrid } from "lucide-react";

export default function MobileDashboardPage() {
  const { user } = useAuthStore();
  const [notes, setNotes] = useState<Note[]>([]);
  const [coopSessions, setCoopSessions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      const repo = new NotesRepository(user.uid);
      const unsub = repo.subscribeToNotes((newNotes) => {
        setNotes(newNotes);
        setLoading(false);
      });
      
      const collabRepo = new CollabRepository();
      const unsubCollab = collabRepo.subscribeToActiveRooms((rooms) => {
        setCoopSessions(rooms.length);
      });
      
      return () => {
        unsub();
        unsubCollab();
      };
    }
  }, [user]);

  const recentNotes = useMemo(() => {
    return [...notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5); // Limit on mobile
  }, [notes]);

  return (
    <div className="flex-1 p-4 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-violet-500/30 relative flex flex-col min-h-full">
      {/* Background ambient glows */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-cyan-500/10 dark:bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-fuchsia-500/10 dark:bg-fuchsia-500/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full h-full flex flex-col gap-6 relative z-10 pb-8">
        
        {/* Header Section */}
        <div className="flex flex-col gap-1 mt-2 animate-[fade-in_0.4s_ease-out]">
          <h1 className="text-3xl font-black tracking-tight">
            Hello, <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 via-violet-600 to-fuchsia-600 dark:from-cyan-400 dark:via-violet-400 dark:to-fuchsia-400">{user?.displayName?.split(' ')[0] || 'User'}</span>
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Your workspace at a glance.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl"></div>
            <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 mb-2 relative z-10">
              <div className="w-8 h-8 rounded-full bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center border border-cyan-100 dark:border-cyan-500/20">
                <Book size={16} className="stroke-[2.5]" />
              </div>
              <h3 className="font-bold text-zinc-500 dark:text-zinc-400 text-xs">Total Notes</h3>
            </div>
            <div className="text-3xl font-black text-zinc-900 dark:text-white relative z-10 tracking-tighter">
              {loading ? <span className="animate-pulse opacity-50">...</span> : notes.length}
            </div>
          </div>
          
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-violet-500/10 rounded-full blur-xl"></div>
            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-2 relative z-10">
              <div className="w-8 h-8 rounded-full bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center border border-violet-100 dark:border-violet-500/20">
                <Users size={16} className="stroke-[2.5]" />
              </div>
              <h3 className="font-bold text-zinc-500 dark:text-zinc-400 text-xs">Sessions</h3>
            </div>
            <div className="text-3xl font-black text-zinc-900 dark:text-white relative z-10 tracking-tighter">
              {loading ? <span className="animate-pulse opacity-50">...</span> : coopSessions}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col space-y-3">
          <h2 className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-zinc-400 ml-1">
            <LayoutGrid size={16} /> 
            Quick Actions
          </h2>
          
          <div className="grid grid-cols-1 gap-3">
            <Link href="/mobile/notes" className="p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex items-center gap-4 active:scale-95 transition-transform relative overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-sm border border-blue-100 dark:border-blue-500/20">
                <Plus size={24} className="stroke-[2.5]" />
              </div>
              <div className="flex flex-col justify-center flex-1">
                <p className="font-bold text-base text-zinc-900 dark:text-zinc-100">New Note</p>
                <p className="text-xs font-medium text-zinc-500">Create a private rich-text note</p>
              </div>
              <ChevronRight size={20} className="text-zinc-300" />
            </Link>

            <Link href="/mobile/collab" className="p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex items-center gap-4 active:scale-95 transition-transform relative overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0 shadow-sm border border-violet-100 dark:border-violet-500/20">
                <Users size={24} className="stroke-[2.5]" />
              </div>
              <div className="flex flex-col justify-center flex-1">
                <p className="font-bold text-base text-zinc-900 dark:text-zinc-100">Co-op Session</p>
                <p className="text-xs font-medium text-zinc-500">Join or start a live lobby</p>
              </div>
              <ChevronRight size={20} className="text-zinc-300" />
            </Link>

            <Link href="/mobile/burn" className="p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex items-center gap-4 active:scale-95 transition-transform relative overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0 shadow-sm border border-orange-100 dark:border-orange-500/20">
                <Flame size={24} className="stroke-[2.5]" />
              </div>
              <div className="flex flex-col justify-center flex-1">
                <p className="font-bold text-base text-zinc-900 dark:text-zinc-100">Smart Burn</p>
                <p className="text-xs font-medium text-zinc-500">Self-destructing links</p>
              </div>
              <ChevronRight size={20} className="text-zinc-300" />
            </Link>
          </div>
        </div>

        {/* Recent Notes */}
        <div className="flex flex-col space-y-3 mt-2">
          <h2 className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-zinc-400 ml-1">
            <Clock size={16} /> 
            Recent Notes
          </h2>
          
          <div className="flex flex-col bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden shadow-sm relative">
            {loading ? (
              <div className="p-8 flex items-center justify-center text-zinc-500">
                <div className="w-5 h-5 border-2 border-zinc-300 border-t-violet-500 rounded-full animate-spin" />
              </div>
            ) : recentNotes.length === 0 ? (
              <div className="p-8 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 mb-3">
                  <Book size={24} />
                </div>
                <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No notes yet</h3>
                <p className="text-xs text-zinc-500 mt-1">Tap &apos;New Note&apos; to start</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {recentNotes.map((note) => (
                  <Link 
                    key={note.id} 
                    href={`/mobile/notes/${note.id}`}
                    className="p-4 flex items-center justify-between active:bg-zinc-50 dark:active:bg-zinc-800/50"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 shrink-0">
                        <Book size={18} className="stroke-[2.5]" />
                      </div>
                      <div className="truncate">
                        <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">{note.title || 'Untitled Note'}</p>
                        <p className="text-xs font-medium text-zinc-500 mt-0.5">
                          {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-zinc-300" />
                  </Link>
                ))}
              </div>
            )}
            
            <div className="p-3 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-200/80 dark:border-zinc-800/80 text-center">
              <Link href="/mobile/notes" className="text-xs text-violet-600 dark:text-violet-400 font-bold uppercase tracking-widest">
                View All
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
