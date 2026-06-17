"use client";

import { useState, useEffect } from "react";
import { Palette, Shield, CheckCircle2, Monitor, Smartphone, Globe, Book, LogOut, AppWindow } from "lucide-react";
import { useAuthStore } from "@/features/auth/useAuthStore";
import { usePWA } from "@/hooks/usePWA";

import { logout } from "@/features/auth/AuthProvider";

export default function MobileSettingsPage() {
  const { user } = useAuthStore();
  const { isInstallable, isInstalled, promptInstall } = usePWA();
  const [saved, setSaved] = useState(false);

  // App Settings State
  const [theme, setTheme] = useState("system");
  const [notesSort, setNotesSort] = useState("updatedAt");

  useEffect(() => {
    setTheme(localStorage.getItem('app-theme') || 'system');
    setNotesSort(localStorage.getItem('notes-sort') || 'updatedAt');
  }, []);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
    const root = window.document.documentElement;
    if (newTheme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', isDark);
    } else {
      root.classList.toggle('dark', newTheme === 'dark');
    }
  };

  const handleNotesSortChange = (newSort: string) => {
    setNotesSort(newSort);
    localStorage.setItem('notes-sort', newSort);
    window.dispatchEvent(new Event('storage'));
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="flex flex-col min-h-full shrink-0 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 relative">
      <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-violet-500/10 rounded-full blur-[80px] pointer-events-none"></div>

      <div className="p-4 pb-24 space-y-6 relative z-10">
        
        {/* Header */}
        <div className="space-y-1 mt-4">
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400 tracking-tight">
            Settings
          </h1>
          <p className="text-sm font-medium text-zinc-500">Preferences & Profile.</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-violet-500/20 shrink-0">
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1 overflow-hidden">
            <h2 className="font-bold text-lg truncate">{user?.displayName || "Anonymous User"}</h2>
            <p className="text-sm text-zinc-500 truncate">{user?.email}</p>
          </div>
        </div>

        {/* Appearance */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-2 flex items-center gap-2">
            <Palette size={14} /> Appearance
          </h3>
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm overflow-hidden">
            <div className="p-4 flex gap-2">
              <button 
                onClick={() => handleThemeChange("system")}
                className={`flex-1 py-3 rounded-2xl flex flex-col items-center gap-2 font-bold text-xs transition-all ${
                  theme === 'system' 
                    ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-2 border-violet-500/20' 
                    : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-500 border-2 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <Monitor size={20} /> System
              </button>
              <button 
                onClick={() => handleThemeChange("light")}
                className={`flex-1 py-3 rounded-2xl flex flex-col items-center gap-2 font-bold text-xs transition-all ${
                  theme === 'light' 
                    ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-2 border-violet-500/20' 
                    : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-500 border-2 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <Globe size={20} /> Light
              </button>
              <button 
                onClick={() => handleThemeChange("dark")}
                className={`flex-1 py-3 rounded-2xl flex flex-col items-center gap-2 font-bold text-xs transition-all ${
                  theme === 'dark' 
                    ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-2 border-violet-500/20' 
                    : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-500 border-2 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <Smartphone size={20} /> Dark
              </button>
            </div>
          </div>
        </div>

        {/* Notes Preferences */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-2 flex items-center gap-2">
            <Book size={14} /> Notes Sorting
          </h3>
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm overflow-hidden flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
            <label className="p-4 flex items-center justify-between cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-800/50">
              <span className="font-bold text-sm">Last Modified</span>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${notesSort === "updatedAt" ? "border-violet-500" : "border-zinc-300 dark:border-zinc-600"}`}>
                {notesSort === "updatedAt" && <div className="w-2.5 h-2.5 bg-violet-500 rounded-full" />}
              </div>
              <input type="radio" className="hidden" checked={notesSort === "updatedAt"} onChange={() => handleNotesSortChange("updatedAt")} />
            </label>
            <label className="p-4 flex items-center justify-between cursor-pointer active:bg-zinc-50 dark:active:bg-zinc-800/50">
              <span className="font-bold text-sm">Alphabetical</span>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${notesSort === "title" ? "border-violet-500" : "border-zinc-300 dark:border-zinc-600"}`}>
                {notesSort === "title" && <div className="w-2.5 h-2.5 bg-violet-500 rounded-full" />}
              </div>
              <input type="radio" className="hidden" checked={notesSort === "title"} onChange={() => handleNotesSortChange("title")} />
            </label>
          </div>
        </div>

        {/* Security & Notifications Placeholder */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-2 flex items-center gap-2">
            <Shield size={14} /> Security
          </h3>
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm overflow-hidden flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
            <div className="p-4 flex items-center justify-between">
              <span className="font-bold text-sm">Two-Factor Auth</span>
              <button className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-xs font-bold rounded-full">Enable</button>
            </div>
            <div className="p-4 flex items-center justify-between">
              <span className="font-bold text-sm">Change Password</span>
              <button className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-xs font-bold rounded-full">Update</button>
            </div>
          </div>
        </div>


        {/* Application / PWA */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-2 flex items-center gap-2">
            <AppWindow size={14} /> Application
          </h3>
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm overflow-hidden flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
            <div className="p-4 flex items-center justify-between">
              <div>
                <span className="font-bold text-sm block">Install App</span>
                <span className="text-xs text-zinc-500">For offline access & native feel</span>
              </div>
              <button 
                onClick={promptInstall}
                disabled={isInstalled || !isInstallable}
                className={`px-3 py-1.5 text-xs font-bold rounded-full transition-colors shrink-0 ${
                  isInstalled 
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed' 
                    : isInstallable
                    ? 'bg-violet-500 hover:bg-violet-600 text-white shadow-sm'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                }`}
              >
                {isInstalled ? "Installed" : "Install App"}
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2">
          <button 
            onClick={handleSave}
            className="w-full py-4 bg-zinc-900 active:bg-zinc-800 dark:bg-white dark:active:bg-zinc-200 text-white dark:text-zinc-900 font-bold rounded-2xl shadow-md transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {saved ? <><CheckCircle2 size={20} className="text-emerald-500" /> Saved</> : "Save Preferences"}
          </button>
        </div>

        {/* Logout Button */}
        <div className="pt-4">
          <button 
            onClick={handleLogout}
            className="w-full py-4 bg-red-50 dark:bg-red-500/10 active:bg-red-100 dark:active:bg-red-500/20 text-red-600 dark:text-red-400 font-bold rounded-2xl shadow-sm transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <LogOut size={20} /> Logout
          </button>
        </div>

      </div>
    </div>
  );
}
