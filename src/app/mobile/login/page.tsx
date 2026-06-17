"use client";

import { useAuthStore } from "@/features/auth/useAuthStore";
import { loginWithGoogle } from "@/features/auth/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

// Custom Typewriter component for the dynamic text effects
const Typewriter = ({ text, delay = 0, speed = 40, cursor = true }: { text: string, delay?: number, speed?: number, cursor?: boolean }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    setDisplayedText("");
    setIsTyping(false);
    let i = 0;
    let intervalId: NodeJS.Timeout;
    
    const timeoutId = setTimeout(() => {
      setIsTyping(true);
      intervalId = setInterval(() => {
        setDisplayedText(text.substring(0, i + 1));
        i++;
        if (i >= text.length) {
          clearInterval(intervalId);
          setIsTyping(false);
        }
      }, speed);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [text, delay, speed]);

  return (
    <span>
      {displayedText}
      {cursor && <span className={`inline-block w-[2px] h-[1em] ml-1 align-middle bg-current ${!isTyping ? 'animate-pulse opacity-50' : ''}`}></span>}
    </span>
  );
};

export default function MobileLoginPage() {
  const { user, loading } = useAuthStore();
  const router = useRouter();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.push("/mobile");
    }
  }, [user, loading, router]);

  const handleLogin = async () => {
    try {
      setErrorMsg(null);
      setIsAuthenticating(true);
      await loginWithGoogle();
      setLoginSuccess(true);
    } catch (error: unknown) {
      setIsAuthenticating(false);
      setLoginSuccess(false);
      if ((error as { code?: string })?.code === 'auth/popup-closed-by-user') {
        setErrorMsg("Sign-in cancelled. Please try again.");
      } else {
        setErrorMsg("Connection failed. Please try again.");
      }
    }
  };

  if (loading || loginSuccess || user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/10 blur-[80px] rounded-full animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-fuchsia-500/10 blur-[60px] rounded-full animate-pulse delay-500"></div>
        
        <div className="relative flex items-center justify-center w-28 h-28 mb-8 group">
          <div className="absolute inset-0 border-[4px] border-zinc-200 dark:border-zinc-800 rounded-full transition-all duration-500"></div>
          <div className="absolute inset-0 border-[4px] border-transparent border-t-cyan-500 border-r-violet-500 border-b-fuchsia-500 rounded-full animate-[spin_1s_linear_infinite]"></div>
          <div className="w-16 h-16 bg-gradient-to-tr from-cyan-500 via-violet-500 to-fuchsia-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.3)] animate-pulse">
            <span className="text-white font-black text-3xl tracking-tighter">G</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 relative z-10">
          <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 via-violet-600 to-fuchsia-600 dark:from-cyan-400 dark:via-violet-400 dark:to-fuchsia-400">{loginSuccess ? 'Authentication Successful' : 'Loading Workspace'}</h3>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{loginSuccess ? 'Redirecting to your dashboard...' : 'Please wait while we initialize your session...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col justify-center px-4 sm:px-6 py-8 relative bg-zinc-50 dark:bg-zinc-950 overflow-hidden w-full">
      {/* Animated Aurora Background Layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-50 via-zinc-100 to-zinc-50 dark:from-zinc-950 dark:via-[#09090b] dark:to-zinc-950 opacity-90"></div>
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-blue-500/10 dark:bg-blue-500/15 rounded-full blur-[100px] animate-aurora-1 mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] right-[-20%] w-[90%] h-[90%] bg-violet-600/10 dark:bg-violet-600/15 rounded-full blur-[120px] animate-aurora-2 mix-blend-screen"></div>
        <div className="absolute top-[30%] right-[-30%] w-[70%] h-[70%] bg-cyan-500/10 dark:bg-cyan-500/10 rounded-full blur-[90px] animate-aurora-3 mix-blend-screen"></div>
        <div className="absolute bottom-[20%] left-[-10%] w-[80%] h-[80%] bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-[110px] animate-aurora-4 mix-blend-screen"></div>
      </div>

      {/* Layer 3: Noise Texture */}
      <div className="absolute inset-0 bg-noise opacity-[0.025] mix-blend-overlay pointer-events-none"></div>

      <div className="w-full max-w-sm px-6 py-8 flex flex-col items-center z-10 relative mt-auto mb-auto">
        
        {/* Animated Logo */}
        <div className={`w-20 h-20 bg-gradient-to-tr from-cyan-500 via-violet-500 to-fuchsia-500 rounded-3xl flex items-center justify-center text-white font-black text-4xl shadow-[0_0_30px_rgba(139,92,246,0.2)] mb-8 transition-all duration-1000 animate-float-slow border border-white/10 ${isMounted ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
          G
        </div>
        
        <div className={`transition-all duration-700 ease-out flex flex-col items-center pointer-events-none ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-3 text-center min-h-[40px] select-none outline-none">
            {isMounted ? <Typewriter text="Welcome to GPN" delay={200} speed={40} cursor={false} /> : ""}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-base sm:text-lg text-center mb-12 font-medium select-none outline-none min-h-[28px]">
            {isMounted ? <Typewriter text="Your enterprise workspace, optimized for the go." delay={800} speed={30} cursor={false} /> : ""}
          </p>
        </div>

        {errorMsg && (
          <div className="w-full px-4 py-4 mb-6 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-center gap-3 animate-[pulse_0.5s_ease-out] shadow-sm">
            <svg className="w-6 h-6 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-red-600 dark:text-red-400 font-bold">{errorMsg}</p>
          </div>
        )}

        <button 
          onClick={handleLogin}
          disabled={isAuthenticating}
          className={`group relative w-full flex items-center justify-center gap-2 sm:gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/60 text-zinc-900 dark:text-zinc-100 py-4 px-3 sm:py-5 sm:px-6 rounded-2xl sm:rounded-xl transition-all duration-300 overflow-hidden shadow-sm active:scale-[0.98] ${isAuthenticating ? 'opacity-80 cursor-not-allowed' : 'active:bg-zinc-50 dark:active:bg-zinc-800/80 hover:shadow-lg dark:hover:shadow-[0_8px_30px_rgba(139,92,246,0.12)] hover:border-zinc-300 dark:hover:border-zinc-700'}`}
        >
          {isAuthenticating ? (
            <div className="flex items-center gap-3 z-10">
              <div className="w-5 h-5 border-[2px] border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin"></div>
              <span className="tracking-wide font-medium text-lg animate-pulse">Authenticating...</span>
            </div>
          ) : (
            <>
              <Image src="/globe.svg" alt="Google" width={20} height={20} className="invert dark:invert-0 z-10 opacity-70 transition-all duration-300" />
              <span className="z-10 tracking-wide font-medium text-lg">Continue with Google</span>
            </>
          )}
        </button>
        
        <div className="mt-12 text-center text-sm text-zinc-500 flex flex-col gap-2">
          <p className="font-medium">By continuing, you agree to our</p>
          <div className="flex justify-center gap-3 font-bold tracking-wide">
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors">Terms</a>
            <span>&bull;</span>
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-fuchsia-600 dark:text-fuchsia-400 hover:text-fuchsia-700 dark:hover:text-fuchsia-300 transition-colors">Privacy</a>
          </div>
        </div>
      </div>
    </div>
  );
}
