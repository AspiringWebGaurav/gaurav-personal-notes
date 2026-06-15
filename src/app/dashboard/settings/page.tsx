"use client";

import { useState, useEffect } from "react";
import { User, Palette, Shield, Bell, CheckCircle2, Monitor, Smartphone, Globe, Book } from "lucide-react";
import { useAuthStore } from "@/features/auth/useAuthStore";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("appearance");
  const { user } = useAuthStore();
  const [saved, setSaved] = useState(false);

  // App Settings State
  const [theme, setTheme] = useState("system");
  const [notesSort, setNotesSort] = useState("updatedAt");

  useEffect(() => {
    setTheme(localStorage.getItem('app-theme') || 'system');
    setNotesSort(localStorage.getItem('notes-sort') || 'updatedAt');
  }, []);

  const handleSave = () => {
    // Theme is applied instantly, but we can flash a success checkmark anyway
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
    window.dispatchEvent(new Event('storage')); // trigger update in NotesList
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: <User size={18} /> },
    { id: "appearance", label: "Appearance", icon: <Palette size={18} /> },
    { id: "notes", label: "Notes Prefs", icon: <Book size={18} /> },
    { id: "security", label: "Security", icon: <Shield size={18} /> },
    { id: "notifications", label: "Notifications", icon: <Bell size={18} /> }
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-gray-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Manage your enterprise account preferences and security.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Sidebar Tabs */}
          <div className="w-full md:w-64 flex flex-col gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold ${
                  activeTab === tab.id 
                    ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-gray-800" 
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-gray-800 border border-transparent"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1">
            <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl p-6 md:p-8 shadow-sm">
              
              {activeTab === "profile" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Profile Details</h2>
                  <div className="flex items-center gap-6 pb-6 border-b border-slate-100 dark:border-gray-800">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-indigo-500/20">
                      {user?.email?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div>
                      <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-colors">
                        Change Avatar
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
                      <input 
                        type="email" 
                        disabled
                        value={user?.email || ""} 
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950 text-slate-500 dark:text-slate-400 focus:outline-none"
                      />
                      <p className="text-xs text-slate-500">Your email cannot be changed directly.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Display Name</label>
                      <input 
                        type="text" 
                        placeholder="John Doe"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-gray-800 bg-transparent text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "appearance" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Appearance</h2>
                  <p className="text-slate-500 dark:text-slate-400">Customize how GPN Enterprise looks on your device.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                    <button 
                      onClick={() => handleThemeChange("system")}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 font-bold transition-all relative overflow-hidden ${
                        theme === 'system' 
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' 
                          : 'border-slate-200 dark:border-gray-800 hover:border-slate-300 dark:hover:border-gray-700 bg-slate-50 dark:bg-gray-950 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {theme === 'system' && <div className="absolute inset-0 bg-indigo-500/5 dark:bg-indigo-500/10" />}
                      <Monitor size={28} />
                      System Match
                    </button>
                    <button 
                      onClick={() => handleThemeChange("light")}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 font-bold transition-all relative overflow-hidden ${
                        theme === 'light' 
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' 
                          : 'border-slate-200 dark:border-gray-800 hover:border-slate-300 dark:hover:border-gray-700 bg-slate-50 dark:bg-gray-950 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {theme === 'light' && <div className="absolute inset-0 bg-indigo-500/5 dark:bg-indigo-500/10" />}
                      <Globe size={28} />
                      Light Mode
                    </button>
                    <button 
                      onClick={() => handleThemeChange("dark")}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 font-bold transition-all relative overflow-hidden ${
                        theme === 'dark' 
                          ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' 
                          : 'border-slate-200 dark:border-gray-800 hover:border-slate-300 dark:hover:border-gray-700 bg-slate-50 dark:bg-gray-950 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {theme === 'dark' && <div className="absolute inset-0 bg-indigo-500/5 dark:bg-indigo-500/10" />}
                      <Smartphone size={28} />
                      Dark Mode
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "notes" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Notes Preferences</h2>
                  <p className="text-slate-500 dark:text-slate-400">Configure how your notes are organized and displayed.</p>

                  <div className="space-y-4 mt-6">
                    <div className="p-5 rounded-2xl border border-slate-200 dark:border-gray-800">
                      <h4 className="font-bold text-slate-900 dark:text-white mb-4">Default Sort Order</h4>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="notesSort" 
                            checked={notesSort === "updatedAt"} 
                            onChange={() => handleNotesSortChange("updatedAt")}
                            className="w-4 h-4 text-indigo-600"
                          />
                          <span className="text-slate-700 dark:text-slate-300 font-medium">Last Modified</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="notesSort" 
                            checked={notesSort === "title"} 
                            onChange={() => handleNotesSortChange("title")}
                            className="w-4 h-4 text-indigo-600"
                          />
                          <span className="text-slate-700 dark:text-slate-300 font-medium">Alphabetical</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "security" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Security & Access</h2>
                  <p className="text-slate-500 dark:text-slate-400">Manage your password and authentication methods.</p>
                  
                  <div className="space-y-4">
                    <div className="p-5 rounded-2xl border border-slate-200 dark:border-gray-800 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">Two-Factor Authentication</h4>
                        <p className="text-sm text-slate-500 mt-1">Add an extra layer of security to your account.</p>
                      </div>
                      <button className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors">
                        Enable
                      </button>
                    </div>
                    <div className="p-5 rounded-2xl border border-slate-200 dark:border-gray-800 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">Change Password</h4>
                        <p className="text-sm text-slate-500 mt-1">Update your login credentials securely.</p>
                      </div>
                      <button className="px-4 py-2 bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors">
                        Update
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "notifications" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Notification Preferences</h2>
                  <p className="text-slate-500 dark:text-slate-400">Choose what updates you want to receive.</p>

                  <div className="space-y-4 mt-6">
                    {["Email Alerts for Co-op Invites", "Daily Smart Burn Summaries", "Security and Login Alerts", "Marketing and Product Updates"].map((item, i) => (
                      <label key={i} className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-950/50 transition-colors cursor-pointer group border border-transparent hover:border-slate-200 dark:hover:border-gray-800">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{item}</span>
                        <div className={`w-12 h-6 rounded-full transition-colors relative ${i === 3 ? 'bg-slate-200 dark:bg-gray-700' : 'bg-indigo-500'}`}>
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${i === 3 ? 'left-1' : 'left-7'}`} />
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-gray-800 flex items-center justify-end">
                <button 
                  onClick={handleSave}
                  className="px-6 py-3 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black font-bold rounded-xl transition-all shadow-md flex items-center gap-2"
                >
                  {saved ? (
                    <><CheckCircle2 size={18} className="text-green-400 dark:text-green-600" /> Saved</>
                  ) : "Save Preferences"}
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
