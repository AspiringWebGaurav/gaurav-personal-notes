import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617' }}>
        <svg viewBox="0 0 100 100" width="140" height="140">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#4f46e5" strokeWidth="8" />
          <path d="M50 20 L80 50 L50 80 L20 50 Z" fill="#9333ea" />
          <circle cx="50" cy="50" r="10" fill="#ffffff" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
