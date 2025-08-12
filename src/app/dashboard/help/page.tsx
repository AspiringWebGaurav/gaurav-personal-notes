'use client';

import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

export default function HelpPage() {
  const { user } = useAuth();

  if (!user) return null;

  const faqs = [
    {
      question: "How do I create a new note?",
      answer: "Click the 'New Note' button on the dashboard or navigate to Notes and click the '+' button."
    },
    {
      question: "Are my notes saved automatically?",
      answer: "Yes! Your notes are automatically saved as you type. You'll see the sync status in the navbar."
    },
    {
      question: "Can I use the app offline?",
      answer: "Yes, the app works offline. Your changes will sync when you're back online."
    },
    {
      question: "How do I organize my notes?",
      answer: "You can pin important notes, archive old ones, and use templates for different types of content."
    },
    {
      question: "How does the money tracker work?",
      answer: "Create a money tracker to set a budget and track your expenses. It supports multiple currencies."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Help & Support</h1>
            <p className="text-gray-600">Get help with using your personal notes app</p>
          </div>

          {/* Quick Start */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Start</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">📝</span>
                  <div>
                    <h3 className="font-medium text-gray-900">Create Notes</h3>
                    <p className="text-sm text-gray-600">Start writing your thoughts instantly</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">💰</span>
                  <div>
                    <h3 className="font-medium text-gray-900">Track Money</h3>
                    <p className="text-sm text-gray-600">Monitor your expenses and budget</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">📋</span>
                  <div>
                    <h3 className="font-medium text-gray-900">Use Templates</h3>
                    <p className="text-sm text-gray-600">Choose from 25+ pre-made templates</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🔄</span>
                  <div>
                    <h3 className="font-medium text-gray-900">Auto Sync</h3>
                    <p className="text-sm text-gray-600">Your data syncs automatically</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border-b border-gray-200 pb-4 last:border-b-0"
                >
                  <h3 className="font-medium text-gray-900 mb-2">{faq.question}</h3>
                  <p className="text-gray-600">{faq.answer}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Need More Help?</h2>
            <p className="text-gray-600 mb-4">
              Can't find what you're looking for? We're here to help!
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Contact Support
              </button>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                View Documentation
              </button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}