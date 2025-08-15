'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AvatarWithFallback from '@/components/AvatarWithFallback';

export default function TestNavbarPage() {
  const [avatarError, setAvatarError] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showNoPhotoUser, setShowNoPhotoUser] = useState(false);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const mockUsers = {
    withPhoto: {
      uid: 'test-user-1',
      displayName: 'John Doe',
      email: 'john.doe@example.com',
      photoURL: 'https://lh3.googleusercontent.com/a/default-user'
    },
    noPhoto: {
      uid: 'test-user-2',
      displayName: 'Jane Smith',
      email: 'jane.smith@example.com',
      photoURL: null
    }
  };

  const currentUser = showNoPhotoUser ? mockUsers.noPhoto : mockUsers.withPhoto;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Enhanced Profile Features</h1>
          
          <div className="space-y-8">
            {/* Avatar Demo Section */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Avatar Component</h2>
              <div className="flex flex-wrap gap-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-700">Small Size</h3>
                  <AvatarWithFallback
                    src={currentUser.photoURL}
                    userId={currentUser.uid}
                    alt={currentUser.displayName}
                    size="sm"
                    initials={currentUser.displayName.split(' ').map(n => n[0]).join('')}
                    showOnlineStatus={true}
                    isOnline={isOnline}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-700">Medium Size</h3>
                  <AvatarWithFallback
                    src={currentUser.photoURL}
                    userId={currentUser.uid}
                    alt={currentUser.displayName}
                    size="md"
                    initials={currentUser.displayName.split(' ').map(n => n[0]).join('')}
                    showOnlineStatus={true}
                    isOnline={isOnline}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-700">Large Size</h3>
                  <AvatarWithFallback
                    src={currentUser.photoURL}
                    userId={currentUser.uid}
                    alt={currentUser.displayName}
                    size="lg"
                    initials={currentUser.displayName.split(' ').map(n => n[0]).join('')}
                    showOnlineStatus={true}
                    isOnline={isOnline}
                  />
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">Test Controls</h2>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setShowNoPhotoUser(!showNoPhotoUser)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {showNoPhotoUser ? 'Show User With Photo' : 'Show User Without Photo'}
                </button>

                <button
                  onClick={() => setIsOnline(!isOnline)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isOnline 
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-600 hover:bg-gray-700 text-white'
                  }`}
                >
                  Toggle Online Status
                </button>
              </div>
            </div>

            {/* Features List */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">✨ Enhanced Features</h2>
              <ul className="space-y-2 text-gray-600">
                <li>• <strong>Loading States:</strong> Smooth loading animation while avatar loads</li>
                <li>• <strong>Error Handling:</strong> Fallback to initials on load failure</li>
                <li>• <strong>Online Status:</strong> Real-time online/offline indicator</li>
                <li>• <strong>Responsive Sizes:</strong> Small, medium, and large variants</li>
                <li>• <strong>Google Photos:</strong> Optimized loading of Google profile pictures</li>
                <li>• <strong>Animations:</strong> Smooth transitions between states</li>
                <li>• <strong>Accessibility:</strong> Proper ARIA labels and keyboard support</li>
              </ul>
            </div>

            {/* Test Instructions */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-blue-800">
                <strong>Test Instructions:</strong> Try toggling between users with and without photos, 
                test online/offline status, and observe loading states and animations. The avatar component 
                handles various edge cases and provides a consistent experience across different scenarios.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}