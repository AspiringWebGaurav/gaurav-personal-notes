'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CURRENCIES, getCurrencySymbol } from '@/lib/currency';
import { Currency } from '@/types';

interface CurrencySelectorProps {
  selectedCurrency: Currency['code'];
  onCurrencyChange: (currency: Currency['code']) => void;
  showLabel?: boolean;
  className?: string;
}

export function CurrencySelector({ 
  selectedCurrency, 
  onCurrencyChange, 
  showLabel = true,
  className = '' 
}: CurrencySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedCurrencyData = CURRENCIES.find(c => c.code === selectedCurrency);

  return (
    <div className={`relative ${className}`}>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Currency
        </label>
      )}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg font-semibold">
            {getCurrencySymbol(selectedCurrency)}
          </span>
          <span className="text-sm text-gray-700">
            {selectedCurrencyData?.name} ({selectedCurrency})
          </span>
        </div>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg"
          >
            {CURRENCIES.map((currency) => (
              <button
                key={currency.code}
                type="button"
                onClick={() => {
                  onCurrencyChange(currency.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  selectedCurrency === currency.code ? 'bg-green-50 text-green-700' : 'text-gray-700'
                }`}
              >
                <span className="text-lg font-semibold w-6">
                  {currency.symbol}
                </span>
                <div className="flex-1">
                  <div className="font-medium">{currency.name}</div>
                  <div className="text-xs text-gray-500">{currency.code}</div>
                </div>
                {selectedCurrency === currency.code && (
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

interface CurrencySetupModalProps {
  isOpen: boolean;
  onCurrencySelect: (currency: Currency['code']) => void;
}

export function CurrencySetupModal({ isOpen, onCurrencySelect }: CurrencySetupModalProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency['code']>('INR');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4"
      >
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">💰</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Choose Your Currency
          </h2>
          <p className="text-gray-600 text-sm">
            Select your preferred currency for money tracking. You can change this later in settings.
          </p>
        </div>

        <CurrencySelector
          selectedCurrency={selectedCurrency}
          onCurrencyChange={setSelectedCurrency}
          showLabel={false}
          className="mb-6"
        />

        <div className="flex space-x-3">
          <button
            onClick={() => onCurrencySelect(selectedCurrency)}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Continue with {getCurrencySymbol(selectedCurrency)}
          </button>
        </div>
      </motion.div>
    </div>
  );
}