import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Handle internal Next.js requests that might be causing 404s
  const { pathname } = request.nextUrl;
  
  // Skip processing for API routes and static files
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') // Files with extensions
  ) {
    return NextResponse.next();
  }
  
  // Suppress noisy logs in development
  if (process.env.NODE_ENV === 'development') {
    // Handle problematic internal routes that cause 404s
    if (pathname === '/_next/internal/helpers.ts' || 
        pathname === '/_next/static/runtime.ts') {
      return new Response('Not Found', { status: 404 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};