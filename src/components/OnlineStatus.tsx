'use client';

import { memo } from 'react';

export interface OnlineStatusProps {
  isOnline: boolean;
  className?: string;
}

const OnlineStatus = memo(function OnlineStatus({
  isOnline,
  className = ''
}: OnlineStatusProps) {
  const config = isOnline
    ? {
        color: 'bg-green-100 text-green-800 border-green-200',
        dotColor: 'bg-green-500',
        text: 'Online',
        icon: '🟢'
      }
    : {
        color: 'bg-red-100 text-red-800 border-red-200',
        dotColor: 'bg-red-500',
        text: 'Offline',
        icon: '🔴'
      };

  return (
    <div
      className={`
        flex items-center px-2 py-1 rounded-md text-xs font-medium
        border transition-colors duration-150 ease-out
        ${config.color} ${className}
      `}
    >
      {/* Status indicator dot */}
      <div className="flex items-center mr-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
      </div>

      {/* Status text */}
      <span className="whitespace-nowrap">
        {config.text}
      </span>
    </div>
  );
});

export default OnlineStatus;