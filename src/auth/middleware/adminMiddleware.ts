import { NextRequest } from 'next/server';
import { getAuthenticatedUser } from './authMiddleware';

/**
 * Check if the authenticated user is an admin
 * @param request - NextRequest object
 * @returns User object if admin, null otherwise
 */
export async function getAuthenticatedAdmin(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return null;
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    
    if (!adminEmail) {
      console.warn('ADMIN_EMAIL environment variable not set');
      return null;
    }

    if (user.email.toLowerCase() === adminEmail.toLowerCase()) {
      return user;
    }

    return null;
  } catch (error) {
    console.error('Admin middleware error:', error);
    return null;
  }
}

/**
 * Check if a user email is an admin email
 * @param email - User email to check
 * @returns boolean indicating if user is admin
 */
export function isAdminEmail(email: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  
  if (!adminEmail) {
    return false;
  }

  return email.toLowerCase() === adminEmail.toLowerCase();
}

/**
 * Middleware wrapper to require admin authentication
 * @param handler - Route handler function
 * @returns Wrapped handler that requires admin auth
 */
export function requireAdmin<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T) => {
    const admin = await getAuthenticatedAdmin(request);

    if (!admin) {
      return Response.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    (request as NextRequest & { admin: typeof admin }).admin = admin;

    return handler(request, ...args);
  };
}
