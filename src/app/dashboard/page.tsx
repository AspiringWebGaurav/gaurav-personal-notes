"use client";

import { useAuthStore } from "@/features/auth/useAuthStore";
import { NotesRepository, Note } from "@/features/notes/NotesRepository";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { Book, Users, Flame, ChevronRight, Clock, Plus } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      const repo = new NotesRepository(user.uid);
      const unsub = repo.subscribeToNotes((newNotes) => {
        setNotes(newNotes);
        setLoading(false);
      });
      return () => unsub();
    }
  }, [user]);

  const totalWords = useMemo(() => {
    return notes.reduce((acc, note) => {
      // Very basic word count from plain text content
      const text = note.content.replace(/<[^>]*>?/gm, '');
      const words = text.trim().split(/\s+/).filter((w: string) => w.length > 0);
      return acc + words.length;
    }, 0);
  }, [notes]);

  const recentNotes = useMemo(() => {
    return [...notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);
  }, [notes]);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.displayName || 'User'}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Here is what is happening with your notes today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400 mb-4">
              <Book size={24} />
              <h3 className="font-semibold text-gray-700 dark:text-gray-300">Total Notes</h3>
            </div>
            <div className="text-4xl font-bold">
              {loading ? <span className="animate-pulse">...</span> : notes.length}
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 mb-4">
              <Users size={24} />
              <h3 className="font-semibold text-gray-700 dark:text-gray-300">Co-op Sessions</h3>
            </div>
            <div className="text-4xl font-bold">0</div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 mb-4">
              <Book size={24} /> {/* Placeholder for total words */}
              <h3 className="font-semibold text-gray-700 dark:text-gray-300">Words Written</h3>
            </div>
            <div className="text-4xl font-bold">
              {loading ? <span className="animate-pulse">...</span> : totalWords}
            </div>
          </div>
        </div>

        {/* Quick Actions & Recent Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Quick Actions */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/dashboard/notes" className="group p-5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-2xl border border-blue-100 dark:border-blue-900/50 transition flex flex-col items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-300 group-hover:scale-110 transition-transform">
                  <Plus size={20} />
                </div>
                <div className="font-semibold text-blue-900 dark:text-blue-100">New Note</div>
                <div className="text-sm text-blue-700 dark:text-blue-300">Create a private rich-text note.</div>
              </Link>
              
              <Link href="/dashboard/collab" className="group p-5 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 transition flex flex-col items-start gap-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-800 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-300 group-hover:scale-110 transition-transform">
                  <Users size={20} />
                </div>
                <div className="font-semibold text-indigo-900 dark:text-indigo-100">Co-op Session</div>
                <div className="text-sm text-indigo-700 dark:text-indigo-300">Join or start a live lobby.</div>
              </Link>

              <Link href="/dashboard/burn" className="group p-5 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/40 rounded-2xl border border-orange-100 dark:border-orange-900/50 transition flex flex-col items-start gap-3 sm:col-span-2">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-800 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-300 group-hover:scale-110 transition-transform">
                  <Flame size={20} />
                </div>
                <div className="font-semibold text-orange-900 dark:text-orange-100">Create Smart Burn</div>
                <div className="text-sm text-orange-700 dark:text-orange-300">Generate a secure view-once link that self-destructs upon opening.</div>
              </Link>
            </div>
          </div>

          {/* Recent Notes */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Clock size={20} className="text-gray-500" /> Recent Notes
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
              {loading ? (
                <div className="p-8 text-center text-gray-500 animate-pulse">Loading recent...</div>
              ) : recentNotes.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No notes yet. Create one!</div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {recentNotes.map(note => (
                    <Link 
                      key={note.id} 
                      href={`/dashboard/notes/${note.id}`}
                      className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 shrink-0">
                          <Book size={16} />
                        </div>
                        <div className="truncate">
                          <p className="font-medium truncate">{note.title || 'Untitled Note'}</p>
                          <p className="text-xs text-gray-500">{new Date(note.updatedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </Link>
                  ))}
                </div>
              )}
              <div className="p-3 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-200 dark:border-gray-800 text-center">
                <Link href="/dashboard/notes" className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">
                  View all notes
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
