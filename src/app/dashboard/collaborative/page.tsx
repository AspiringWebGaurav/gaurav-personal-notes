'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import {
  Users,
  Plus,
  Clock,
  UserPlus,
  Share2,
  Sparkles,
  ExternalLink,
  Loader2,
  Lock,
  Zap,
  Timer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createInviteCode, getActiveInviteCode, canCreateInvite } from '@/lib/inviteCodes';

interface CollaborativeNote {
  id: string;
  title: string;
  ownerUid: string;
  members: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  invite?: {
    token: string;
    expiresAt: Timestamp;
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
    return undefined;
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400 dark:text-slate-500" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
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
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <Users className="h-4 w-4" />
                </div>
                <h1 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">Collaborative Notes</h1>
                <Badge variant="outline" className="ml-2 font-normal text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800">Two-Person</Badge>
              </div>
            </div>
            <Button
              onClick={createNewCollaborativeNote}
              disabled={creatingNote}
              className="gap-2 bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 h-9 px-4 text-xs font-medium"
            >
              <Plus className="h-4 w-4" />
              {creatingNote ? 'Creating...' : 'New Note'}
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
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Two-Person Real-time Collaboration</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-6">
            Create collaborative notes that support exactly two people working together in real-time.
            Share secure invite codes with 24-hour expiration for seamless collaboration.
          </p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 mb-8 max-w-2xl mx-auto flex flex-col items-center"
          >
            <div className="flex items-center justify-center gap-3 mb-2 text-slate-900 dark:text-slate-100">
              <UserPlus className="h-5 w-5" />
              <h3 className="text-sm font-semibold">Join a Collaborative Note</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 text-center max-w-md">
              Have an invite code from a friend? Enter it below to join their collaborative note instantly.
            </p>
            <Button
              onClick={handleJoinWithCode}
              className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 font-medium px-6 py-2 gap-2 h-9 text-xs"
            >
              <UserPlus className="h-4 w-4" />
              Join with Code
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
          <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Clock className="h-4 w-4 text-slate-500" />
                Your Collaborative Notes
              </CardTitle>
              <CardDescription className="text-xs">
                Notes you own or collaborate on with others
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingNotes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin w-6 h-6 text-slate-400" />
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
          <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-100 dark:border-slate-800">
                  <Plus className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Create Note</h3>
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

          <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-100 dark:border-slate-800">
                  <Share2 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Share & Collaborate</h3>
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

          <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-100 dark:border-slate-800">
                  <Users className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Real-time Sync</h3>
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
          className="mt-12 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center max-w-4xl mx-auto"
        >
          <h3 className="text-sm font-semibold mb-8 text-slate-900 dark:text-slate-100 tracking-tight">How Collaboration Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-xs">
            <div className="flex flex-col items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500 mb-3">
                <Lock className="h-4 w-4" />
              </div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Secure Access</h4>
              <p className="text-slate-500 dark:text-slate-400">
                Only invited collaborators can access your notes.
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500 mb-3">
                <Zap className="h-4 w-4" />
              </div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Real-time Sync</h4>
              <p className="text-slate-500 dark:text-slate-400">
                See changes instantly with conflict resolution.
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500 mb-3">
                <Users className="h-4 w-4" />
              </div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Presence</h4>
              <p className="text-slate-500 dark:text-slate-400">
                See who&apos;s online and collaborating.
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500 mb-3">
                <Timer className="h-4 w-4" />
              </div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">24h Links</h4>
              <p className="text-slate-500 dark:text-slate-400">
                Share links expire automatically.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}