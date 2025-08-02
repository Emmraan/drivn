import { NextRequest } from 'next/server';
import { AuthService } from '@/auth/services/authService';

export async function getAuthenticatedUser(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return null;
    }

    const user = await AuthService.getUserFromToken(token);
    return user;
  } catch (error) {
    console.error('Auth middleware error:', error);
    return null;
  }
}

export function requireAuth(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return Response.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Add user to request context
    (request as any).user = user;
    
    return handler(request, ...args);
  };
}
