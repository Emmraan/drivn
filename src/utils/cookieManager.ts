import { NextRequest, NextResponse } from 'next/server';
import { encryptData, decryptData } from './encryption';

/**
 * Secure cookie management utilities for storing encrypted S3 credentials
 * Uses HttpOnly cookies with proper security headers
 */

const COOKIE_NAME = 'drivn_s3_config';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * Cookie options for secure storage
 */
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: COOKIE_MAX_AGE,
  path: '/',
});

/**
 * Set encrypted S3 configuration in HttpOnly cookie
 * @param response - NextResponse object
 * @param userId - User ID for encryption
 * @param s3Config - S3 configuration to encrypt and store
 */
export function setS3ConfigCookie(
  response: NextResponse,
  userId: string,
  s3Config: any
): void {
  try {
    const encryptedConfig = encryptData(s3Config, userId);
    const cookieOptions = getCookieOptions();
    
    response.cookies.set(COOKIE_NAME, encryptedConfig, cookieOptions);
    
    console.log('S3 config cookie set for user:', userId);
  } catch (error) {
    console.error('Error setting S3 config cookie:', error);
    throw new Error('Failed to set S3 configuration cookie');
  }
}

/**
 * Get and decrypt S3 configuration from HttpOnly cookie
 * @param request - NextRequest object
 * @param userId - User ID for decryption
 * @returns Decrypted S3 configuration or null if not found
 */
export function getS3ConfigFromCookie<T = any>(
  request: NextRequest,
  userId: string
): T | null {
  try {
    const encryptedConfig = request.cookies.get(COOKIE_NAME)?.value;
    
    if (!encryptedConfig) {
      return null;
    }
    
    const decryptedConfig = decryptData<T>(encryptedConfig, userId);
    return decryptedConfig;
  } catch (error) {
    console.error('Error getting S3 config from cookie:', error);
    return null;
  }
}

/**
 * Clear S3 configuration cookie
 * @param response - NextResponse object
 */
export function clearS3ConfigCookie(response: NextResponse): void {
  try {
    response.cookies.set(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    
    console.log('S3 config cookie cleared');
  } catch (error) {
    console.error('Error clearing S3 config cookie:', error);
  }
}

/**
 * Check if S3 configuration cookie exists
 * @param request - NextRequest object
 * @returns Boolean indicating if cookie exists
 */
export function hasS3ConfigCookie(request: NextRequest): boolean {
  return !!request.cookies.get(COOKIE_NAME)?.value;
}

/**
 * Validate cookie security settings
 * @returns Validation result with recommendations
 */
export function validateCookieSecurity(): {
  secure: boolean;
  recommendations: string[];
} {
  const recommendations: string[] = [];
  let secure = true;
  
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.NEXTAUTH_URL?.startsWith('https://')) {
      recommendations.push('Use HTTPS in production for secure cookies');
      secure = false;
    }
  }
  
  if (!process.env.ENCRYPTION_SECRET || process.env.ENCRYPTION_SECRET.length < 32) {
    recommendations.push('Use a strong encryption secret (at least 32 characters)');
    secure = false;
  }
  
  return { secure, recommendations };
}

/**
 * Enhanced cookie options for extra security in production
 */
export const getSecureCookieOptions = () => {
  const baseOptions = getCookieOptions();
  
  if (process.env.NODE_ENV === 'production') {
    return {
      ...baseOptions,
      secure: true,
      sameSite: 'strict' as const,
      // Add additional security headers
      domain: process.env.COOKIE_DOMAIN,
    };
  }
  
  return baseOptions;
};

/**
 * Middleware helper to set security headers for cookie responses
 * @param response - NextResponse object
 * @returns Modified response with security headers
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent XSS attacks
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Content Security Policy for additional protection
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  return response;
}

/**
 * Cookie rotation utility - regenerate encrypted cookie with new encryption
 * @param request - NextRequest object
 * @param response - NextResponse object
 * @param userId - User ID
 * @returns Boolean indicating if rotation was successful
 */
export function rotateS3ConfigCookie(
  request: NextRequest,
  response: NextResponse,
  userId: string
): boolean {
  try {
    const currentConfig = getS3ConfigFromCookie(request, userId);
    
    if (!currentConfig) {
      return false;
    }
    
    // Re-encrypt with fresh encryption
    setS3ConfigCookie(response, userId, currentConfig);
    
    console.log('S3 config cookie rotated for user:', userId);
    return true;
  } catch (error) {
    console.error('Error rotating S3 config cookie:', error);
    return false;
  }
}
