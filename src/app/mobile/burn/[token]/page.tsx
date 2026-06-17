"use client";

import { use, useEffect, useState } from "react";
import { BurnRepository } from "@/features/notes/BurnRepository";
import { importKey, decryptText } from "@/features/notes/crypto";
import { Flame, ShieldAlert, AlertTriangle, Lock, LockOpen, Trash2 } from "lucide-react";
import Link from "next/link";

export default function MobileViewBurnNotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [content, setContent] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "burned" | "not_found" | "decrypt_error">("loading");
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    async function fetchAndReady() {
      try {
        const sessionKey = `burn_${token}`;
        const stored = sessionStorage.getItem(sessionKey);
        
        if (stored) {
          const parsed = JSON.parse(stored);
          if (isMounted) {
            setContent(parsed.content);
            setStatus(parsed.status);
            setIsRevealed(parsed.isRevealed);
          }
          return;
        }

        const repo = new BurnRepository();
        const burnedCiphertext = await repo.readAndBurn(token);
        
        if (!isMounted) return;

        if (burnedCiphertext) {
          setContent(burnedCiphertext);
          setStatus("ready");
          sessionStorage.setItem(sessionKey, JSON.stringify({
            content: burnedCiphertext,
            status: "ready",
            isRevealed: false
          }));
        } else {
          setStatus("not_found");
        }
      } catch (err) {
        console.error("Error reading burn note:", err);
        if (isMounted) setStatus("not_found");
      }
    }

    fetchAndReady();

    return () => {
      isMounted = false;
    };
  }, [token]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status === "ready" && !isRevealed && content) {
      timer = setTimeout(() => {
        handleDecrypt();
      }, 3000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isRevealed, content]);

  const handleDecrypt = async () => {
    if (!content) return;
    
    try {
      const hash = window.location.hash.slice(1);
      if (!hash) {
        setStatus("decrypt_error");
        return;
      }
      
      const keyObj = await importKey(hash);
      const plaintext = await decryptText(content, keyObj);
      
      setContent(plaintext);
      setStatus("burned");
      setIsRevealed(true);
      
      const sessionKey = `burn_${token}`;
      sessionStorage.setItem(sessionKey, JSON.stringify({
        content: plaintext,
        status: "burned",
        isRevealed: true
      }));
      
      window.history.replaceState(null, '', window.location.pathname);
    } catch (err) {
      console.error("Decryption failed:", err);
      setStatus("decrypt_error");
    }
  };

  const handleCloseAndDestroy = () => {
    setContent(null);
    setIsRevealed(false);
    setStatus("not_found");
    sessionStorage.removeItem(`burn_${token}`);
  };

  if (status === "loading") {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center bg-zinc-950 p-4 relative overflow-hidden text-center z-50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-zinc-950 to-zinc-950 opacity-50" />
        <div className="relative z-10 space-y-6">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full border-t-blue-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Lock size={24} className="text-blue-500 animate-pulse" />
            </div>
          </div>
          <h2 className="text-sm font-bold text-blue-400 tracking-widest uppercase animate-pulse">Establishing Secure Link...</h2>
        </div>
      </div>
    );
  }

  if (status === "not_found") {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6 relative overflow-hidden text-center z-50">
        <div className="relative z-10 space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-24 h-24 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center text-zinc-500 dark:text-zinc-400 mx-auto backdrop-blur-sm border border-zinc-300/50 dark:border-zinc-700/50">
            <AlertTriangle size={48} strokeWidth={1.5} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Destroyed</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              This payload has been decrypted and permanently erased. It is no longer accessible.
            </p>
          </div>
          <Link href="/mobile" className="inline-flex items-center justify-center w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold rounded-2xl shadow-md active:scale-95 transition-transform mt-8">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  if (status === "decrypt_error") {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6 relative overflow-hidden text-center z-50">
        <div className="relative z-10 space-y-6 w-full max-w-sm bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/50 rounded-3xl shadow-xl p-8 animate-in fade-in duration-300">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/30 rounded-2xl flex items-center justify-center text-red-500 mx-auto border border-red-100 dark:border-red-900/50">
            <ShieldAlert size={32} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Decryption Failed</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              The decryption key is missing or invalid. To protect the payload, it has been destroyed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "ready" && !isRevealed) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center bg-zinc-950 p-6 relative overflow-hidden text-center z-50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/30 via-zinc-950 to-zinc-950" />
        
        <div className="relative z-10 space-y-8 animate-in zoom-in-95 duration-500">
          <div className="relative w-32 h-32 mx-auto">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
            <div className="relative w-full h-full bg-zinc-900/80 backdrop-blur-md rounded-full flex items-center justify-center text-emerald-400 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <Lock size={48} strokeWidth={1.5} />
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl font-black text-white tracking-tight">Secure Vault</h1>
            <p className="text-sm text-emerald-100/70">
              AES-256 protected payload. Revealing will initiate a permanent self-destruct.
            </p>
          </div>
          
          <div className="pt-8 flex flex-col items-center justify-center">
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-sm tracking-widest font-bold">
              <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              DECRYPTING...
            </div>
            <div className="w-48 h-1.5 bg-zinc-800 rounded-full mt-4 overflow-hidden shadow-inner">
              <div className="h-full bg-emerald-500 rounded-full animate-[progress_3s_ease-in-out_forwards] shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
            </div>
          </div>
        </div>
        
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes progress {
            0% { width: 0%; }
            100% { width: 100%; }
          }
        `}} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-zinc-50 dark:bg-zinc-950 relative overflow-hidden z-50">
      {/* Banner */}
      <div className="w-full bg-amber-500 text-white p-3 shadow-md relative z-20 flex items-center gap-3 shrink-0">
        <Flame className="animate-pulse shrink-0" size={24} />
        <div>
          <h3 className="font-bold text-sm tracking-wide">Decrypted & Burned</h3>
          <p className="text-amber-50 text-[10px] font-medium leading-tight">
            Lost forever when closed.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col bg-white dark:bg-[#0f1115] relative z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] rounded-t-3xl overflow-hidden mt-[-10px]">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600" />
        
        <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-800/50 text-[10px] font-mono font-bold">
            <LockOpen size={12} /> AES-256
          </div>
          
          <button 
            onClick={handleCloseAndDestroy} 
            className="flex items-center gap-1.5 px-4 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full text-xs font-bold active:scale-95 transition-transform"
          >
            <Trash2 size={14} /> Close
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div 
            className="p-5 prose sm:prose-lg dark:prose-invert max-w-none break-words"
            dangerouslySetInnerHTML={{ __html: content || "" }}
          />
        </div>
      </div>
    </div>
  );
}
