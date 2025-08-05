import { S3Client } from '@aws-sdk/client-s3';
import { S3Config } from '@/utils/encryption';

/**
 * Service for managing DRIVN's default S3 bucket configuration
 * This service provides access to the admin-managed S3 bucket that users can be granted access to
 */
export class DrivnS3Service {
  private static instance: DrivnS3Service;
  private s3Client: S3Client | null = null;
  private config: S3Config | null = null;

  private constructor() {
    this.initializeConfig();
  }

  public static getInstance(): DrivnS3Service {
    if (!DrivnS3Service.instance) {
      DrivnS3Service.instance = new DrivnS3Service();
    }
    return DrivnS3Service.instance;
  }

  /**
   * Initialize DRIVN S3 configuration from environment variables
   */
  private initializeConfig(): void {
    const accessKeyId = process.env.DRIVN_S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.DRIVN_S3_SECRET_ACCESS_KEY;
    const region = process.env.DRIVN_S3_REGION;
    const bucket = process.env.DRIVN_S3_BUCKET;
    const endpoint = process.env.DRIVN_S3_ENDPOINT;
    const forcePathStyle = process.env.DRIVN_S3_FORCE_PATH_STYLE === 'true';

    if (!accessKeyId || !secretAccessKey || !region || !bucket) {
      console.warn('DRIVN S3 configuration incomplete. Admin-managed storage will not be available.');
      return;
    }

    this.config = {
      accessKeyId,
      secretAccessKey,
      region,
      bucket,
      endpoint,
      forcePathStyle,
    };

    console.log('✅ DRIVN S3 configuration initialized');
  }

  /**
   * Get DRIVN S3 configuration
   * @returns S3Config or null if not configured
   */
  public getConfig(): S3Config | null {
    return this.config;
  }

  /**
   * Get or create DRIVN S3 client
   * @returns S3Client or null if not configured
   */
  public getClient(): S3Client | null {
    if (!this.config) {
      return null;
    }

    if (!this.s3Client) {
      this.s3Client = new S3Client({
        region: this.config.region,
        credentials: {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        },
        endpoint: this.config.endpoint,
        forcePathStyle: this.config.forcePathStyle,
      });
    }

    return this.s3Client;
  }

  /**
   * Check if DRIVN S3 is configured and available
   * @returns boolean
   */
  public isAvailable(): boolean {
    return this.config !== null;
  }

  /**
   * Get bucket name for DRIVN S3
   * @returns string or null if not configured
   */
  public getBucketName(): string | null {
    return this.config?.bucket || null;
  }

  /**
   * Get sanitized config for logging (without credentials)
   * @returns Partial config for logging
   */
  public getSanitizedConfig(): Partial<S3Config> | null {
    if (!this.config) {
      return null;
    }

    return {
      region: this.config.region,
      bucket: this.config.bucket,
      endpoint: this.config.endpoint,
      forcePathStyle: this.config.forcePathStyle,
    };
  }
}

// Export singleton instance
export const drivnS3Service = DrivnS3Service.getInstance();
