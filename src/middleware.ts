import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

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

  const publicRoutes = ['/auth/verify'];
  const authRoutes = ['/login', '/signup'];
  const protectedRoutes = ['/dashboard'];
  const adminRoutes = ['/admin-dashboard'];
  const isPublicRoute = publicRoutes.includes(pathname);
  const isAuthRoute = authRoutes.includes(pathname);
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
  const isHomeRoute = pathname === '/';

  const token = request.cookies.get('auth-token')?.value;
  let isTokenValid = false;
  let userEmail = '';

  if (token) {
    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      isTokenValid = !!verified;
      userEmail = (verified.payload as any).email || '';
    } catch (err) {
      console.warn('JWT verification failed:', err);
    }
  }

  if (isPublicRoute) return NextResponse.next();

  if (isTokenValid) {
    if (isAdminRoute) {
      const adminEmail = process.env.ADMIN_EMAIL;
      console.log('Admin check:', { adminEmail, userEmail, isMatch: adminEmail && userEmail.toLowerCase() === adminEmail.toLowerCase() });

      if (!adminEmail || userEmail.toLowerCase() !== adminEmail.toLowerCase()) {
        console.log('Admin access denied, redirecting to dashboard');
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      console.log('Admin access granted');
    }

    if (isAuthRoute || isHomeRoute) {
      // Check if user is admin and redirect to admin dashboard
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail && userEmail.toLowerCase() === adminEmail.toLowerCase()) {
        return NextResponse.redirect(new URL('/admin-dashboard', request.url));
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  if (isProtectedRoute || isAdminRoute) {
    return NextResponse.redirect(new URL('/', request.url));
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
