'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSyncStatus } from './SyncStatusProvider';
import { motion, AnimatePresence } from 'framer-motion';
import AvatarWithFallback from './AvatarWithFallback';

interface NavItem {
  name: string;
  href: string;
  icon: string;
  description: string;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: '🏠', description: 'Overview and quick actions' },
  { name: 'Notes', href: '/dashboard/notes', icon: '📝', description: 'All your notes' },
  { name: 'Money Tracker', href: '/dashboard/money', icon: '💰', description: 'Track expenses' },
  { name: 'Templates', href: '/dashboard/templates', icon: '📋', description: '25+ templates' },
  { name: 'Settings', href: '/dashboard/settings', icon: '⚙️', description: 'App preferences' },
  { name: 'Profile', href: '/dashboard/profile', icon: '👤', description: 'Your profile' },
  { name: 'Help', href: '/dashboard/help', icon: '❓', description: 'Get support' },
];

export default function GlobalNavbar() {
  const { user, signOut, userFirstName, userDisplayName, isNewUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading state
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);
  const { syncStatus } = useSyncStatus();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  // Close menus when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
  }, [pathname]);

  // Close menus on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

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

  // Reset avatar error when user changes
  useEffect(() => {
    setAvatarError(false);
    setAvatarLoading(true);
  }, [user?.photoURL]);

  if (!user) return null;

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const handleAvatarError = () => {
    setAvatarError(true);
    setAvatarLoading(false);
  };

  const handleAvatarLoad = () => {
    setAvatarLoading(false);
  };

  const getOptimizedAvatarSrc = () => {
    if (avatarError || !user?.photoURL) {
      return '/default-avatar.svg';
    }
    
    // Optimize Google profile pictures for better quality
    const photoURL = user.photoURL;
    if (photoURL.includes('googleusercontent.com')) {
      // Request higher resolution Google profile picture
      return photoURL.replace(/=s\d+-c/, '=s200-c').replace(/\/photo\.jpg$/, '/photo.jpg?sz=200');
    }
    
    return photoURL;
  };

  const getUserDisplayInfo = () => {
    const displayName = userDisplayName || user?.displayName || 'User';
    const firstName = userFirstName || displayName.split(' ')[0];
    const email = user?.email || '';
    
    return {
      displayName,
      firstName,
      email,
      initials: displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    };
  };

  const getBrandText = () => {
    // Responsive brand text
    return {
      full: "Gaurav's Personal Notes(GPN)",
      medium: "Gaurav's Notes",
      short: "GPN"
    };
  };

  return (
    <>
      <nav className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">
            {/* Logo and Brand - Left Section */}
            <div className="flex items-center min-w-0 flex-shrink-0">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/dashboard')}
                className="flex-shrink-0 flex items-center cursor-pointer group"
                aria-label="Go to dashboard"
              >
                <span className="text-2xl mr-2 sm:mr-3 group-hover:scale-110 transition-transform">📝</span>
                {/* Responsive brand text */}
                <span className="text-lg sm:text-xl font-bold text-white truncate transition-all duration-200">
                  <span className="hidden lg:inline">{getBrandText().full}</span>
                  <span className="hidden sm:inline lg:hidden">{getBrandText().medium}</span>
                  <span className="inline sm:hidden">{getBrandText().short}</span>
                </span>
              </motion.button>
            </div>

            {/* Desktop Navigation - Center Section */}
            <div className="hidden lg:flex lg:items-center lg:justify-center flex-1 px-4">
              <div className="flex items-center space-x-4">
                {navItems.map((item) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                  <motion.button
                    key={item.name}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push(item.href)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center min-w-[40px] ${
                      isActive(item.href)
                        ? 'bg-white/20 text-white shadow-lg'
                        : 'text-blue-100 hover:bg-white/10 hover:text-white'
                    }`}
                    title={item.description}
                    aria-label={`Navigate to ${item.name}: ${item.description}`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    <span className="hidden xl:inline">{item.name}</span>
                  </motion.button>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* User Profile Section - Right Section */}
            <div className="flex items-center justify-end gap-4 min-w-0 flex-shrink-0">
              {/* Mobile menu button */}
              <div className="lg:hidden">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="bg-white/10 p-2 rounded-lg text-blue-100 hover:text-white hover:bg-white/20 transition-colors touch-manipulation"
                  aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                  aria-expanded={isMobileMenuOpen}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {isMobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </motion.button>
              </div>

              {/* Profile dropdown */}
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="bg-white/10 px-3 py-2 rounded-lg flex items-center space-x-3 sm:space-x-4 text-blue-100 hover:text-white hover:bg-white/20 transition-all duration-200 touch-manipulation min-w-0"
                  aria-label="User menu"
                  aria-expanded={isProfileMenuOpen}
                >
                  {isLoading ? (
                    <div className="animate-pulse rounded-full bg-white/20 h-8 w-8" />
                  ) : (
                    <AvatarWithFallback
                    src={user?.photoURL}
                    alt={getUserDisplayInfo().displayName + ' avatar'}
                    size="sm"
                    initials={getUserDisplayInfo().initials}
                    onError={handleAvatarError}
                    onLoad={handleAvatarLoad}
                    showOnlineStatus={true}
                    isOnline={isOnline}
                    className="flex-shrink-0"
                    />
                  )}
                  <span className="hidden sm:block text-sm font-medium truncate max-w-[140px] lg:max-w-[180px]">
                    {getUserDisplayInfo().firstName}
                  </span>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d={isProfileMenuOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} 
                    />
                  </svg>
                </motion.button>

                {/* Profile dropdown menu */}
                <AnimatePresence>
                  {isProfileMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-1 z-50 border border-gray-200"
                    >
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                          <AvatarWithFallback
                            src={user?.photoURL}
                            alt={getUserDisplayInfo().displayName + ' avatar'}
                            size="md"
                            initials={getUserDisplayInfo().initials}
                            onError={handleAvatarError}
                            showOnlineStatus={true}
                            isOnline={isOnline}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {getUserDisplayInfo().displayName}
                            </p>
                            <p className="text-sm text-gray-500 truncate">{getUserDisplayInfo().email}</p>
                            <div className="flex items-center mt-1 space-x-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full mr-1 ${
                                  isOnline ? 'bg-green-400' : 'bg-gray-400'
                                }`}></span>
                                {isOnline ? 'Online' : 'Offline'}
                              </span>
                              {isNewUser && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  New User
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="py-1">
                        <button
                          onClick={() => {
                            router.push('/dashboard/profile');
                            setIsProfileMenuOpen(false);
                          }}
                          className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors touch-manipulation"
                        >
                          <span className="mr-3">👤</span>
                          <div>
                            <div className="font-medium">Profile</div>
                            <div className="text-xs text-gray-500">Manage your account</div>
                          </div>
                        </button>
                        
                        <button
                          onClick={() => {
                            router.push('/dashboard/settings');
                            setIsProfileMenuOpen(false);
                          }}
                          className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors touch-manipulation"
                        >
                          <span className="mr-3">⚙️</span>
                          <div>
                            <div className="font-medium">Settings</div>
                            <div className="text-xs text-gray-500">App preferences</div>
                          </div>
                        </button>
                        
                        <button
                          onClick={() => {
                            // Retry loading avatar if it failed
                            if (avatarError) {
                              setAvatarError(false);
                              setAvatarLoading(true);
                            }
                            setIsProfileMenuOpen(false);
                          }}
                          className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors touch-manipulation"
                        >
                          <span className="mr-3">🔄</span>
                          <div>
                            <div className="font-medium">Refresh Avatar</div>
                            <div className="text-xs text-gray-500">Reload profile picture</div>
                          </div>
                        </button>
                        
                        <button
                          onClick={() => {
                            router.push('/dashboard/help');
                            setIsProfileMenuOpen(false);
                          }}
                          className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors touch-manipulation"
                        >
                          <span className="mr-3">❓</span>
                          <div>
                            <div className="font-medium">Help & Support</div>
                            <div className="text-xs text-gray-500">Get assistance</div>
                          </div>
                        </button>
                      </div>
                      
                      <div className="border-t border-gray-100">
                        <div className="px-4 py-2 text-xs text-gray-500">
                          <div className="flex justify-between items-center">
                            <span>Account Status</span>
                            <span className={`font-medium ${isOnline ? 'text-green-600' : 'text-gray-600'}`}>
                              {isOnline ? 'Connected' : 'Offline'}
                            </span>
                          </div>
                          {user?.metadata?.lastSignInTime && (
                            <div className="flex justify-between items-center mt-1">
                              <span>Last Sign In</span>
                              <span className="font-medium">
                                {new Date(user.metadata.lastSignInTime).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="border-t border-gray-100 mt-1">
                        <button
                          onClick={() => {
                            handleSignOut();
                            setIsProfileMenuOpen(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors touch-manipulation"
                        >
                          <span className="mr-3">🚪</span>Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="lg:hidden bg-blue-700/95 backdrop-blur-sm border-t border-white/10 shadow-lg"
            >
              <div className="px-4 pt-2 pb-3 space-y-1">
                {navItems.map((item) => (
                  <motion.button
                    key={item.name}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      router.push(item.href);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`block w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 touch-manipulation ${
                      isActive(item.href)
                        ? 'bg-white/20 text-white shadow-lg'
                        : 'text-blue-100 hover:bg-white/10 hover:text-white'
                    }`}
                    aria-label={`Navigate to ${item.name}: ${item.description}`}
                  >
                    <div className="flex items-center relative overflow-hidden">
                      {isActive(item.href) && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute inset-0 bg-white/10 rounded-lg"
                          transition={{ duration: 0.3 }}
                        />
                      )}
                      <span className="mr-3 text-lg">{item.icon}</span>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-blue-200 mt-0.5">{item.description}</div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Click outside to close menus */}
      {(isMobileMenuOpen || isProfileMenuOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsMobileMenuOpen(false);
            setIsProfileMenuOpen(false);
          }}
          aria-hidden="true"
        />
      )}
    </>
  );
}