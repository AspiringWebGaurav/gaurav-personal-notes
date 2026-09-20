import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { userAgent } from 'next/server'

export function middleware(request: NextRequest) {
  const { device } = userAgent(request)
  const isMobile = device.type === 'mobile' || device.type === 'tablet'

  const pathname = request.nextUrl.pathname
  const isMobileRoute = pathname.startsWith('/mobile')
  
  // Exclude static files, API routes, and assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // If on a mobile device and NOT already on a /mobile route, redirect them.
  if (isMobile && !isMobileRoute) {
    // Redirect root to /mobile
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/mobile', request.url))
    }
    
    // Redirect /dashboard/... to /mobile/...
    if (pathname.startsWith('/dashboard')) {
      const mobilePath = pathname.replace('/dashboard', '/mobile')
      return NextResponse.redirect(new URL(mobilePath, request.url))
    }
    
    // Redirect /burn/... to /mobile/burn/...
    if (pathname.startsWith('/burn')) {
      return NextResponse.redirect(new URL(`/mobile${pathname}`, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/dashboard',
    '/dashboard/:path*',
    '/burn',
    '/burn/:path*',
  ],
}
