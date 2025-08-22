'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { joinNoteWithToken } from '@/lib/share';
import { motion } from 'framer-motion';

export default function SharePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  
  const noteId = params['noteId'] as string;
  const token = searchParams.get('t');
  
  const [status, setStatus] = useState<'loading' | 'joining' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!loading && !user) {
      // Redirect to login with return URL
      const returnUrl = `/share/${noteId}?t=${encodeURIComponent(token || '')}`;
      router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }
  }, [user, loading, router, noteId, token]);

  useEffect(() => {
    if (!user || !noteId || !token) return;

    const joinNote = async () => {
      setStatus('joining');
      
      try {
        const result = await joinNoteWithToken(noteId, user.uid, token);
        
        if (result.success) {
          setStatus('success');
          // Redirect to the note after a brief success message
          setTimeout(() => {
            router.push(`/notes/${noteId}`);
          }, 1500);
        } else {
          setStatus('error');
          setError(result.error || 'Failed to join note');
        }
      } catch (err) {
        console.error('Error joining note:', err);
        setStatus('error');
        setError('An unexpected error occurred');
      }
    };

    joinNote();
  }, [user, noteId, token, router]);

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
    return null; // Will redirect to login
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-xl shadow-sm border border-red-200 p-8 max-w-md w-full mx-4"
        >
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">❌</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Invalid Link</h3>
            <p className="text-red-600 mb-6">This share link is missing required information.</p>
            <button
              onClick={() => router.push('/dashboard/notes')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Notes
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full mx-4"
      >
        <div className="text-center">
          {status === 'joining' && (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
              />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Joining Note</h3>
              <p className="text-gray-600">Please wait while we add you to the collaborative note...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="text-green-500 text-4xl mb-4">✅</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Successfully Joined!</h3>
              <p className="text-gray-600 mb-4">You've been added to the collaborative note.</p>
              <div className="text-sm text-gray-500">Redirecting to the note...</div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="text-red-500 text-4xl mb-4">
                {error.includes('Room is full') ? '🚫' : 
                 error.includes('expired') ? '⏰' : 
                 error.includes('Invalid') ? '🔑' : '❌'}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {error.includes('Room is full') ? 'Room Full' :
                 error.includes('expired') ? 'Link Expired' :
                 error.includes('Invalid') ? 'Invalid Link' : 'Error'}
              </h3>
              <p className="text-red-600 mb-6">{error}</p>
              <div className="flex space-x-3">
                <button
                  onClick={() => router.push('/dashboard/notes')}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go to Notes
                </button>
                {error.includes('Room is full') && (
                  <button
                    onClick={() => router.back()}
                    className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Go Back
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}