import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gaurav Personal Notes',
    short_name: 'GPN',
    description: 'Fast, secure personal notes and shared workspace.',
    start_url: '/mobile',
    display: 'standalone',
    background_color: '#09090b', // zinc-950
    theme_color: '#09090b',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable'
      },
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      }
    ],
  }
}
