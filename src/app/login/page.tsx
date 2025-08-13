'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { user, loading, signIn, error, isNewUser, userFirstName, hasVisitedBefore, userDisplayName, authMethod } = useAuth();
  const router = useRouter();
  const [welcomeMessage, setWelcomeMessage] = useState('Welcome');

  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Update welcome message based on user state
  useEffect(() => {
    if (user && userDisplayName) {
      // User is authenticated - use server-side detection
      if (isNewUser) {
        setWelcomeMessage('Welcome');
      } else if (hasVisitedBefore) {
        setWelcomeMessage(`Welcome back, ${userFirstName || userDisplayName.split(' ')[0]}`);
      } else {
        setWelcomeMessage('Welcome');
      }
    } else {
      // User not authenticated - check localStorage for client-side indication
      const hasVisited = localStorage.getItem('hasVisited');
      if (hasVisited) {
        setWelcomeMessage('Welcome Back');
      } else {
        setWelcomeMessage('Welcome');
        localStorage.setItem('hasVisited', 'true');
      }
    }
  }, [user, userDisplayName, userFirstName, isNewUser, hasVisitedBefore]);

  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-white border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 px-4 relative overflow-hidden">
      {/* Optimized animated background elements */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-1/4 left-1/4 w-48 h-48 bg-gradient-to-r from-blue-400/15 to-purple-400/15 rounded-full blur-xl"
        />
        <motion.div
          animate={{
            scale: [1.1, 1, 1.1],
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute bottom-1/4 right-1/4 w-56 h-56 bg-gradient-to-r from-pink-400/15 to-indigo-400/15 rounded-full blur-xl"
        />
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full space-y-6 relative z-10"
      >
        {/* Header Section - Condensed */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto h-16 w-16 bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 border border-white/20"
          >
            <span className="text-2xl">📝</span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-3xl md:text-4xl font-bold text-white mb-2"
          >
            {welcomeMessage}
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-white/80 mb-4"
          >
            Your personal notes & money tracker
          </motion.p>

          {/* Compact feature highlights */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center gap-6 mb-6"
          >
            <div className="text-center">
              <div className="text-lg mb-1">⚡</div>
              <p className="text-xs text-white/70">Real-time</p>
            </div>
            <div className="text-center">
              <div className="text-lg mb-1">🔒</div>
              <p className="text-xs text-white/70">Secure</p>
            </div>
            <div className="text-center">
              <div className="text-lg mb-1">📱</div>
              <p className="text-xs text-white/70">Offline</p>
            </div>
          </motion.div>
        </div>

        {/* Login Section - Compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-6 space-y-4 border border-white/20"
        >
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white text-center">
              Sign in to continue
            </h2>
            
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-500/20 border border-red-400/30 text-red-100 px-3 py-2 rounded-lg text-sm backdrop-blur-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-red-300">⚠️</span>
                  <div>
                    <p className="font-medium">{error}</p>
                    {error.includes('popup') && (
                      <p className="text-xs text-red-200 mt-1">
                        We'll try an alternative sign-in method automatically.
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {authMethod === 'redirect' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-blue-500/20 border border-blue-400/30 text-blue-100 px-3 py-2 rounded-lg text-sm backdrop-blur-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-blue-300">ℹ️</span>
                  <p>Using secure redirect authentication method.</p>
                </div>
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              onClick={handleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center px-6 py-3 bg-white text-gray-700 font-medium rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-white/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 mr-3 border-2 border-gray-400 border-t-transparent rounded-full"
                  />
                  <span>
                    {authMethod === 'redirect' ? 'Redirecting...' : 'Signing in...'}
                  </span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </motion.button>
          </div>

          <div className="text-center">
            <p className="text-xs text-white/70">
              Secure authentication powered by Google
            </p>
            {authMethod && (
              <p className="text-xs text-white/50 mt-1">
                Using {authMethod === 'popup' ? 'popup' : 'redirect'} authentication
              </p>
            )}
          </div>
        </motion.div>

        {/* Compact additional features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="grid grid-cols-2 gap-3 text-center"
        >
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="text-lg mb-1">📝</div>
            <h3 className="text-white font-medium text-sm mb-1">Smart Notes</h3>
            <p className="text-white/60 text-xs">25+ templates</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="text-lg mb-1">💰</div>
            <h3 className="text-white font-medium text-sm mb-1">Money Tracker</h3>
            <p className="text-white/60 text-xs">Track expenses</p>
          </div>
        </motion.div>

        {/* Compact terms */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-xs text-white/60"
        >
          <p>
            By signing in, you agree to our terms and privacy policy.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}