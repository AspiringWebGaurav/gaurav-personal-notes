"use client";

import { useState } from "react";
import { Editor } from "@/features/notes/components/Editor";
import { BurnRepository } from "@/features/notes/BurnRepository";
import { Flame, Copy, Check, Lock } from "lucide-react";
import { generateKey, encryptText } from "@/features/notes/crypto";

export default function CreateBurnNotePage() {
  const [content, setContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [burnLink, setBurnLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!content.trim()) return;
    
    setIsGenerating(true);
    try {
      // Generate a random token for Firebase ID
      const token = crypto.randomUUID().replace(/-/g, '');
      
      // Generate AES key and encrypt locally
      const { keyObj, keyHex } = await generateKey();
      const ciphertext = await encryptText(content, keyObj);
      
      const repo = new BurnRepository();
      await repo.createBurnNote(token, ciphertext); // Save ciphertext, NOT plaintext
      
      // The key stays strictly in the URL hash
      const link = `${window.location.origin}/burn/${token}#${keyHex}`;
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
    <div className="flex-1 overflow-y-auto bg-orange-50/30 dark:bg-orange-950/10 p-4 md:p-8">
      <div className="max-w-4xl mx-auto h-full flex flex-col gap-6">
        
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center text-orange-500 shrink-0 shadow-sm relative">
            <Flame size={28} />
            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-950 rounded-full p-0.5">
              <Lock size={14} className="text-emerald-500" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Smart Burn</h1>
            <p className="text-gray-500 dark:text-gray-400">Create a highly secure, view-once note that self-destructs immediately after reading.</p>
          </div>
        </div>

        {burnLink ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-gray-900 border border-orange-200 dark:border-orange-900/50 rounded-2xl shadow-sm p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center text-orange-500 mx-auto animate-pulse">
              <Flame size={40} />
            </div>
            
            <h2 className="text-2xl font-bold">Secure Vault Generated!</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Your note has been <strong className="text-emerald-600 dark:text-emerald-400">AES-256 encrypted</strong> locally. Share this link. As soon as they open it, it will be decrypted and wiped forever.
            </p>
            
            <div className="w-full max-w-lg bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg p-4 flex items-center justify-between gap-4">
              <code className="text-sm font-mono truncate text-orange-600 dark:text-orange-400">{burnLink}</code>
              <button 
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-200 dark:text-black text-white rounded-md font-medium transition shrink-0"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>

            <button onClick={handleReset} className="text-orange-600 hover:underline font-medium">
              Create another burn note
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-[500px] shadow-sm rounded-2xl overflow-hidden border border-orange-200 dark:border-orange-900/30">
            <Editor 
              initialContent={content} 
              onUpdate={setContent} 
            />
          </div>
        )}

        {!burnLink && (
          <div className="flex justify-end">
            <button 
              onClick={handleGenerate}
              disabled={isGenerating || !content.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Flame size={20} />
              {isGenerating ? "Generating..." : "Generate Burn Link"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
