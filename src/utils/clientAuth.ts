/**
 * Client-side authentication utilities
 * These functions work with user data that has already been fetched from the server
 */

interface User {
  _id?: string;
  email: string;
  name: string;
  emailVerified?: Date;
  image?: string;
  role?: string;
  isAdmin?: boolean;
}

/**
 * Check if a user is an admin based on the user object
 * This relies on the server-side API to have already determined admin status
 * @param user - User object from auth context
 * @returns boolean indicating if user is admin
 */
export function isUserAdmin(user: User | null): boolean {
  return user?.isAdmin === true;
}

/**
 * Get user role display text
 * @param user - User object from auth context
 * @returns string role for display
 */
export function getUserRole(user: User | null): string {
  return user?.role || 'User';
}

/**
 * Check if user has specific permissions
 * @param user - User object from auth context
 * @param permission - Permission to check
 * @returns boolean indicating if user has permission
 */
export function hasPermission(user: User | null, permission: 'admin' | 'user'): boolean {
  if (!user) return false;
  
  switch (permission) {
    case 'admin':
      return isUserAdmin(user);
    case 'user':
      return true;
    default:
      return false;
  }
}
