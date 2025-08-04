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
  const isPublicRoute = publicRoutes.includes(pathname);
  const isAuthRoute = authRoutes.includes(pathname);
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isHomeRoute = pathname === '/';

  const token = request.cookies.get('auth-token')?.value;
  let isTokenValid = false;

  if (token) {
    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      isTokenValid = !!verified;
    } catch (err) {
      console.warn('JWT verification failed:', err);
    }
  }

  if (isPublicRoute) return NextResponse.next();

  if (isTokenValid) {
    if (isAuthRoute || isHomeRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  if (isProtectedRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}
