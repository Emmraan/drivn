import { S3Client, HeadBucketCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import connectDB from '@/utils/database';
import User, { IUser } from '@/auth/models/User';
import { S3Config, encryptS3Config, decryptS3Config, validateS3Config, sanitizeS3ConfigForLogging } from '@/utils/encryption';

/**
 * Service for managing user S3 configurations
 * Handles validation, testing, and secure storage of S3 credentials
 */
export class S3ConfigService {
  /**
   * Test S3 connection with provided credentials
   * @param config - S3 configuration to test
   * @returns Test result with success status and message
   */
  static async testS3Connection(config: S3Config): Promise<{ success: boolean; message: string }> {
    try {
      // Validate configuration first
      const validation = validateS3Config(config);
      if (!validation.valid) {
        return {
          success: false,
          message: `Configuration validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Create S3 client with provided credentials
      const s3Client = new S3Client({
        region: config.region,
        endpoint: config.endpoint,
        forcePathStyle: config.forcePathStyle || false,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      });

      // Test 1: Check if bucket exists and is accessible
      try {
        await s3Client.send(new HeadBucketCommand({ Bucket: config.bucket }));
      } catch (error: any) {
        if (error.name === 'NotFound') {
          return {
            success: false,
            message: `Bucket '${config.bucket}' does not exist or is not accessible`
          };
        }
        if (error.name === 'Forbidden') {
          return {
            success: false,
            message: `Access denied to bucket '${config.bucket}'. Check your credentials and permissions.`
          };
        }
        throw error; // Re-throw other errors
      }

      // Test 2: Try to upload a test file
      const testKey = `drivn-test-${Date.now()}.txt`;
      const testContent = 'DRIVN connection test - safe to delete';
      
      try {
        await s3Client.send(new PutObjectCommand({
          Bucket: config.bucket,
          Key: testKey,
          Body: testContent,
          ContentType: 'text/plain',
        }));

        // Test 3: Clean up test file
        await s3Client.send(new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: testKey,
        }));

        console.log('S3 connection test successful:', sanitizeS3ConfigForLogging(config));
        
        return {
          success: true,
          message: 'S3 connection test successful! Your credentials are valid and you have read/write access to the bucket.'
        };
      } catch (error: any) {
        if (error.name === 'AccessDenied') {
          return {
            success: false,
            message: 'Bucket is accessible but you do not have write permissions. Please check your IAM policy.'
          };
        }
        throw error;
      }
    } catch (error: any) {
      console.error('S3 connection test failed:', error.message, sanitizeS3ConfigForLogging(config));
      
      // Handle common AWS SDK errors
      if (error.name === 'CredentialsError' || error.name === 'InvalidAccessKeyId') {
        return {
          success: false,
          message: 'Invalid access key ID or secret access key'
        };
      }
      
      if (error.name === 'SignatureDoesNotMatch') {
        return {
          success: false,
          message: 'Invalid secret access key'
        };
      }
      
      if (error.name === 'NetworkingError' || error.code === 'ENOTFOUND') {
        return {
          success: false,
          message: 'Network error: Could not connect to S3 endpoint. Check your endpoint URL and internet connection.'
        };
      }
      
      return {
        success: false,
        message: `Connection test failed: ${error.message || 'Unknown error occurred'}`
      };
    }
  }

  /**
   * Save S3 configuration for a user
   * @param userId - User ID
   * @param config - S3 configuration to save
   * @returns Save result
   */
  static async saveS3Config(userId: string, config: S3Config): Promise<{ success: boolean; message: string }> {
    try {
      await connectDB();

      // Validate configuration
      const validation = validateS3Config(config);
      if (!validation.valid) {
        return {
          success: false,
          message: `Configuration validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Test connection before saving
      const testResult = await this.testS3Connection(config);
      if (!testResult.success) {
        return testResult;
      }

      // Encrypt the configuration
      const encryptedConfig = encryptS3Config(config, userId);

      // Update user's S3 configuration
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      user.s3Config = {
        accessKeyId: encryptedConfig, // Store entire encrypted config in accessKeyId field
        secretAccessKey: '', // Clear other fields for security
        region: '',
        bucket: '',
        endpoint: '',
      };

      await user.save();

      console.log('S3 configuration saved for user:', userId, sanitizeS3ConfigForLogging(config));

      return {
        success: true,
        message: 'S3 configuration saved successfully'
      };
    } catch (error: any) {
      console.error('Error saving S3 configuration:', error);
      return {
        success: false,
        message: 'Failed to save S3 configuration'
      };
    }
  }

  /**
   * Get S3 configuration for a user
   * @param userId - User ID
   * @returns S3 configuration or null if not found
   */
  static async getS3Config(userId: string): Promise<S3Config | null> {
    try {
      await connectDB();

      const user = await User.findById(userId);
      if (!user || !user.s3Config?.accessKeyId) {
        return null;
      }

      // Decrypt the configuration
      const decryptedConfig = decryptS3Config(user.s3Config.accessKeyId, userId);
      return decryptedConfig;
    } catch (error: any) {
      console.error('Error retrieving S3 configuration:', error);
      return null;
    }
  }

  /**
   * Delete S3 configuration for a user
   * @param userId - User ID
   * @returns Delete result
   */
  static async deleteS3Config(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      await connectDB();

      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Clear S3 configuration
      user.s3Config = undefined;
      await user.save();

      console.log('S3 configuration deleted for user:', userId);

      return {
        success: true,
        message: 'S3 configuration deleted successfully'
      };
    } catch (error: any) {
      console.error('Error deleting S3 configuration:', error);
      return {
        success: false,
        message: 'Failed to delete S3 configuration'
      };
    }
  }

  /**
   * Check if user has S3 configuration
   * @param userId - User ID
   * @returns Boolean indicating if user has S3 config
   */
  static async hasS3Config(userId: string): Promise<boolean> {
    try {
      await connectDB();
      const user = await User.findById(userId);
      return !!(user?.s3Config?.accessKeyId);
    } catch (error) {
      console.error('Error checking S3 configuration:', error);
      return false;
    }
  }
}
