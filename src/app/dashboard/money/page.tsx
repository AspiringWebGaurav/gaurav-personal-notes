'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MoneyTracker } from '@/types';
import { formatCurrency, DEFAULT_CURRENCY } from '@/lib/currency';
import { ChevronLeft, Wallet, Search, Plus, Trash2, Loader2, DollarSign } from 'lucide-react';

export default function AllMoneyTrackersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [trackers, setTrackers] = useState<MoneyTracker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrackers, setSelectedTrackers] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [trackerToDelete, setTrackerToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      const trackersQuery = query(
        collection(db, 'users', user.uid, 'money'),
        orderBy('updatedAt', 'desc')
      );

      const unsubscribe = onSnapshot(trackersQuery, (snapshot) => {
        const trackersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MoneyTracker[];
        setTrackers(trackersData);
        setIsLoading(false);
      });

      return () => unsubscribe();
    }
    return undefined;
  }, [user, loading, router]);

  const filteredTrackers = trackers.filter(tracker =>
    tracker.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteTracker = async (trackerId: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'money', trackerId));
      setShowDeleteConfirm(false);
      setTrackerToDelete(null);
    } catch (error) {
      console.error('Error deleting money tracker:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (!user || selectedTrackers.size === 0) return;

    try {
      const deletePromises = Array.from(selectedTrackers).map(trackerId =>
        deleteDoc(doc(db, 'users', user.uid, 'money', trackerId))
      );
      await Promise.all(deletePromises);
      setSelectedTrackers(new Set());
    } catch (error) {
      console.error('Error deleting money trackers:', error);
    }
  };

  const toggleTrackerSelection = (trackerId: string) => {
    const newSelected = new Set(selectedTrackers);
    if (newSelected.has(trackerId)) {
      newSelected.delete(trackerId);
    } else {
      newSelected.add(trackerId);
    }
    setSelectedTrackers(newSelected);
  };

  const createNewTracker = () => {
    const trackerId = `money_${Date.now()}`;
    router.push(`/dashboard/money/${trackerId}`);
  };

  if (loading || isLoading) {
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
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors text-slate-500 dark:text-slate-400"
                title="Go back to dashboard"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <Wallet className="h-4 w-4" />
                </div>
                <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">Money Trackers</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {selectedTrackers.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 text-xs font-medium rounded-md hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors border border-red-200 dark:border-red-900/50"
                >
                  Delete {selectedTrackers.size} trackers
                </button>
              )}
              <button
                onClick={createNewTracker}
                className="flex items-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-3 py-1.5 rounded-md hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors text-xs font-medium"
              >
                <Plus className="w-4 h-4" />
                New Tracker
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search money trackers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-slate-700 placeholder:text-slate-400"
            />
          </div>
        </motion.div>

        {/* Trackers Grid */}
        {filteredTrackers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 text-slate-400 mb-4">
              <Wallet className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
              {searchQuery ? 'No money trackers found' : 'No money trackers yet'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-medium max-w-[250px]">
              {searchQuery
                ? 'Try adjusting your search terms.'
                : 'Create your first money tracker to manage your expenses.'
              }
            </p>
            {!searchQuery && (
              <button
                onClick={createNewTracker}
                className="flex items-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 rounded-md hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors text-xs font-medium"
              >
                <Plus className="w-4 h-4" />
                Create Tracker
              </button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredTrackers.map((tracker) => {
                const totalExpenses = (tracker.expenses || []).reduce((sum, expense) => sum + expense.amount, 0);
                const remainingBalance = (tracker.startingAmount || 0) - totalExpenses;
                const remainingPercentage = tracker.startingAmount ? (remainingBalance / tracker.startingAmount) * 100 : 0;

                return (
                  <motion.div
                    key={tracker.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm transition-all overflow-hidden"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedTrackers.has(tracker.id)}
                            onChange={() => toggleTrackerSelection(tracker.id)}
                            className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-slate-900 dark:focus:ring-slate-100 bg-transparent"
                            title={`Select tracker: ${tracker.title || 'Untitled'}`}
                            aria-label={`Select tracker: ${tracker.title || 'Untitled'}`}
                          />
                        </div>
                        <button
                          onClick={() => {
                            setTrackerToDelete(tracker.id);
                            setShowDeleteConfirm(true);
                          }}
                          className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all -m-1 p-1"
                          title="Delete money tracker"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div
                        onClick={() => router.push(`/dashboard/money/${tracker.id}`)}
                        className="cursor-pointer"
                      >
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 truncate">
                          {tracker.title || 'Untitled Budget'}
                        </h3>

                        {/* Budget Overview */}
                        <div className="space-y-3 mb-4">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-medium text-slate-500 dark:text-slate-400">Starting Amount</span>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {formatCurrency(tracker.startingAmount || 0, tracker.currency || DEFAULT_CURRENCY)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-xs">
                            <span className="font-medium text-slate-500 dark:text-slate-400">Remaining</span>
                            <span className={`font-semibold ${remainingBalance >= 0 ? 'text-slate-900 dark:text-slate-100' : 'text-red-500'}`}>
                              {formatCurrency(remainingBalance, tracker.currency || DEFAULT_CURRENCY)}
                            </span>
                          </div>

                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${remainingPercentage >= 20 ? 'bg-slate-900 dark:bg-slate-100' : 'bg-red-500'
                                }`}
                              style={{ width: `${Math.max(0, Math.min(100, remainingPercentage))}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-medium text-slate-400 dark:text-slate-500 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                          <span className="uppercase tracking-wider">{(tracker.expenses || []).length} expenses</span>
                          <span>
                            {tracker.updatedAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-950 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 max-w-sm w-full"
            >
              <div className="text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 mx-auto mb-4">
                  <Trash2 className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Delete Money Tracker
                </h3>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-6">
                  Are you sure you want to delete this money tracker? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setTrackerToDelete(null);
                    }}
                    className="flex-1 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-md hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => trackerToDelete && handleDeleteTracker(trackerToDelete)}
                    className="flex-1 px-4 py-2 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}