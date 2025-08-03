import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  try {
    const customToken = request.cookies.get('auth-token')?.value;
    
    const isAuthenticated = !!customToken;

    const publicRoutes = ['/auth/verify'];
    const authRoutes = ['/login', '/signup'];
    const protectedRoutes = ['/dashboard'];

    const isPublicRoute = publicRoutes.includes(pathname);
    const isAuthRoute = authRoutes.includes(pathname);
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
    const isHomeRoute = pathname === '/';

    if(isPublicRoute) {
      return NextResponse.next();
    }

    if (isAuthenticated) {
      if (isAuthRoute || isHomeRoute) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      return NextResponse.next();
    }

    if (isProtectedRoute) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();

  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
};
