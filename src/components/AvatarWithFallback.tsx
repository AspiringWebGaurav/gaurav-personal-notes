'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface AvatarWithFallbackProps {
  src?: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  initials?: string;
  className?: string;
  onError?: () => void;
  onLoad?: () => void;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base'
};

export default function AvatarWithFallback({
  src,
  alt,
  size = 'sm',
  initials = 'U',
  className = '',
  onError,
  onLoad,
  showOnlineStatus = false,
  isOnline = true
}: AvatarWithFallbackProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(!!src);

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
    onError?.();
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    onLoad?.();
  };

  const getOptimizedSrc = (originalSrc: string) => {
    if (originalSrc.includes('googleusercontent.com')) {
      // Request higher resolution Google profile picture
      return originalSrc
        .replace(/=s\d+-c/, '=s200-c')
        .replace(/\/photo\.jpg$/, '/photo.jpg?sz=200');
    }
    return originalSrc;
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* Loading spinner */}
      {imageLoading && src && (
        <div className={`absolute inset-0 ${sizeClasses[size]} rounded-full bg-gray-200 animate-pulse flex items-center justify-center`}>
          <div className="w-4 h-4 border-2 border-gray-400 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      )}

      {/* Avatar image or fallback */}
      {src && !imageError ? (
        <img
          className={`${sizeClasses[size]} rounded-full object-cover border-2 border-white/20 transition-opacity duration-200 ${
            imageLoading ? 'opacity-0' : 'opacity-100'
          }`}
          src={getOptimizedSrc(src)}
          alt={alt}
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
      ) : (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold border-2 border-white/20`}
        >
          {initials}
        </motion.div>
      )}

      {/* Online status indicator */}
      {showOnlineStatus && (
        <div 
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
            isOnline ? 'bg-green-400' : 'bg-gray-400'
          }`}
          title={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  );
}