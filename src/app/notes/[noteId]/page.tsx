'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { doc, onSnapshot, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { validateNoteAccess } from '@/lib/share';
import { createInviteCode, getActiveInviteCode, canCreateInvite } from '@/lib/inviteCodes';
import { goOnline, listenToPresence, PresenceData } from '@/lib/presence';
import { motion } from 'framer-motion';
import PresenceIndicators from '../../../components/PresenceIndicators';

interface Note {
  id: string;
  ownerUid: string;
  title: string;
  content: string;
  members: string[];
  createdAt: any;
  updatedAt: any;
  invite?: {
    token: string;
    expiresAt: any;
    maxMembers: number;
  };
}

export default function NotePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const noteId = params['noteId'] as string;
  
  const [note, setNote] = useState<Note | null>(null);
  const [noteLoading, setNoteLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [hasAccess, setHasAccess] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [inviteCode, setInviteCode] = useState<string>('');
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [presenceData, setPresenceData] = useState<Record<string, PresenceData>>({});
  
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const presenceCleanupRef = useRef<(() => void) | null>(null);
  const presenceListenerCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !noteId) return;

    const checkAccessAndLoadNote = async () => {
      try {
        const { hasAccess: userHasAccess, note: noteData } = await validateNoteAccess(noteId, user.uid);
        
        if (!userHasAccess) {
          setError('You do not have access to this note.');
          setNoteLoading(false);
          return;
        }

        setHasAccess(true);
        
        // Set up real-time listener for the note
        const noteRef = doc(db, 'notes', noteId);
        const unsubscribe = onSnapshot(noteRef, (doc) => {
          if (doc.exists()) {
            const data = doc.data() as Note;
            const noteWithId = { ...data, id: doc.id };
            setNote(noteWithId);
            setTitle(data.title || '');
            setContent(data.content || '');
            setNoteLoading(false);
          } else {
            setError('Note not found.');
            setNoteLoading(false);
          }
        }, (error) => {
          console.error('Error listening to note:', error);
          setError('Failed to load note.');
          setNoteLoading(false);
        });

        return unsubscribe;
      } catch (err) {
        console.error('Error checking note access:', err);
        setError('Failed to load note.');
        setNoteLoading(false);
      }
    };

    checkAccessAndLoadNote();
  }, [user, noteId]);

  // Set up presence when note is loaded
  useEffect(() => {
    if (!user || !note || !hasAccess) return;

    const setupPresence = async () => {
      try {
        // Go online for this note
        const cleanup = await goOnline(noteId, user);
        presenceCleanupRef.current = cleanup;

        // Listen to presence changes
        const presenceCleanup = listenToPresence(noteId, user.uid, setPresenceData);
        presenceListenerCleanupRef.current = presenceCleanup;
      } catch (error) {
        console.error('Error setting up presence:', error);
      }
    };

    setupPresence();

    return () => {
      if (presenceCleanupRef.current) {
        presenceCleanupRef.current();
      }
      if (presenceListenerCleanupRef.current) {
        presenceListenerCleanupRef.current();
      }
    };
  }, [user, note, hasAccess, noteId]);

  // Auto-save functionality
  const saveNote = async (newTitle: string, newContent: string) => {
    if (!note || !user) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, 'notes', noteId), {
        title: newTitle,
        content: newContent,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving note:', error);
    } finally {
      setSaving(false);
    }
  };

  const debouncedSave = (newTitle: string, newContent: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveNote(newTitle, newContent);
    }, 1000); // Save after 1 second of inactivity
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    debouncedSave(newTitle, content);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    debouncedSave(title, newContent);
  };

  const handleShare = async () => {
    if (!note || !user) return;

    setCreatingInvite(true);
    try {
      // Check if user can create invite
      const canCreate = await canCreateInvite(noteId, user.uid);
      if (!canCreate) {
        alert('You cannot create an invite for this note (room may be full or you are not the owner)');
        return;
      }

      // Check for existing active invite code
      let code = await getActiveInviteCode(noteId, user.uid);
      
      // If no active code, create a new one
      if (!code) {
        code = await createInviteCode(noteId, user.uid);
      }
      
      setInviteCode(code);
      
      // Copy to clipboard
      await navigator.clipboard.writeText(code);
      setShowInviteCode(true);
      setTimeout(() => setShowInviteCode(false), 5000);
    } catch (error) {
      console.error('Error creating invite code:', error);
      alert('Failed to create invite code. Please try again.');
    } finally {
      setCreatingInvite(false);
    }
  };

  const handleCreateNote = async () => {
    if (!user) return;

    try {
      const newNote = {
        ownerUid: user.uid,
        title: 'New Collaborative Note',
        content: '',
        members: [user.uid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'notes'), newNote);
      router.push(`/notes/${docRef.id}`);
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  if (loading || noteLoading) {
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
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-xl shadow-sm border border-red-200 p-8 max-w-md w-full mx-4"
        >
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">🚫</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-red-600 mb-6">{error}</p>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/dashboard/notes')}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Notes
              </button>
              <button
                onClick={handleCreateNote}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Create New
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!hasAccess || !note) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading note...</p>
        </div>
      </div>
    );
  }

  const otherMembers = Object.entries(presenceData).filter(([uid]) => uid !== user.uid);
  const isWaitingForCollaborator = note.members.length < 2 && otherMembers.length === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard/notes')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to notes"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center space-x-2">
                <span className="text-xl">🤝</span>
                <h1 className="text-lg font-medium text-gray-900">Collaborative Note</h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Presence indicators */}
              <PresenceIndicators 
                presenceData={presenceData} 
                currentUserId={user.uid}
                isWaiting={isWaitingForCollaborator}
              />
              
              {/* Share button */}
              <div className="relative">
                <button
                  onClick={handleShare}
                  disabled={creatingInvite}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center space-x-2"
                >
                  {creatingInvite ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                  )}
                  <span>{creatingInvite ? 'Creating...' : 'Get Code'}</span>
                </button>
                
                {showInviteCode && inviteCode && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full mt-2 right-0 bg-green-600 text-white px-4 py-3 rounded-lg text-sm whitespace-nowrap z-20"
                  >
                    <div className="font-bold text-lg tracking-wider">{inviteCode}</div>
                    <div className="text-xs opacity-90">Code copied! Share with collaborator</div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
        >
          {/* Title Input */}
          <div className="border-b border-gray-200 p-4">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="Note title..."
              className="w-full text-xl font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 placeholder-gray-400"
            />
          </div>

          {/* Content Editor */}
          <div className="relative">
            <textarea
              ref={contentRef}
              value={content}
              onChange={handleContentChange}
              placeholder={isWaitingForCollaborator ? "Waiting for collaborator to join..." : "Start typing to collaborate..."}
              className="w-full h-96 p-6 text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 placeholder-gray-400 resize-none"
            />
            
            {isWaitingForCollaborator && (
              <div className="absolute top-4 right-4 flex items-center space-x-2 text-sm text-gray-500">
                <div className="animate-pulse w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>Waiting for collaborator...</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-3 text-xs text-gray-500 flex justify-between items-center">
            <div>
              {content.length} characters
            </div>
            <div className="flex items-center space-x-4">
              {saving && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>Saving...</span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Auto-save enabled</span>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}