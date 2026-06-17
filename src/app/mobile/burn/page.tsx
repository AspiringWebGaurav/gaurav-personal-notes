"use client";

import { useState } from "react";
import { Editor } from "@/features/notes/components/Editor";
import { BurnRepository } from "@/features/notes/BurnRepository";
import { Flame, Copy, Check, Lock, ShieldAlert } from "lucide-react";
import { generateKey, encryptText } from "@/features/notes/crypto";

export default function MobileCreateBurnNotePage() {
  const [content, setContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [burnLink, setBurnLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!content.trim()) return;
    
    setIsGenerating(true);
    try {
      const token = crypto.randomUUID().replace(/-/g, '');
      const { keyObj, keyHex } = await generateKey();
      const ciphertext = await encryptText(content, keyObj);
      
      const repo = new BurnRepository();
      await repo.createBurnNote(token, ciphertext);
      
      const link = `${window.location.origin}/mobile/burn/${token}#${keyHex}`;
      setBurnLink(link);
    } catch (err) {
      console.error("Failed to generate burn note:", err);
      alert("Failed to generate burn link.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (burnLink) {
      navigator.clipboard.writeText(burnLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setContent("");
    setBurnLink(null);
    setCopied(false);
  };

  return (
    <div className="flex flex-col min-h-full shrink-0 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 relative">
      <div className="absolute top-0 right-0 w-[250px] h-[250px] bg-orange-500/10 rounded-full blur-[80px] pointer-events-none"></div>

      <div className="p-4 pb-24 space-y-4 relative z-10 flex flex-col h-full flex-1">
        
        {/* Header */}
        <div className="flex items-center gap-3 mt-2 mb-2">
          <div className="w-12 h-12 bg-orange-50 dark:bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500 shrink-0 border border-orange-100 dark:border-orange-500/20 shadow-sm relative">
            <Flame size={24} className="stroke-[2.5]" />
            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-zinc-900 rounded-full p-0.5">
              <Lock size={12} className="text-emerald-500" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-rose-500 tracking-tight">Smart Burn</h1>
            <p className="text-xs font-medium text-zinc-500">Secure, self-destructing notes.</p>
          </div>
        </div>

        {burnLink ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-zinc-900 border border-orange-200/50 dark:border-orange-900/50 rounded-3xl shadow-sm p-6 text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="relative w-24 h-24 flex items-center justify-center mx-auto">
              <div className="absolute inset-0 bg-orange-500/20 rounded-full animate-ping" />
              <div className="relative w-16 h-16 bg-orange-100 dark:bg-orange-500/20 rounded-full flex items-center justify-center text-orange-500 border border-orange-200 dark:border-orange-500/30">
                <Flame size={32} />
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight">Secure Vault Ready</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                AES-256 encrypted. It will self-destruct after the first open.
              </p>
            </div>
            
            <div className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 flex items-center justify-between gap-3 overflow-hidden">
              <code className="text-xs font-mono truncate text-orange-600 dark:text-orange-400 flex-1 text-left select-all">{burnLink}</code>
              <button 
                onClick={handleCopy}
                className="flex items-center justify-center w-10 h-10 bg-zinc-900 active:bg-zinc-800 dark:bg-white dark:active:bg-zinc-200 dark:text-zinc-900 text-white rounded-xl transition-all shrink-0 active:scale-95 shadow-md"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>

            <button onClick={handleReset} className="text-orange-600 dark:text-orange-400 font-bold text-sm hover:underline py-2 active:opacity-50">
              Create Another Note
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm overflow-hidden min-h-[300px]">
            <div className="bg-zinc-50 dark:bg-zinc-800/50 px-4 py-2 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center gap-2">
              <ShieldAlert size={14} className="text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">End-to-End Encrypted</span>
            </div>
            <div className="flex-1 p-2">
              <Editor 
                initialContent={content} 
                onUpdate={setContent} 
              />
            </div>
            <div className="p-3 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/30">
              <button 
                onClick={handleGenerate}
                disabled={isGenerating || !content.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-orange-500 active:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 active:scale-[0.98]"
              >
                <Flame size={18} className="stroke-[2.5]" />
                {isGenerating ? "Encrypting..." : "Generate Burn Link"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
