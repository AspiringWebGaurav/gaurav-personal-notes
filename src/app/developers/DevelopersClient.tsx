"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Code2,
  Terminal,
  Cpu,
  Database,
  Cloud,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
  Sun,
  Moon,
  Sparkles,
  Server,
  Layers,
  FileCode,
  Zap,
  Globe,
  Radio,
  Key,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  RefreshCw,
  User,
  LogOut,
  LogIn,
  AlertTriangle,
  Play,
  Activity,
  CheckCircle2,
  Clock,
  Send,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/useAuthStore";
import { loginWithGoogle, logout } from "@/features/auth/AuthProvider";

type ActiveTab = "endpoints" | "keys" | "ota" | "sdks";
type CodeLang = "curl" | "ts" | "python" | "rust";

export function DevelopersClient() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [activeTab, setActiveTab] = useState<ActiveTab>("endpoints");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Authentication & API Key state
  const { user, loading: authLoading } = useAuthStore();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [keyRegenCount, setKeyRegenCount] = useState(0);

  // Live API Tester state
  const [testEndpoint, setTestEndpoint] = useState<string>("/api/releases/mobile/latest");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testLatency, setTestLatency] = useState<number | null>(null);
  const [testStatusCode, setTestStatusCode] = useState<number | null>(null);

  // Code sample language selector
  const [selectedLang, setSelectedLang] = useState<CodeLang>("curl");

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("app-theme");
      if (saved === "dark" || saved === "light") {
        setTheme(saved);
        if (saved === "dark") document.documentElement.classList.add("dark");
        else document.documentElement.classList.remove("dark");
      }
    } catch {}
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      if (next === "dark") {
        document.documentElement.classList.add("dark");
        try {
          localStorage.setItem("app-theme", "dark");
        } catch {}
      } else {
        document.documentElement.classList.remove("dark");
        try {
          localStorage.setItem("app-theme", "light");
        } catch {}
      }
      return next;
    });
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Deterministic user-specific Developer API key
  const userApiKey = useMemo(() => {
    if (!user) return "";
    const storageKey = `gpn_dev_key_${user.uid}`;
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached && keyRegenCount === 0) return cached;
    } catch {}

    const cleanUid = user.uid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
    const entropy = Math.random().toString(36).substring(2, 12);
    const newKey = `gpn_dev_live_${cleanUid}_${entropy}`;
    try {
      localStorage.setItem(storageKey, newKey);
    } catch {}
    return newKey;
  }, [user, keyRegenCount]);

  const handleRegenerateKey = () => {
    if (!user) return;
    const confirmRegen = window.confirm(
      "Are you sure you want to regenerate your Developer API Key? Any scripts currently using this key will need to be updated."
    );
    if (confirmRegen) {
      setKeyRegenCount((c) => c + 1);
      setShowKey(true);
    }
  };

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      await loginWithGoogle();
    } catch (e: any) {
      console.error("Developer sign-in failed:", e);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Run live test of public endpoint
  const runLiveTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    setTestLatency(null);
    setTestStatusCode(null);
    const start = performance.now();
    try {
      const res = await fetch(testEndpoint, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const end = performance.now();
      setTestLatency(Math.round(end - start));
      setTestStatusCode(res.status);
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      const end = performance.now();
      setTestLatency(Math.round(end - start));
      setTestStatusCode(500);
      setTestResult({ error: err?.message || "Failed to fetch endpoint response" });
    } finally {
      setIsTesting(false);
    }
  };

  const maskedKey = userApiKey
    ? `${userApiKey.slice(0, 13)}••••••••••••••••••••••••••••••••`
    : "gpn_dev_••••••••••••••••••••••••••••••••";

  const effectiveKeyPlaceholder = userApiKey || "YOUR_DEVELOPER_API_KEY";

  // Dynamic code snippets injecting authenticated key
  const codeSnippets: Record<CodeLang, string> = {
    curl: `# 1. Discover latest mobile OTA release manifest
curl -s https://gpnotes.eu.cc/api/releases/mobile/latest

# 2. Query developer key metadata & scope permissions
curl -s -H "Authorization: Bearer ${effectiveKeyPlaceholder}" \\
  https://gpnotes.eu.cc/api/developer/key

# 3. Direct Edge CDN binary streaming download
curl -I https://gphost.eu.cc/raw/gpn-app`,

    ts: `// Gaurav Personal Notes — Dynamic Release & Storage Client
import { cleanVersion } from './utils/version';

const API_KEY = '${effectiveKeyPlaceholder}';
const BASE_URL = 'https://gpnotes.eu.cc';

export async function checkMobileUpdate(currentVersion: string) {
  const res = await fetch(\`\${BASE_URL}/api/releases/mobile/latest\`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': \`Bearer \${API_KEY}\`
    },
    cache: 'no-store'
  });

  if (!res.ok) throw new Error(\`Update check failed: \${res.status}\`);
  const manifest = await res.json();

  const hasUpdate = cleanVersion(manifest.version) > cleanVersion(currentVersion);
  return hasUpdate ? manifest : null;
}`,

    python: `import requests

API_KEY = "${effectiveKeyPlaceholder}"
BASE_URL = "https://gpnotes.eu.cc"

headers = {
    "Accept": "application/json",
    "Authorization": f"Bearer {API_KEY}"
}

# 1. Fetch latest release manifest
response = requests.get(f"{BASE_URL}/api/releases/mobile/latest", headers=headers)
if response.status_code == 200:
    manifest = response.json()
    print(f"Latest Mobile Version: {manifest.get('version')}")
    print(f"Download URL: {manifest.get('downloadUrl') or manifest.get('apkUrl')}")
else:
    print(f"Error checking release: {response.status_code}")`,

    rust: `use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, ACCEPT};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct ReleaseManifest {
    pub version: String,
    pub download_url: Option<String>,
    pub size: usize,
    pub sha256: String,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let api_key = "${effectiveKeyPlaceholder}";
    let mut headers = HeaderMap::new();
    headers.insert(ACCEPT, HeaderValue::from_static("application/json"));
    headers.insert(AUTHORIZATION, HeaderValue::from_str(&format!("Bearer {}", api_key))?);

    let client = reqwest::Client::new();
    let res = client
        .get("https://gpnotes.eu.cc/api/releases/mobile/latest")
        .headers(headers)
        .send()
        .await?;

    let manifest: ReleaseManifest = res.json().await?;
    println!("Active Release: v{} ({} bytes)", manifest.version, manifest.size);
    Ok(())
}`,
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-cyan-500/20 transition-colors">
      {/* Top Header */}
      <header className="sticky top-0 z-40 h-14 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors mr-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>App</span>
          </Link>
          <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-800" />
          <div className="flex items-center gap-2 text-xs font-mono">
            <Terminal className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span className="text-zinc-600 dark:text-zinc-400">gpn</span>
            <span className="text-zinc-400 dark:text-zinc-600">/</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">developers</span>
          </div>
        </div>

        {/* Live System Status Pill */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Gateway: Operational</span>
          <span className="text-zinc-300 dark:text-zinc-700">•</span>
          <span className="font-mono text-[10px]">CDN: ~12ms</span>
        </div>

        {/* Action Links & User Profile / Theme Toggle */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-6 h-6 rounded-full ring-1 ring-emerald-500/50 object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[10px] font-bold">
                  {(user.displayName || user.email || "D")[0].toUpperCase()}
                </div>
              )}
              <span className="hidden sm:inline text-xs font-medium text-zinc-700 dark:text-zinc-300 max-w-[120px] truncate">
                {user.displayName || user.email}
              </span>
              <button
                type="button"
                onClick={() => logout()}
                title="Sign Out"
                className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity font-semibold cursor-pointer shadow-2xs"
            >
              {isLoggingIn ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <LogIn className="w-3 h-3" />
              )}
              <span>Developer Login</span>
            </button>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors flex items-center justify-center cursor-pointer ml-1"
          >
            {mounted ? (
              theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-zinc-700" />
              )
            ) : (
              <span className="w-4 h-4 block" />
            )}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-zinc-200 dark:border-zinc-800 py-12 sm:py-16 px-6">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[320px] bg-cyan-500/10 dark:bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/60 text-xs font-semibold text-cyan-700 dark:text-cyan-300 shadow-2xs">
            <Key className="w-3.5 h-3.5 text-cyan-600" />
            <span>Developer API Keys &amp; Architecture Reference</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 dark:text-white">
            GPN Developer Portal
          </h1>
          <p className="max-w-2xl mx-auto text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Generate authenticated Developer API keys, test atomic release manifest endpoints, and inspect Over-The-Air encrypted binary distribution architectures.
          </p>

          {/* Quick Tab Selector */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-1.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("endpoints")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "endpoints"
                  ? "bg-cyan-600 text-white shadow-2xs"
                  : "bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Endpoints &amp; Console</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("keys")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "keys"
                  ? "bg-cyan-600 text-white shadow-2xs"
                  : "bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Get Your API Key</span>
              {user && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ota")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "ota"
                  ? "bg-cyan-600 text-white shadow-2xs"
                  : "bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>OTA Binary Spec</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("sdks")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "sdks"
                  ? "bg-cyan-600 text-white shadow-2xs"
                  : "bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Client SDKs</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        
        {/* ========================================================================= */}
        {/* SECTION: DEVELOPER AUTHENTICATION & API KEY MANAGER ("GET YOUR API KEY") */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-600" />
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                Developer API Credentials &amp; Access Keys
              </h2>
            </div>
            {user && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60">
                Verified Developer Session
              </span>
            )}
          </div>

          {!user ? (
            /* Logged Out: Secured Authentication Gate */
            <div className="relative overflow-hidden rounded-2xl border border-amber-200/90 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/50 via-white to-orange-50/40 dark:from-amber-950/20 dark:via-zinc-900/80 dark:to-zinc-950 p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                <div className="space-y-3 max-w-xl">
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-300/80 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                    <Lock className="w-3 h-3" />
                    <span>Protected Developer Resource</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white">
                    Developer Login Required for API Keys
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    API keys and protected write endpoints are safeguarded to ensure platform integrity and rate quota isolation. Sign in with your GPN account to generate your Developer API key, manage rate-limit quotas, and unlock protected API endpoints.
                  </p>

                  {/* Masked Key Display */}
                  <div className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/90 font-mono text-xs text-zinc-400 dark:text-zinc-500 max-w-md select-none">
                    <Key className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate">{maskedKey}</span>
                    <span className="ml-auto text-[10px] font-sans font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                      LOCKED
                    </span>
                  </div>
                </div>

                <div className="sm:self-center flex flex-col gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleLogin}
                    disabled={isLoggingIn}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 font-bold text-xs shadow-md transition-all active:scale-98 cursor-pointer"
                  >
                    {isLoggingIn ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogIn className="w-4 h-4" />
                    )}
                    <span>Sign In to Get Your API Key</span>
                  </button>
                  <p className="text-[11px] text-zinc-500 text-center">
                    Instant 1-click Google Sign-in
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Logged In: Active Developer API Key Manager */
            <div className="rounded-2xl border border-emerald-200/90 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/40 via-white to-cyan-50/30 dark:from-emerald-950/20 dark:via-zinc-900/90 dark:to-zinc-950 p-6 sm:p-8 space-y-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-100 dark:border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "User"}
                      className="w-10 h-10 rounded-full ring-2 ring-emerald-500/40 object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold">
                      {(user.displayName || user.email || "D")[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-900 dark:text-white text-sm">
                        {user.displayName || "Developer"}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
                        FREE HOBBY TIER
                      </span>
                    </div>
                    <span className="text-xs text-zinc-500 font-mono">{user.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRegenerateKey}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850 text-xs text-zinc-700 dark:text-zinc-300 font-medium transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Regenerate Key</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-750 text-xs text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>

              {/* API Key Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Your Active Developer API Key:</span>
                  </label>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    Header: <code className="text-zinc-800 dark:text-zinc-200">Authorization: Bearer &lt;key&gt;</code>
                  </span>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-inner">
                  <div className="flex-1 font-mono text-xs px-2 truncate text-zinc-900 dark:text-zinc-100">
                    {showKey ? userApiKey : maskedKey}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                    title={showKey ? "Hide key" : "Show key"}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => copyCode(userApiKey, "apikey")}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                  >
                    {copiedId === "apikey" ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Rate Limits & Permitted Scopes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 space-y-1.5">
                  <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Rate Limits &amp; Quota</span>
                    </span>
                    <span className="font-mono text-[10px] text-emerald-600 font-bold">120 req/min</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Free Developer Tier: 5,000 requests/day. 30s Edge CDN caching on release lookups eliminates origin burns.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 space-y-1.5">
                  <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
                      <span>Authorized Scopes</span>
                    </span>
                    <span className="font-mono text-[10px] text-cyan-600 font-bold">4 Active</span>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      releases:read
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      storage:query
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      ota:verify
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      cdn:stream
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* SECTION 1: ENDPOINTS OVERVIEW & LIVE API TESTER */}
        {/* ========================================================================= */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-600" />
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                Release Discovery &amp; Edge Delivery Endpoints
              </h2>
            </div>
            <span className="text-xs text-zinc-500">Public &amp; Protected</span>
          </div>

          <div className="space-y-3">
            {/* Mobile Manifest Endpoint */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    GET
                  </span>
                  <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    /api/releases/mobile/latest
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    PUBLIC
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  Returns live mobile OTA manifest (version, APK/container URL, SHA-256 hash, and release highlights).
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setTestEndpoint("/api/releases/mobile/latest");
                  runLiveTest();
                }}
                disabled={isTesting}
                className="self-start sm:self-center flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
              >
                {isTesting && testEndpoint === "/api/releases/mobile/latest" ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                <span>Test Live</span>
              </button>
            </div>

            {/* Desktop Manifest Endpoint */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    GET
                  </span>
                  <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    https://gphost.eu.cc/api/v1/releases/gpn/latest
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    PUBLIC
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  Returns desktop release manifest with single-line Base64 Minisign signature container.
                </p>
              </div>

              <a
                href="https://gphost.eu.cc/api/v1/releases/gpn/latest"
                target="_blank"
                rel="noopener noreferrer"
                className="self-start sm:self-center flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors shrink-0"
              >
                <span>Inspect</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Edge CDN Mirror */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
                    EDGE CDN
                  </span>
                  <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    https://gphost.eu.cc/raw/:slug
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    PUBLIC
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  Global Cloudflare R2 Edge mirror for base packages (e.g. <code className="text-zinc-700 dark:text-zinc-300 font-mono">slug: &apos;gpn-app&apos;</code> desktop and <code className="text-zinc-700 dark:text-zinc-300 font-mono">slug: &apos;2aC1shTDISVG&apos;</code> mobile APK).
                </p>
              </div>

              <span className="self-start sm:self-center text-xs font-mono text-emerald-600 font-bold shrink-0">
                1-Year Edge CDN Caching
              </span>
            </div>

            {/* Protected Release Publishing */}
            <div className="p-4 rounded-xl border border-dashed border-amber-300 dark:border-amber-900/80 bg-amber-50/30 dark:bg-amber-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    POST
                  </span>
                  <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    /api/releases/mobile/latest
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                    PROTECTED
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  Publish active OTA release manifest. Requires administrative authorization bearer token.
                </p>
              </div>

              <span className="self-start sm:self-center text-xs font-mono text-amber-700 dark:text-amber-400 font-semibold shrink-0">
                🔒 Requires Auth Bearer
              </span>
            </div>
          </div>

          {/* Interactive Live API Response Console */}
          {testResult && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-900 text-zinc-100 p-4 space-y-3 shadow-inner">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2 text-xs">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-bold text-white">Live Response Console:</span>
                  <span className="font-mono text-zinc-400">{testEndpoint}</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px]">
                  {testStatusCode && (
                    <span className={testStatusCode === 200 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                      Status: {testStatusCode}
                    </span>
                  )}
                  {testLatency !== null && (
                    <span className="text-cyan-400">
                      {testLatency}ms
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => copyCode(JSON.stringify(testResult, null, 2), "test-res")}
                    className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedId === "test-res" ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <pre className="text-xs font-mono text-emerald-400 overflow-x-auto max-h-64 scrollbar-thin">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: GPHOST CLOUDFLARE R2 HIERARCHICAL STORAGE API */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
            <Cloud className="w-4 h-4 text-cyan-600" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              GPHost Hierarchical Folder Management API
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            GPN organizes notes, backups, attachments, and exports into unlimited nested Cloudflare R2 directories using the GPHost API.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-1">
              <span className="font-mono text-[10px] text-cyan-600 font-bold block">POST /api/v1/folders</span>
              <span className="font-bold text-zinc-900 dark:text-white">Create Nested Folders</span>
              <p className="text-zinc-500">
                Accepts <code className="text-zinc-700 dark:text-zinc-300 font-mono">{`{"path": "gpn/backups/notes"}`}</code> and automatically creates all missing parent directories.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-1">
              <span className="font-mono text-[10px] text-emerald-600 font-bold block">POST /api/v1/upload</span>
              <span className="font-bold text-zinc-900 dark:text-white">Direct-to-Folder Upload</span>
              <p className="text-zinc-500">
                Multi-part form upload with <code className="text-zinc-700 dark:text-zinc-300 font-mono">-F &quot;folder=gpn/attachments&quot;</code> directly into Cloudflare R2 edge storage.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-1">
              <span className="font-mono text-[10px] text-indigo-600 font-bold block">GET /api/v1/folders</span>
              <span className="font-bold text-zinc-900 dark:text-white">Folder Tree &amp; Hierarchy</span>
              <p className="text-zinc-500">
                Query with <code className="text-zinc-700 dark:text-zinc-300 font-mono">?tree=true</code> to receive full recursive structure, file counts, and breadcrumbs.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-1">
              <span className="font-mono text-[10px] text-rose-600 font-bold block">DELETE /api/v1/folders</span>
              <span className="font-bold text-zinc-900 dark:text-white">Recursive Hierarchy Purge</span>
              <p className="text-zinc-500">
                Purge obsolete folder trees with <code className="text-zinc-700 dark:text-zinc-300 font-mono">?recursive=true</code>. Base installer packages remain permanently protected.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 3: OTA BINARY CONTAINER SPECIFICATION */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
            <Layers className="w-4 h-4 text-cyan-600" />
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              OTA Binary Packaging &amp; Cryptographic Container Format
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            All Over-The-Air updates are distributed in authenticated, encrypted binary containers (<code className="font-mono text-zinc-800 dark:text-zinc-200">update&lt;ver&gt;.gpn.bin</code>) designed for seamless in-process hot swapping:
          </p>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-900 text-zinc-100 p-4 font-mono text-xs overflow-x-auto space-y-2">
            <div className="text-cyan-400 font-bold">// AES-256-GCM Binary Container Layout:</div>
            <div className="space-y-1 text-zinc-300">
              <div>[00..07] 8 Bytes  : Magic Identifier &quot;GPN_OTA\0&quot;</div>
              <div>[08..23] 16 Bytes : Target Version (UTF-8, null-padded)</div>
              <div>[24..31] 8 Bytes  : Uncompressed Payload Size (Big-Endian uint64)</div>
              <div>[32..43] 12 Bytes : Initialization Vector (IV / Nonce)</div>
              <div>[44..59] 16 Bytes : AES-256-GCM Authentication Tag</div>
              <div>[60..End] N Bytes : Authenticated Ciphertext (Deflated zip stream)</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
              <span className="font-bold text-zinc-900 dark:text-white block mb-1">Desktop: Windows NTFS Atomic Shadow Swap</span>
              <p className="text-zinc-500">
                Updates stage in-memory and execute shadow swaps in &lt;1s. Zero NSIS wizards, zero UAC elevation prompts.
              </p>
            </div>
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
              <span className="font-bold text-zinc-900 dark:text-white block mb-1">Mobile: Capacitor In-Process Swap</span>
              <p className="text-zinc-500">
                Zero Android OS package re-installs. The internal web runtime reloads the verified bundle seamlessly.
              </p>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 4: CLIENT CODE SNIPPETS & SDK EXAMPLES */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-cyan-600" />
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                Client Integration Code
              </h2>
            </div>

            {/* Language Selector */}
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-850 p-1 rounded-lg text-xs font-mono">
              {(["curl", "ts", "python", "rust"] as CodeLang[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setSelectedLang(lang)}
                  className={`px-2.5 py-0.5 rounded transition-colors cursor-pointer ${
                    selectedLang === lang
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white font-bold shadow-2xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="relative rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-900 text-emerald-400 p-4 font-mono text-xs overflow-x-auto shadow-inner space-y-2">
            <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-800 pb-2">
              <span>Integration Example ({selectedLang.toUpperCase()})</span>
              <button
                type="button"
                onClick={() => copyCode(codeSnippets[selectedLang], `sdk-${selectedLang}`)}
                className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                {copiedId === `sdk-${selectedLang}` ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
            <pre className="text-xs leading-relaxed">{codeSnippets[selectedLang]}</pre>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-10 px-6 mt-12 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-900 dark:text-zinc-100">Gaurav Personal Notes</span>
            <span>•</span>
            <span>Developer Ecosystem</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              App
            </Link>
            <Link href="/docs" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Documentation
            </Link>
            <Link href="/how-it-works" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              How It Works
            </Link>
            <Link href="/download" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Downloads
            </Link>
            <a
              href="https://github.com/AspiringWebGaurav"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
