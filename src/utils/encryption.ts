import CryptoJS from 'crypto-js';

/**
 * Encryption utilities for securing sensitive data like S3 credentials
 * Uses AES-256 encryption with user-specific keys derived from user ID and app secret
 */

const APP_SECRET = process.env.ENCRYPTION_SECRET || 'fallback-secret-key-change-in-production';

/**
 * Generate a user-specific encryption key
 * @param userId - User's unique identifier
 * @returns Derived encryption key
 */
function generateUserKey(userId: string): string {
  return CryptoJS.PBKDF2(userId + APP_SECRET, 'drivn-s3-salt', {
    keySize: 256 / 32,
    iterations: 10000,
  }).toString();
}

/**
 * Encrypt sensitive data using AES-256
 * @param data - Data to encrypt (will be JSON stringified)
 * @param userId - User ID for key derivation
 * @returns Encrypted string
 */
export function encryptData(data: any, userId: string): string {
  try {
    const key = generateUserKey(userId);
    const jsonString = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(jsonString, key).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 * @param encryptedData - Encrypted string
 * @param userId - User ID for key derivation
 * @returns Decrypted and parsed data
 */
export function decryptData<T = any>(encryptedData: string, userId: string): T {
  try {
    const key = generateUserKey(userId);
    const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, key);
    const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedString) {
      throw new Error('Failed to decrypt data - invalid key or corrupted data');
    }
    
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * S3 Configuration interface
 */
export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}

/**
 * Encrypt S3 configuration for secure storage
 * @param s3Config - S3 configuration object
 * @param userId - User ID for encryption
 * @returns Encrypted S3 config string
 */
export function encryptS3Config(s3Config: S3Config, userId: string): string {
  return encryptData(s3Config, userId);
}

/**
 * Decrypt S3 configuration
 * @param encryptedConfig - Encrypted S3 config string
 * @param userId - User ID for decryption
 * @returns Decrypted S3 configuration
 */
export function decryptS3Config(encryptedConfig: string, userId: string): S3Config {
  return decryptData<S3Config>(encryptedConfig, userId);
}

/**
 * Validate S3 configuration object
 * @param config - S3 configuration to validate
 * @returns Validation result
 */
export function validateS3Config(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be an object');
    return { valid: false, errors };
  }
  
  // Required fields
  const requiredFields = ['accessKeyId', 'secretAccessKey', 'region', 'bucket'];
  for (const field of requiredFields) {
    if (!config[field] || typeof config[field] !== 'string' || config[field].trim() === '') {
      errors.push(`${field} is required and must be a non-empty string`);
    }
  }
  
  // Optional endpoint validation
  if (config.endpoint && typeof config.endpoint !== 'string') {
    errors.push('endpoint must be a string if provided');
  }
  
  // Validate region format (basic check)
  if (config.region && !/^[a-z0-9-]+$/.test(config.region)) {
    errors.push('region must contain only lowercase letters, numbers, and hyphens');
  }
  
  // Validate bucket name (basic S3 bucket naming rules)
  if (config.bucket) {
    if (config.bucket.length < 3 || config.bucket.length > 63) {
      errors.push('bucket name must be between 3 and 63 characters');
    }
    if (!/^[a-z0-9.-]+$/.test(config.bucket)) {
      errors.push('bucket name can only contain lowercase letters, numbers, dots, and hyphens');
    }
    if (config.bucket.startsWith('.') || config.bucket.endsWith('.')) {
      errors.push('bucket name cannot start or end with a dot');
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Sanitize S3 config for logging (removes sensitive data)
 * @param config - S3 configuration
 * @returns Sanitized config safe for logging
 */
export function sanitizeS3ConfigForLogging(config: S3Config): Partial<S3Config> {
  return {
    region: config.region,
    bucket: config.bucket,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    accessKeyId: config.accessKeyId ? `${config.accessKeyId.substring(0, 4)}***` : undefined,
    secretAccessKey: config.secretAccessKey ? '***' : undefined,
  };
}
