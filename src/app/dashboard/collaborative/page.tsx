'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { 
  Users, 
  Plus, 
  ArrowRight, 
  Clock, 
  UserPlus,
  Share2,
  Sparkles,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createInviteCode, getActiveInviteCode, canCreateInvite } from '@/lib/inviteCodes';

interface CollaborativeNote {
  id: string;
  title: string;
  ownerUid: string;
  members: string[];
  createdAt: any;
  updatedAt: any;
  invite?: {
    token: string;
    expiresAt: any;
    maxMembers: number;
  };
}

export default function CollaborativePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [notes, setNotes] = useState<CollaborativeNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [inviteCode, setInviteCode] = useState<string>('');
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [creatingNote, setCreatingNote] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      // Listen for user's collaborative notes (where they are a member)
      const notesQuery = query(
        collection(db, 'notes'),
        where('members', 'array-contains', user.uid),
        orderBy('updatedAt', 'desc')
      );

      const unsubscribe = onSnapshot(notesQuery, (snapshot) => {
        const notesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CollaborativeNote[];
        
        setNotes(notesData);
        setLoadingNotes(false);
      });

      return () => unsubscribe();
    }
  }, [user, loading, router]);

  const createNewCollaborativeNote = async () => {
    if (!user || creatingNote) return;

    setCreatingNote(true);
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
      console.error('Error creating collaborative note:', error);
    } finally {
      setCreatingNote(false);
    }
  };

  const handleShare = async (noteId: string) => {
    if (!user) return;

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
    }
  };

  const handleJoinWithCode = () => {
    router.push('/join');
  };

  const openNote = (noteId: string) => {
    router.push(`/notes/${noteId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="gap-2"
              >
                ← Back to Dashboard
              </Button>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <h1 className="text-xl font-semibold">Collaborative Notes</h1>
                <Badge variant="secondary">Two-Person</Badge>
              </div>
            </div>
            <Button 
              onClick={createNewCollaborativeNote} 
              disabled={creatingNote}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {creatingNote ? 'Creating...' : 'New Collaborative Note'}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold">Two-Person Real-time Collaboration</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-6">
            Create collaborative notes that support exactly two people working together in real-time.
            Share secure invite codes with 24-hour expiration for seamless collaboration.
          </p>
          
          {/* Prominent Join with Code Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-6 mb-8 text-white"
          >
            <div className="flex items-center justify-center gap-3 mb-3">
              <UserPlus className="h-6 w-6" />
              <h3 className="text-xl font-semibold">Want to Join a Collaborative Note?</h3>
            </div>
            <p className="text-green-100 mb-4">
              Have an invite code from a friend? Enter it below to join their collaborative note instantly!
            </p>
            <Button
              onClick={handleJoinWithCode}
              size="lg"
              className="bg-white text-green-600 hover:bg-green-50 font-semibold px-8 py-3 gap-2"
            >
              <UserPlus className="h-5 w-5" />
              Join with Invite Code
            </Button>
          </motion.div>
        </motion.div>

        {/* Invite Code Success Message */}
        {showInviteCode && inviteCode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 bg-green-50 border border-green-200 rounded-lg p-6 text-center"
          >
            <div className="text-green-600 font-medium mb-2">
              Invite Code Created & Copied!
            </div>
            <div className="text-2xl font-mono font-bold text-green-800 tracking-wider mb-2">
              {inviteCode}
            </div>
            <div className="text-sm text-green-600">
              Share this code with your collaborator. Code expires in 24 hours.
            </div>
          </motion.div>
        )}

        {/* Collaborative Notes */}
        <div className="mb-8">
          <Card className="bg-white/60 dark:bg-slate-900/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Your Collaborative Notes
              </CardTitle>
              <CardDescription>
                Notes you own or collaborate on with others
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingNotes ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    No collaborative notes yet
                  </p>
                  <Button onClick={createNewCollaborativeNote} variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Your First Collaborative Note
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => {
                    const isOwner = note.ownerUid === user.uid;
                    const memberCount = note.members?.length || 1;
                    const hasRoom = memberCount < 2;
                    
                    return (
                      <div
                        key={note.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm truncate">
                              {note.title || 'Untitled Note'}
                            </h4>
                            {isOwner && <Badge variant="outline" className="text-xs">Owner</Badge>}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {memberCount} of 2 members • {hasRoom ? 'Room available' : 'Full'}
                            {note.updatedAt && (
                              <span> • Updated {note.updatedAt.toDate?.()?.toLocaleDateString() || 'recently'}</span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isOwner && hasRoom && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleShare(note.id)}
                              className="gap-1"
                            >
                              <Share2 className="h-3 w-3" />
                              Share
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openNote(note.id)}
                            className="gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Open
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <Plus className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-semibold">Create Note</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Start a new collaborative note that supports two people working together.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={createNewCollaborativeNote}
                disabled={creatingNote}
                className="w-full"
              >
                {creatingNote ? 'Creating...' : 'Create Now'}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                  <Share2 className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="font-semibold">Share & Collaborate</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Generate secure invite links to share your notes with one collaborator.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => router.push('/dashboard/notes')}
                className="w-full"
              >
                View All Notes
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="font-semibold">Real-time Sync</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                See live edits, presence indicators, and collaborate seamlessly.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                disabled
                className="w-full"
              >
                Always Active
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Features Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold mb-4 text-center">How Two-Person Collaboration Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl mb-2">🔐</div>
              <h4 className="font-medium mb-1">Secure Access</h4>
              <p className="text-slate-600 dark:text-slate-400">
                Only note owners and invited collaborators can access notes
              </p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">⚡</div>
              <h4 className="font-medium mb-1">Real-time Sync</h4>
              <p className="text-slate-600 dark:text-slate-400">
                See changes instantly with last-write-wins conflict resolution
              </p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">👥</div>
              <h4 className="font-medium mb-1">Presence Indicators</h4>
              <p className="text-slate-600 dark:text-slate-400">
                See who's online and collaborating with avatar indicators
              </p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">⏰</div>
              <h4 className="font-medium mb-1">24h Invite Links</h4>
              <p className="text-slate-600 dark:text-slate-400">
                Share links expire automatically for security
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}