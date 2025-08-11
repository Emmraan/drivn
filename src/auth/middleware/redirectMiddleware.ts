import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function withAuth(handler: (request: NextRequest) => Promise<Response>) {
  return async (request: NextRequest) => {
    const token = request.cookies.get('auth-token');
    const response = await handler(request);

    if (response.status === 200) {
      try {
        const data = await response.clone().json();
        if (data.success && data.token && !token) {
          const redirectUrl = new URL('/dashboard', request.url);
          const redirectResponse = NextResponse.redirect(redirectUrl);
          
          redirectResponse.cookies.set('auth-token', data.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60
          });

          return redirectResponse;
        }
      } catch (error) {
        console.error('Redirect middleware error:', error);
        return response;
      }
    }

    return response;
  };
}
