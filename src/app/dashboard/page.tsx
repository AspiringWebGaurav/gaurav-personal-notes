'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSyncStatus } from '@/components/SyncStatusProvider';
import StaticSyncStatus from '@/components/StaticSyncStatus';
import { motion } from 'framer-motion';
import { TEMPLATES, TEMPLATE_CATEGORIES, getTemplatesByType } from '@/lib/templates';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Note, MoneyTracker } from '@/types';
import { formatCurrency, DEFAULT_CURRENCY } from '@/lib/currency';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { syncStatus } = useSyncStatus();
  const router = useRouter();
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [moneyTrackers, setMoneyTrackers] = useState<MoneyTracker[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      // Listen to recent notes
      const notesQuery = query(
        collection(db, 'users', user.uid, 'notes'),
        orderBy('updatedAt', 'desc'),
        limit(5)
      );

      const unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
        const notes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Note[];
        setRecentNotes(notes);
      });

      // Listen to money trackers
      const moneyQuery = query(
        collection(db, 'users', user.uid, 'money'),
        orderBy('updatedAt', 'desc'),
        limit(3)
      );

      const unsubscribeMoney = onSnapshot(moneyQuery, (snapshot) => {
        const trackers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MoneyTracker[];
        setMoneyTrackers(trackers);
      });

      return () => {
        unsubscribeNotes();
        unsubscribeMoney();
      };
    }
  }, [user, loading, router]);


  const createNewNote = () => {
    const noteId = `note_${Date.now()}`;
    router.push(`/dashboard/notes/${noteId}`);
  };

  const createMoneyTracker = () => {
    const trackerId = `money_${Date.now()}`;
    router.push(`/dashboard/money/${trackerId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section with Sync Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back, {user.displayName?.split(' ')[0]}!
              </h2>
              <p className="text-gray-600">
                What would you like to work on today?
              </p>
            </div>
            <div className="flex items-center">
              <StaticSyncStatus />
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={createNewNote}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="text-3xl mb-3">✏️</div>
            <h3 className="text-lg font-semibold mb-2">New Note</h3>
            <p className="text-blue-100 text-sm">Start writing your thoughts</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={createMoneyTracker}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="text-3xl mb-3">💰</div>
            <h3 className="text-lg font-semibold mb-2">Money Tracker</h3>
            <p className="text-green-100 text-sm">Track your expenses</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/dashboard/templates')}
            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
          >
            <div className="text-3xl mb-3">📋</div>
            <h3 className="text-lg font-semibold mb-2">Templates</h3>
            <p className="text-purple-100 text-sm">Choose from {TEMPLATES.length}+ templates</p>
          </motion.button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Notes */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Notes</h3>
              <button
                onClick={() => router.push('/dashboard/notes')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                View all
              </button>
            </div>

            {recentNotes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-3">📝</div>
                <p>No notes yet. Create your first note!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentNotes.map((note) => (
                  <motion.div
                    key={note.id}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => router.push(`/dashboard/notes/${note.id}`)}
                    className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors"
                  >
                    <h4 className="font-medium text-gray-900 truncate">
                      {note.title || 'Untitled'}
                    </h4>
                    <p className="text-sm text-gray-600 truncate mt-1">
                      {note.content.substring(0, 100)}...
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      {note.updatedAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Money Trackers */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Money Trackers</h3>
              <button
                onClick={() => router.push('/dashboard/money')}
                className="text-sm text-green-600 hover:text-green-700"
              >
                View all
              </button>
            </div>

            {moneyTrackers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-3">💰</div>
                <p>No money trackers yet. Create your first one!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {moneyTrackers.map((tracker) => {
                  // Calculate current balance from expenses
                  const totalExpenses = (tracker.expenses || []).reduce((sum, expense) => sum + expense.amount, 0);
                  const remainingBalance = (tracker.startingAmount || 0) - totalExpenses;
                  
                  return (
                    <motion.div
                      key={tracker.id}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => router.push(`/dashboard/money/${tracker.id}`)}
                      className="p-3 border border-gray-200 rounded-lg hover:border-green-300 cursor-pointer transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {tracker.title || 'Untitled Budget'}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {tracker.expenses?.length || 0} expenses
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-semibold ${
                            remainingBalance >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(remainingBalance, tracker.currency || DEFAULT_CURRENCY)}
                          </p>
                          <p className="text-xs text-gray-400">
                            of {formatCurrency(tracker.startingAmount || 0, tracker.currency || DEFAULT_CURRENCY)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>

        {/* Popular Templates Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 bg-white rounded-xl shadow-sm p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Popular Templates</h3>
            <button
              onClick={() => router.push('/dashboard/templates')}
              className="text-sm text-purple-600 hover:text-purple-700"
            >
              View all {TEMPLATES.length} templates
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TEMPLATES.slice(0, 8).map((template) => (
              <motion.button
                key={template.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (template.type === 'money') {
                    const trackerId = `money_${Date.now()}`;
                    router.push(`/dashboard/money/${trackerId}?template=${template.id}`);
                  } else {
                    const noteId = `note_${Date.now()}`;
                    router.push(`/dashboard/notes/${noteId}?template=${template.id}`);
                  }
                }}
                className={`p-4 border border-gray-200 rounded-lg transition-colors text-left ${
                  template.type === 'money'
                    ? 'hover:border-green-300'
                    : 'hover:border-purple-300'
                }`}
              >
                <div className="text-2xl mb-2">{template.icon}</div>
                <h4 className="font-medium text-gray-900 text-sm mb-1">
                  {template.title}
                </h4>
                <p className="text-xs text-gray-600">
                  {template.category}
                </p>
                {template.type === 'money' && (
                  <div className="mt-1">
                    <span className="inline-block px-1.5 py-0.5 bg-green-100 text-green-600 text-xs rounded">
                      Money
                    </span>
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}