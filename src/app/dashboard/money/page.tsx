'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MoneyTracker } from '@/types';
import { formatCurrency, getCurrencySymbol, DEFAULT_CURRENCY } from '@/lib/currency';

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
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Go back to dashboard"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center space-x-2">
                <span className="text-xl">💰</span>
                <h1 className="text-lg font-medium text-gray-900">Money Trackers</h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {selectedTrackers.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete {selectedTrackers.size} trackers
                </button>
              )}
              <button
                onClick={createNewTracker}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>New Tracker</span>
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
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search money trackers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </motion.div>

        {/* Trackers Grid */}
        {filteredTrackers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="text-6xl mb-4">💰</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No money trackers found' : 'No money trackers yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'Create your first money tracker to get started'
              }
            </p>
            {!searchQuery && (
              <button
                onClick={createNewTracker}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                Create Money Tracker
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
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedTrackers.has(tracker.id)}
                            onChange={() => toggleTrackerSelection(tracker.id)}
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            title={`Select tracker: ${tracker.title || 'Untitled'}`}
                            aria-label={`Select tracker: ${tracker.title || 'Untitled'}`}
                          />
                        </div>
                        <button
                          onClick={() => {
                            setTrackerToDelete(tracker.id);
                            setShowDeleteConfirm(true);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete money tracker"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      
                      <div
                        onClick={() => router.push(`/dashboard/money/${tracker.id}`)}
                        className="cursor-pointer"
                      >
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                          {tracker.title || 'Untitled Budget'}
                        </h3>
                        
                        {/* Budget Overview */}
                        <div className="space-y-3 mb-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Starting Amount</span>
                            <span className="text-sm font-medium">
                              {formatCurrency(tracker.startingAmount || 0, tracker.currency || DEFAULT_CURRENCY)}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Remaining</span>
                            <span className={`text-sm font-medium ${
                              remainingBalance >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(remainingBalance, tracker.currency || DEFAULT_CURRENCY)}
                            </span>
                          </div>
                          
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                remainingPercentage >= 50 ? 'bg-green-500' :
                                remainingPercentage >= 25 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.max(0, Math.min(100, remainingPercentage))}%` }}
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>{(tracker.expenses || []).length} expenses</span>
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
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4"
          >
            <div className="text-center">
              <div className="text-4xl mb-3">🗑️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Delete Money Tracker
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this money tracker? This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setTrackerToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => trackerToDelete && handleDeleteTracker(trackerToDelete)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}