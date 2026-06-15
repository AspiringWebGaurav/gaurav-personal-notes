"use client";

import { useAuthStore } from "@/features/auth/useAuthStore";
import { loginWithGoogle } from "@/features/auth/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";

export default function LoginPage() {
  const { user, loading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="max-w-md w-full p-8 border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 shadow-xl flex flex-col items-center">
        <div className="w-16 h-16 bg-black dark:bg-white rounded-full flex items-center justify-center text-white dark:text-black font-bold text-2xl mb-6">
          G
        </div>
        <h1 className="text-2xl font-bold mb-2">Welcome to GPN</h1>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-8">
          Enterprise personal knowledge base and collaboration workspace.
        </p>
        <button 
          onClick={() => loginWithGoogle()}
          className="w-full flex items-center justify-center gap-3 bg-black dark:bg-white text-white dark:text-black font-medium py-3 px-4 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition"
        >
          <Image src="/globe.svg" alt="Google" width={20} height={20} className="invert dark:invert-0" />
          Continue with Google
        </button>
      </div>
    </div>
  );
}
