'use client';

import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
            <p className="text-gray-600">Manage your app preferences and account settings</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Coming Soon</h2>
            <p className="text-gray-600">
              Settings page is under development. You'll be able to customize your app preferences here.
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}