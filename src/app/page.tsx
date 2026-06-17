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
      {cursor && <span className={`inline-block w-[3px] h-[1em] ml-1 align-middle bg-current ${!isTyping ? 'animate-pulse opacity-50' : ''}`}></span>}
    </span>
  );
};

export default function LoginPage() {
  const { user, loading } = useAuthStore();
  const router = useRouter();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isReturningUser, setIsReturningUser] = useState(true);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setIsMounted(true);
    const hasVisited = localStorage.getItem('gpn_has_visited');
    if (!hasVisited) {
      setIsReturningUser(false);
      localStorage.setItem('gpn_has_visited', 'true');
    }

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate normalized mouse position (-1 to 1)
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setMousePos({ x, y });
    };

    // Only attach listener if we are on a device that supports hover
    if (window.matchMedia('(hover: hover)').matches) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 relative overflow-hidden">
        {/* Colorful background blobs for loader */}
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
    <div className="min-h-screen flex bg-white dark:bg-zinc-950 selection:bg-violet-500/30 font-sans">
      {/* Left Panel: Enterprise Branding & Animation */}
      <div className="relative hidden lg:flex flex-1 flex-col justify-center items-center bg-zinc-950 overflow-hidden border-r border-zinc-800/30">
        
        {/* Layer 1 & 2: Animated Aurora Background with Parallax */}
        <div 
          className="absolute inset-0 transition-transform duration-1000 ease-out will-change-transform"
          style={{ transform: `translate(${mousePos.x * 10}px, ${mousePos.y * 10}px)` }}
        >
          {/* Base gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-950 to-[#0c0a1a] opacity-90"></div>
          
          {/* Drifting Aurora Blobs */}
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-500/20 rounded-full blur-[120px] animate-aurora-1 mix-blend-screen"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-violet-600/20 rounded-full blur-[140px] animate-aurora-2 mix-blend-screen"></div>
          <div className="absolute top-[20%] right-[-20%] w-[50%] h-[50%] bg-cyan-500/15 rounded-full blur-[100px] animate-aurora-3 mix-blend-screen"></div>
          <div className="absolute bottom-[10%] left-[10%] w-[60%] h-[60%] bg-indigo-500/20 rounded-full blur-[130px] animate-aurora-4 mix-blend-screen"></div>
        </div>
        
        {/* Layer 3: Noise Texture */}
        <div className="absolute inset-0 bg-noise opacity-[0.025] mix-blend-overlay pointer-events-none"></div>

        {/* Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:64px_64px] mix-blend-overlay pointer-events-none"></div>

        <div className="relative z-10 max-w-lg text-white px-12">
          <div className="flex items-center gap-4 mb-10 group cursor-default">
            <div className="w-14 h-14 bg-gradient-to-tr from-cyan-500 via-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-[0_0_40px_rgba(139,92,246,0.2)] transition-all duration-700 animate-float-slow border border-white/10">
              G
            </div>
            <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400">
              {isMounted ? <Typewriter text="GPN Workspace" delay={300} speed={60} cursor={false} /> : ""}
            </h1>
          </div>
          <h2 className="text-[3.25rem] font-bold mb-6 leading-[1.1] text-zinc-50 min-h-[110px] tracking-tight">
            {isMounted ? <Typewriter text="Enterprise knowledge, unified." delay={800} speed={40} cursor={true} /> : ""}
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed mb-12 max-w-md font-normal transition-all duration-1000 delay-1000 opacity-0" style={{ opacity: isMounted ? 1 : 0 }}>
            The secure, collaborative workspace for high-performing teams. Organize thoughts, build documentation, and unlock collective productivity.
          </p>
          
          {/* Feature list / Social proof */}
          <div className={`flex flex-col gap-5 transition-all duration-1000 delay-[1500ms] ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex items-center gap-4 group cursor-default">
              <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center backdrop-blur-md border border-cyan-500/20 group-hover:bg-cyan-500/20 group-hover:scale-110 transition-all duration-300">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-zinc-200 font-medium text-lg group-hover:text-white transition-colors duration-300">End-to-end encryption</span>
            </div>
            <div className="flex items-center gap-4 group cursor-default">
              <div className="w-10 h-10 rounded-full bg-fuchsia-500/10 flex items-center justify-center backdrop-blur-md border border-fuchsia-500/20 group-hover:bg-fuchsia-500/20 group-hover:scale-110 transition-all duration-300">
                <svg className="w-5 h-5 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-zinc-200 font-medium text-lg group-hover:text-white transition-colors duration-300">Real-time collaboration</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel: Auth Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-24 xl:px-32 relative bg-white dark:bg-[#09090b] overflow-hidden">
        
        {/* Layer 4: Glass Glow (Right side) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="mx-auto w-full max-w-md relative z-10">
          {/* Mobile Logo Header */}
          <div className="flex items-center gap-3 mb-12 lg:hidden">
            <div className="w-12 h-12 bg-gradient-to-tr from-cyan-500 via-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-lg">
              G
            </div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">GPN Workspace</h1>
          </div>

          <div className={`mb-6 text-left transition-all duration-700 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h2 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-3 min-h-[40px]">
              {isMounted ? <Typewriter text={isReturningUser ? "Welcome back" : "Welcome to GPN"} delay={200} speed={40} cursor={false} /> : ""}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-lg">
              {isMounted ? <Typewriter text={isReturningUser ? "Sign in to your account to access your workspace." : "Hi there! Let's explore your new enterprise workspace."} delay={isReturningUser ? 800 : 900} speed={30} cursor={false} /> : ""}
            </p>
          </div>

          <div className="h-14 mb-4 flex flex-col justify-end">
            {errorMsg && (
              <div className="w-full px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex items-center gap-3 animate-[pulse_0.5s_ease-out] shadow-sm">
                <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-red-600 dark:text-red-400 font-semibold">{errorMsg}</p>
              </div>
            )}
          </div>

          <button 
            onClick={handleLogin}
            disabled={isAuthenticating}
            className={`group relative w-full flex items-center justify-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/60 text-zinc-900 dark:text-zinc-100 py-4 px-4 rounded-xl transition-all duration-300 overflow-hidden shadow-sm ${isAuthenticating ? 'opacity-80 cursor-not-allowed' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/80 hover:shadow-lg dark:hover:shadow-[0_8px_30px_rgba(139,92,246,0.12)] hover:border-zinc-300 dark:hover:border-zinc-700 hover:-translate-y-[1px]'}`}
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
          
          <div className="mt-10 flex items-center justify-center opacity-70">
            <div className="h-px bg-gradient-to-r from-transparent via-zinc-300 dark:via-zinc-700 to-transparent flex-1"></div>
            <span className="px-4 text-sm font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Secure SSO</span>
            <div className="h-px bg-gradient-to-r from-transparent via-zinc-300 dark:via-zinc-700 to-transparent flex-1"></div>
          </div>

          {/* Terms & Privacy */}
          <div className="mt-12 text-center text-sm text-zinc-500 dark:text-zinc-400 flex flex-col gap-3">
            <p className="font-medium">By signing in, you agree to our</p>
            <div className="flex justify-center items-center gap-2 sm:gap-4">
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="group relative px-3 py-2 overflow-hidden rounded-lg text-zinc-600 dark:text-zinc-300 hover:text-violet-600 dark:hover:text-violet-400 font-semibold transition-colors bg-zinc-50 dark:bg-zinc-900/50 hover:bg-transparent">
                <span className="relative z-10 flex items-center gap-1.5">
                  Terms of Service
                  <svg className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </span>
                <div className="absolute inset-0 bg-violet-500/10 dark:bg-violet-500/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 rounded-lg"></div>
              </a>
              <span className="text-zinc-300 dark:text-zinc-700 font-bold">•</span>
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="group relative px-3 py-2 overflow-hidden rounded-lg text-zinc-600 dark:text-zinc-300 hover:text-fuchsia-600 dark:hover:text-fuchsia-400 font-semibold transition-colors bg-zinc-50 dark:bg-zinc-900/50 hover:bg-transparent">
                <span className="relative z-10 flex items-center gap-1.5">
                  Privacy Policy
                  <svg className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </span>
                <div className="absolute inset-0 bg-fuchsia-500/10 dark:bg-fuchsia-500/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 rounded-lg"></div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
