'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAutosave } from '@/hooks/useAutosave';
import { useSyncStatus } from '@/components/SyncStatusProvider';
import StaticSyncStatus from '@/components/StaticSyncStatus';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, onSnapshot, Timestamp, DocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MoneyTracker, Expense, Currency } from '@/types';
import { CurrencySelector, CurrencySetupModal } from '@/components/CurrencySelector';
import { formatCurrency, getCurrencySymbol, DEFAULT_CURRENCY } from '@/lib/currency';
import { getTemplateById } from '@/lib/templates';

// Loading component for Suspense fallback
function MoneyTrackerLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Main component wrapped in Suspense
function MoneyTrackerContent({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading } = useAuth();
  const { syncStatus } = useSyncStatus();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Unwrap params
  const [trackerId, setTrackerId] = useState<string>('');
  
  useEffect(() => {
    params.then(({ id }) => setTrackerId(id));
  }, [params]);
  
  const [tracker, setTracker] = useState<Partial<MoneyTracker>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showCurrencySetup, setShowCurrencySetup] = useState(false);
  const [newExpense, setNewExpense] = useState({
    title: '',
    amount: '',
    category: 'Other',
    description: ''
  });

  // Derived values
  const templateId = searchParams.get('template');

  // Auto-save functionality - only enable when we have valid trackerId AND data is loaded
  const { saveImmediately, isOnline, hasUnsyncedChanges } = useAutosave({
    id: trackerId,
    collection: 'money',
    data: tracker,
    enabled: !!trackerId && isDataLoaded // Only enable when trackerId is available AND data is loaded
  });

  // Load tracker from Firestore or initialize with template
  useEffect(() => {
    if (!user || loading || !trackerId) return;

    const trackerRef = doc(db, 'users', user.uid, 'money', trackerId);
    const unsubscribe = onSnapshot(trackerRef, (docSnap: DocumentSnapshot) => {
      if (docSnap.exists()) {
        const trackerData = { id: docSnap.id, ...docSnap.data() } as MoneyTracker;
        setTracker(trackerData);
        setIsDataLoaded(true);
      } else {
        // Check localStorage for offline data
        const localData = localStorage.getItem(`autosave:${user.uid}:${trackerId}`);
        if (localData) {
          try {
            const parsedData = JSON.parse(localData);
            setTracker(parsedData);
            setIsDataLoaded(true);
          } catch (error) {
            console.error('Error parsing local data:', error);
            initializeTracker();
          }
        } else {
          initializeTracker();
        }
      }
      setIsLoading(false);
    });

    const initializeTracker = () => {
      let defaultTracker: Partial<MoneyTracker> = {
        id: trackerId,
        title: 'My Budget',
        startingAmount: 0,
        currency: DEFAULT_CURRENCY,
        expenses: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      // If template is specified, apply template configuration
      if (templateId) {
        const template = getTemplateById(templateId);
        if (template && template.type === 'money' && template.moneyConfig) {
          defaultTracker = {
            ...defaultTracker,
            title: template.title,
            startingAmount: template.moneyConfig.startingAmount,
            currency: template.moneyConfig.currency,
            // Don't show currency setup if template has currency
          };
          // Don't show currency setup modal if template provides currency
          setShowCurrencySetup(false);
        } else {
          setShowCurrencySetup(true);
        }
      } else {
        setShowCurrencySetup(true);
      }

      setTracker(defaultTracker);
      setIsDataLoaded(true);
    };

    return () => unsubscribe();
  }, [user, loading, trackerId, templateId]);

  // Calculate current balance using useMemo to prevent infinite loops
  const currentBalance = useMemo(() => {
    const totalExpenses = (tracker.expenses || []).reduce((sum: number, expense: Expense) => sum + expense.amount, 0);
    return (tracker.startingAmount || 0) - totalExpenses;
  }, [tracker.expenses, tracker.startingAmount]);

  // Effect for authentication redirect
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleStartingAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = parseFloat(e.target.value) || 0;
    const updatedTracker = { ...tracker, startingAmount: amount, updatedAt: Timestamp.now() };
    setTracker(updatedTracker);
    
    // Force immediate save for critical data changes - only if data is loaded
    if (trackerId && user && isDataLoaded) {
      saveImmediately(updatedTracker);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const updatedTracker = { ...tracker, title: e.target.value, updatedAt: Timestamp.now() };
    setTracker(updatedTracker);
    
    // Force immediate save for title changes - only if data is loaded
    if (trackerId && user && isDataLoaded) {
      saveImmediately(updatedTracker);
    }
  };

  const handleCurrencyChange = (currency: Currency['code']) => {
    const updatedTracker = { ...tracker, currency, updatedAt: Timestamp.now() };
    setTracker(updatedTracker);
    
    // Force immediate save for currency changes - only if data is loaded
    if (trackerId && user && isDataLoaded) {
      saveImmediately(updatedTracker);
    }
  };

  const handleCurrencySetup = (currency: Currency['code']) => {
    const updatedTracker = { ...tracker, currency, updatedAt: Timestamp.now() };
    setTracker(updatedTracker);
    setShowCurrencySetup(false);
    
    // Force immediate save for initial currency setup - only if data is loaded
    if (trackerId && user && isDataLoaded) {
      saveImmediately(updatedTracker);
    }
  };

  const addExpense = () => {
    if (!newExpense.title || !newExpense.amount || !isDataLoaded) return;

    const expense: Expense = {
      id: `expense_${Date.now()}`,
      title: newExpense.title,
      amount: parseFloat(newExpense.amount),
      category: newExpense.category,
      date: Timestamp.now(),
      description: newExpense.description
    };

    const updatedTracker = {
      ...tracker,
      expenses: [...(tracker.expenses || []), expense],
      updatedAt: Timestamp.now()
    };
    setTracker(updatedTracker);
    
    // Force immediate save when adding expenses - only if data is loaded
    if (trackerId && user && isDataLoaded) {
      saveImmediately(updatedTracker);
    }

    // Reset form
    setNewExpense({
      title: '',
      amount: '',
      category: 'Other',
      description: ''
    });
    setShowExpenseForm(false);
  };

  const removeExpense = (expenseId: string) => {
    if (!isDataLoaded) return;
    
    const updatedTracker = {
      ...tracker,
      expenses: (tracker.expenses || []).filter((expense: Expense) => expense.id !== expenseId),
      updatedAt: Timestamp.now()
    };
    setTracker(updatedTracker);
    
    // Force immediate save when removing expenses - only if data is loaded
    if (trackerId && user && isDataLoaded) {
      saveImmediately(updatedTracker);
    }
  };

  const goBack = () => {
    router.push('/dashboard/money');
  };

  if (loading || isLoading) {
    return <MoneyTrackerLoading />;
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  // Get categories from template or use defaults
  const getCategories = () => {
    if (templateId) {
      const template = getTemplateById(templateId);
      if (template && template.type === 'money' && template.moneyConfig) {
        return template.moneyConfig.presetCategories;
      }
    }
    return ['Food', 'Transportation', 'Entertainment', 'Shopping', 'Bills', 'Healthcare', 'Other'];
  };
  
  const categories = getCategories();
  const totalExpenses = (tracker.expenses || []).reduce((sum: number, expense: Expense) => sum + expense.amount, 0);
  const remainingPercentage = tracker.startingAmount ? (currentBalance / tracker.startingAmount) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={goBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Go back to money trackers"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center space-x-2">
                <span className="text-xl">💰</span>
                <input
                  type="text"
                  value={tracker.title || ''}
                  onChange={handleTitleChange}
                  className="text-lg font-medium text-gray-900 bg-transparent border-none outline-none"
                  placeholder="Budget Title"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Static Sync Status */}
              <StaticSyncStatus />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Budget Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-6 mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Starting Amount */}
            <div className="text-center">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Starting Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  {getCurrencySymbol(tracker.currency || DEFAULT_CURRENCY)}
                </span>
                <input
                  type="number"
                  value={tracker.startingAmount || ''}
                  onChange={handleStartingAmountChange}
                  className="w-full pl-8 pr-4 py-3 text-2xl font-bold text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
            </div>

            {/* Current Balance */}
            <div className="text-center">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remaining Balance
              </label>
              <div className={`text-3xl font-bold ${
                currentBalance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(currentBalance, tracker.currency || DEFAULT_CURRENCY)}
              </div>
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      remainingPercentage >= 50 ? 'bg-green-500' :
                      remainingPercentage >= 25 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, remainingPercentage))}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {remainingPercentage.toFixed(1)}% remaining
                </p>
              </div>
            </div>

            {/* Total Spent */}
            <div className="text-center">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Spent
              </label>
              <div className="text-3xl font-bold text-red-600">
                {formatCurrency(totalExpenses, tracker.currency || DEFAULT_CURRENCY)}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {(tracker.expenses || []).length} expenses
              </p>
            </div>
          </div>
        </motion.div>

        {/* Currency Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="bg-white rounded-xl shadow-sm p-4">
            <CurrencySelector
              selectedCurrency={tracker.currency || DEFAULT_CURRENCY}
              onCurrencyChange={handleCurrencyChange}
              className="max-w-xs"
            />
          </div>
        </motion.div>

        {/* Add Expense Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <button
            onClick={() => setShowExpenseForm(true)}
            className="w-full md:w-auto bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Expense</span>
          </button>
        </motion.div>

        {/* Add Expense Form */}
        <AnimatePresence>
          {showExpenseForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-xl shadow-sm p-6 mb-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Expense</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={newExpense.title}
                    onChange={(e) => setNewExpense((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., Lunch at restaurant"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      {getCurrencySymbol(tracker.currency || DEFAULT_CURRENCY)}
                    </span>
                    <input
                      type="number"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense((prev) => ({ ...prev, amount: e.target.value }))}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    title="Select expense category"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Optional description"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowExpenseForm(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addExpense}
                  disabled={!newExpense.title || !newExpense.amount}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add Expense
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expenses List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm"
        >
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Expenses ({(tracker.expenses || []).length})
            </h3>
          </div>

          {(tracker.expenses || []).length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-4xl mb-3">💸</div>
              <p>No expenses yet. Add your first expense above!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              <AnimatePresence>
                {(tracker.expenses || []).map((expense: Expense) => (
                  <motion.div
                    key={expense.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium text-gray-900">{expense.title}</h4>
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            {expense.category}
                          </span>
                        </div>
                        {expense.description && (
                          <p className="text-sm text-gray-600 mt-1">{expense.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {expense.date?.toDate?.()?.toLocaleDateString() || 'Recently'}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-lg font-semibold text-red-600">
                          -{formatCurrency(expense.amount, tracker.currency || DEFAULT_CURRENCY)}
                        </span>
                        <button
                          onClick={() => removeExpense(expense.id)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete expense"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </main>

      {/* Currency Setup Modal */}
      <CurrencySetupModal
        isOpen={showCurrencySetup}
        onCurrencySelect={handleCurrencySetup}
      />
    </div>
  );
}

// Main export with Suspense wrapper
export default function MoneyTrackerPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<MoneyTrackerLoading />}>
      <MoneyTrackerContent params={params} />
    </Suspense>
  );
}