"use client";

import { use, useEffect, useState } from "react";
import { BurnRepository } from "@/features/notes/BurnRepository";
import { importKey, decryptText } from "@/features/notes/crypto";
import { Flame, ShieldAlert, AlertTriangle, LockOpen, Lock, Trash2 } from "lucide-react";
import Link from "next/link";

export default function ViewBurnNotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [content, setContent] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "burned" | "not_found" | "decrypt_error">("loading");
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    async function fetchAndReady() {
      try {
        // 1. Check if we already have it in sessionStorage
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

        // 2. Otherwise fetch from server
        const repo = new BurnRepository();
        // This instantly deletes the ciphertext from the database
        const burnedCiphertext = await repo.readAndBurn(token);
        
        if (!isMounted) return;

        if (burnedCiphertext) {
          // Store the ciphertext temporarily in state until they click "Decrypt"
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
      
      // Wipe the hash from the URL so it's not accidentally shared or saved in history
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-gray-950 to-gray-950 opacity-50" />
        
        <div className="relative z-10 text-center space-y-8 animate-in fade-in duration-1000">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full border-t-blue-500 animate-spin" />
            <div className="absolute inset-2 border-4 border-blue-400/20 rounded-full border-b-blue-400 animate-[spin_1.5s_linear_reverse_infinite]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Lock size={32} className="text-blue-500 animate-pulse" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-widest uppercase">Establishing Secure Connection</h2>
            <div className="flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-blue-200/50 text-sm font-mono tracking-widest mt-4 animate-pulse">NEGOTIATING AES-256 HANDSHAKE</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "not_found") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-4 relative overflow-hidden">
        {/* Abstract background pattern for enterprise feel */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        
        <div className="relative z-10 text-center max-w-2xl px-6 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="w-32 h-32 bg-gray-200/50 dark:bg-gray-800/50 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 mx-auto backdrop-blur-sm border border-gray-300/50 dark:border-gray-700/50">
            <AlertTriangle size={64} strokeWidth={1.5} />
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight">Record Destroyed</h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-xl mx-auto leading-relaxed">
              This secure payload has been successfully decrypted and permanently erased from our servers. The contents are no longer accessible.
            </p>
          </div>
          <div className="pt-8">
            <Link href="/" className="inline-flex items-center gap-2 px-8 py-4 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-200 text-white dark:text-black font-semibold rounded-full transition-all hover:scale-105 shadow-md">
              Return to GPN Enterprise
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === "decrypt_error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900/50 rounded-2xl shadow-lg p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center text-red-500 mx-auto">
            <ShieldAlert size={40} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Decryption Failed</h1>
          <p className="text-gray-500 dark:text-gray-400">
            The decryption key in the URL is missing or invalid. The payload has been destroyed to protect its contents.
          </p>
        </div>
      </div>
    );
  }

  if (status === "ready" && !isRevealed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 p-4 relative overflow-hidden">
        {/* Full screen sweeping radar/glow effect */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/20 via-gray-950 to-gray-950 opacity-60" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
        
        <div className="relative z-10 text-center max-w-2xl px-6 space-y-12 animate-in zoom-in-95 duration-1000">
          <div className="relative w-40 h-40 mx-auto">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
            <div className="relative w-full h-full bg-gray-900/80 backdrop-blur-md rounded-full flex items-center justify-center text-emerald-400 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <Lock size={64} strokeWidth={1.5} />
            </div>
          </div>
          
          <div className="space-y-6">
            <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight">Secure Vault</h1>
            <p className="text-xl md:text-2xl text-emerald-100/70 max-w-xl mx-auto leading-relaxed">
              This payload is protected by AES-256 military-grade encryption. Decrypting it will initiate a permanent self-destruct sequence.
            </p>
          </div>
          
          <div className="pt-8 h-24 flex flex-col items-center justify-center">
            <div className="flex items-center gap-3 text-emerald-400 font-mono tracking-widest font-bold">
              <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              DECRYPTING PAYLOAD...
            </div>
            <div className="w-64 h-1.5 bg-gray-800/80 rounded-full mt-5 overflow-hidden shadow-inner">
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col relative overflow-hidden">
      {/* Immersive background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-900/10 via-transparent to-transparent pointer-events-none" />
      
      {/* Top Banner - Edge to Edge */}
      <div className="w-full bg-amber-500 dark:bg-amber-600 text-white p-4 shadow-md border-b border-amber-600 dark:border-amber-700 relative z-20 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
        <Flame className="animate-pulse shrink-0" size={28} />
        <div className="text-center sm:text-left">
          <h3 className="font-bold tracking-wide text-lg">Note Decrypted & Burned</h3>
          <p className="text-amber-50 text-sm font-medium">
            This note has been permanently deleted from our servers. It will be lost forever when you close this window.
          </p>
        </div>
      </div>

      {/* Main Content Area - Full Height & Width */}
      <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 relative z-10 flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-800/50 shadow-sm backdrop-blur-sm">
            <LockOpen size={16} />
            <span className="font-mono text-sm font-bold tracking-tight">AES-256 DECRYPTED</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleCloseAndDestroy} 
              className="flex items-center gap-2 px-6 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-full text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 shadow-sm transition-all hover:shadow"
            >
              <Trash2 size={16} />
              Close & Destroy
            </button>
            <button 
              onClick={() => window.print()} 
              className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm transition-all hover:shadow"
            >
              Print / Save as PDF
            </button>
          </div>
        </div>
        
        {/* Document Viewer */}
        <div className="flex-1 w-full bg-white dark:bg-[#0f1115] border border-gray-200 dark:border-gray-800/60 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600" />
          
          <div 
            className="p-6 sm:p-10 lg:p-16 prose sm:prose-lg lg:prose-xl dark:prose-invert max-w-none w-full min-h-[50vh] relative z-10"
            dangerouslySetInnerHTML={{ __html: content || "" }}
          />
        </div>
        
      </div>
    </div>
  );
}
