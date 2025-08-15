import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return new NextResponse('Missing URL parameter', { status: 400 });
    }

    // Only allow Google user content URLs
    if (!url.includes('googleusercontent.com')) {
      return new NextResponse('Invalid URL', { status: 400 });
    }

    // Add a timestamp to prevent caching
    const timestamp = Date.now();
    const finalUrl = `${url}${url.includes('?') ? '&' : '?'}t=${timestamp}`;

    const response = await fetch(finalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'image/*',
        'Referer': 'https://accounts.google.com/'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const imageData = await response.arrayBuffer();

    return new Response(imageData, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': '*',
        'Cross-Origin-Resource-Policy': 'cross-origin'
      }
    });
  } catch (error) {
    console.error('Proxy image error:', error);
    return new NextResponse('Failed to fetch image', { status: 500 });
  }
}