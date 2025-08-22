'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { joinWithInviteCode } from '@/lib/inviteCodes';
import { motion } from 'framer-motion';

export default function JoinPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    if (!code.trim()) {
      setError('Please enter an invite code');
      return;
    }
    
    setJoining(true);
    setError('');
    
    try {
      const result = await joinWithInviteCode(code.trim(), user.uid);
      
      if (result.success && result.noteId) {
        // Successfully joined, redirect to the note
        router.push(`/notes/${result.noteId}`);
      } else {
        setError(result.error || 'Failed to join note');
      }
    } catch (err) {
      console.error('Error joining note:', err);
      setError('An unexpected error occurred');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full mx-4"
        >
          <div className="text-center">
            <div className="text-blue-500 text-4xl mb-4">🔐</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Login Required</h3>
            <p className="text-gray-600 mb-6">You need to be logged in to join a collaborative note.</p>
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard/collaborative')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to collaborative dashboard"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center space-x-2">
                <span className="text-xl">🔗</span>
                <h1 className="text-lg font-medium text-gray-900">Join Collaborative Note</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-8"
        >
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">👥</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Enter Invite Code
            </h2>
            <p className="text-gray-600">
              Enter the 6-character code shared by your collaborator
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Invite Code
              </label>
              <input
                type="text"
                id="code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError('');
                }}
                placeholder="ABC123"
                maxLength={6}
                className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                disabled={joining}
              />
              <p className="text-xs text-gray-500 mt-1 text-center">
                Enter the code exactly as shared (letters and numbers)
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 rounded-lg p-3"
              >
                <div className="flex items-center">
                  <div className="text-red-500 mr-2">⚠️</div>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={joining || !code.trim()}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {joining ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Joining...
                </div>
              ) : (
                'Join Collaborative Note'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-3">
                Don't have an invite code?
              </p>
              <button
                onClick={() => router.push('/dashboard/collaborative')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Create your own collaborative note
              </button>
            </div>
          </div>
        </motion.div>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 bg-blue-50 rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            How it works
          </h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p><strong>1.</strong> Get the 6-character invite code from your collaborator</p>
            <p><strong>2.</strong> Enter the code above (like "ABC123")</p>
            <p><strong>3.</strong> You'll be automatically added to their note</p>
            <p><strong>4.</strong> Start collaborating in real-time!</p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}