import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sizeParam = searchParams.get('size');
  const size = sizeParam ? parseInt(sizeParam, 10) : 192;

  // Ensure reasonable sizes
  const validSize = [192, 512].includes(size) ? size : 192;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617' }}>
        <svg viewBox="0 0 100 100" width={`${validSize * 0.75}`} height={`${validSize * 0.75}`}>
          <circle cx="50" cy="50" r="40" fill="none" stroke="#4f46e5" strokeWidth="8" />
          <path d="M50 20 L80 50 L50 80 L20 50 Z" fill="#9333ea" />
          <circle cx="50" cy="50" r="10" fill="#ffffff" />
        </svg>
      </div>
    ),
    { width: validSize, height: validSize }
  );
}
