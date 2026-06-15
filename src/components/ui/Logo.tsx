import React from 'react';

export function Logo({ className = "", animate = false, size = 40 }: { className?: string; animate?: boolean; size?: number }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg 
        viewBox="0 0 100 100" 
        className={`w-full h-full drop-shadow-xl ${animate ? 'animate-spin' : ''}`} 
        style={{ animationDuration: '6s' }}
      >
        <defs>
          <linearGradient id="logo-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" /> {/* indigo-600 */}
            <stop offset="100%" stopColor="#9333ea" /> {/* purple-600 */}
          </linearGradient>
          <linearGradient id="logo-grad-2" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#818cf8" /> {/* indigo-400 */}
            <stop offset="100%" stopColor="#c084fc" /> {/* purple-400 */}
          </linearGradient>
        </defs>
        
        {/* Outer Ring */}
        <circle 
          cx="50" cy="50" r="40" 
          fill="none" 
          stroke="url(#logo-grad-1)" 
          strokeWidth="8" 
          strokeDasharray={animate ? "160 80" : "none"} 
          className={animate ? 'animate-spin' : ''}
          style={{ transformOrigin: '50% 50%', animationDuration: '2s' }}
        />
        
        {/* Inner Diamond/Cube */}
        <path 
          d="M50 20 L80 50 L50 80 L20 50 Z" 
          fill="url(#logo-grad-2)" 
          opacity="0.9"
          className={animate ? 'animate-pulse' : ''}
          style={{ transformOrigin: '50% 50%', animationDuration: '1.5s' }}
        />
        
        {/* Center Core */}
        <circle cx="50" cy="50" r="10" fill="#ffffff" className="drop-shadow-md" />
      </svg>
    </div>
  );
}
