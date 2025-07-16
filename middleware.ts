import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createSupabaseMiddlewareClient(request, res);

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const protectedPaths = [
    '/dashboard',
    '/admin',
    '/agents',
    '/call-history',
    '/analytics',
    '/settings',
    '/profile',
    '/users',
  ];

  const isProtectedPath = protectedPaths.some(p => pathname.startsWith(p));
  const isPortalPath = pathname.startsWith('/portal');

  if (user) {
    if (pathname === '/login' || pathname === '/register') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    const userRole = user?.user_metadata?.role;

    if (pathname === '/portal' && userRole === 'student') {
      return NextResponse.redirect(new URL('/portal/workspace', request.url));
    }

    if (isPortalPath) {
      if (userRole !== 'student') {
        return NextResponse.redirect(new URL('/dashboard?error=portal_access_denied', request.url));
      }
    }
    else if (pathname.startsWith('/admin')) {
      if (userRole !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard?error=unauthorized_admin_access', request.url));
      }
    }
    else if (isProtectedPath) {
      if (userRole === 'student') {
        return NextResponse.redirect(new URL('/portal?error=unauthorized_access', request.url));
      }
    }

    if (isProtectedPath || isPortalPath) {
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.headers.set('Pragma', 'no-cache');
      res.headers.set('Expires', '0');
      res.headers.set('Surrogate-Control', 'no-store');
    }

  } else {
    if ((isProtectedPath || isPortalPath) &&
        pathname !== '/login' &&
        pathname !== '/register' &&
        pathname !== '/portal'
    ) {
      
      const loginUrl = isPortalPath ? '/portal' : '/login';
      let redirectUrl = new URL(loginUrl, request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};