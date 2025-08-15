'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

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
  userId?: string;
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
  isOnline = true,
  userId
}: AvatarWithFallbackProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(!!src);

  const handleImageError = () => {
    console.error('Failed to load profile picture:', src);
    setImageError(true);
    setImageLoading(false);
    onError?.();
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    onLoad?.();
  };

  const getOptimizedSrc = (originalSrc: string) => {
    if (!originalSrc) return '';
    
    if (originalSrc.includes('googleusercontent.com')) {
      try {
        // Get base URL and request a larger size
        const baseUrl = originalSrc.split('?')[0].split('=s')[0];
        const optimizedUrl = `${baseUrl}=s400-c`;
        // Use our proxy endpoint
        return `/api/proxy-image?url=${encodeURIComponent(optimizedUrl)}`;
      } catch (error) {
        console.error('Error optimizing Google profile URL:', error);
        return originalSrc;
      }
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
        <div className={`relative ${sizeClasses[size]}`}>
          <Image
            className={`rounded-full object-cover border-2 border-white/20 transition-opacity duration-200 ${
              imageLoading ? 'opacity-0' : 'opacity-100'
            }`}
            src={getOptimizedSrc(src)}
            alt={alt}
            onError={handleImageError}
            onLoad={handleImageLoad}
            fill
            sizes={`(max-width: 768px) ${size === 'sm' ? '32px' : size === 'md' ? '40px' : '48px'}`}
            priority
            unoptimized={false} // Let Next.js handle optimization
          />
        </div>
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