import { S3Client, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import connectDB from '@/utils/database';
import File from '@/models/File';
import { createS3Client, getS3BucketName } from '@/utils/s3ClientFactory';

export class SyncService {
  /**
   * Sync database with S3 bucket for a specific user
   * This will remove database entries for files that no longer exist in S3
   */
  static async syncUserFiles(userId: string): Promise<{ success: boolean; message: string; stats?: any }> {
    try {
      await connectDB();

      // Get S3 client and bucket for user
      const s3Client = await createS3Client(userId);
      const bucketName = await getS3BucketName(userId);

      if (!s3Client || !bucketName) {
        return {
          success: false,
          message: 'S3 configuration not found for user',
        };
      }

      // Get all files from database for this user
      const dbFiles = await File.find({ userId });
      
      let removedFiles = 0;
      let verifiedFiles = 0;
      const errors: string[] = [];

      // Check each database file against S3
      for (const dbFile of dbFiles) {
        try {
          // Check if file exists in S3
          const headCommand = new HeadObjectCommand({
            Bucket: bucketName,
            Key: dbFile.s3Key,
          });

          await s3Client.send(headCommand);
          verifiedFiles++;
        } catch (error: any) {
          if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
            // File doesn't exist in S3, remove from database
            await File.findByIdAndDelete(dbFile._id);
            removedFiles++;
            console.log(`Removed orphaned file from DB: ${dbFile.name} (${dbFile.s3Key})`);
          } else {
            errors.push(`Error checking file ${dbFile.name}: ${error.message}`);
          }
        }
      }

      return {
        success: true,
        message: `Sync completed. Verified ${verifiedFiles} files, removed ${removedFiles} orphaned entries.`,
        stats: {
          verifiedFiles,
          removedFiles,
          errors: errors.length,
          errorDetails: errors,
        },
      };
    } catch (error) {
      console.error('Sync error:', error);
      return {
        success: false,
        message: 'Failed to sync files',
      };
    }
  }

  /**
   * Get files that exist in S3 but not in database
   * This can help identify files that were uploaded directly to S3
   */
  static async findOrphanedS3Files(userId: string): Promise<{ success: boolean; orphanedFiles?: string[]; message: string }> {
    try {
      await connectDB();

      const s3Client = await createS3Client(userId);
      const bucketName = await getS3BucketName(userId);

      if (!s3Client || !bucketName) {
        return {
          success: false,
          message: 'S3 configuration not found for user',
        };
      }

      // List all objects in S3 with user prefix
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: `${userId}/`,
      });

      const s3Objects = await s3Client.send(listCommand);
      const s3Keys = s3Objects.Contents?.map(obj => obj.Key).filter(Boolean) || [];

      // Get all file keys from database
      const dbFiles = await File.find({ userId }).select('s3Key');
      const dbKeys = dbFiles.map(file => file.s3Key);

      // Find keys that exist in S3 but not in database
      const orphanedKeys = s3Keys.filter(s3Key => !dbKeys.includes(s3Key));

      return {
        success: true,
        orphanedFiles: orphanedKeys,
        message: `Found ${orphanedKeys.length} files in S3 that are not in database`,
      };
    } catch (error) {
      console.error('Error finding orphaned S3 files:', error);
      return {
        success: false,
        message: 'Failed to check for orphaned S3 files',
      };
    }
  }

  /**
   * Perform a full consistency check
   */
  static async performConsistencyCheck(userId: string): Promise<{ success: boolean; report: any; message: string }> {
    try {
      const [syncResult, orphanedResult] = await Promise.all([
        this.syncUserFiles(userId),
        this.findOrphanedS3Files(userId),
      ]);

      const report = {
        dbSync: syncResult,
        orphanedS3Files: orphanedResult,
        timestamp: new Date().toISOString(),
      };

      return {
        success: true,
        report,
        message: 'Consistency check completed',
      };
    } catch (error) {
      console.error('Consistency check error:', error);
      return {
        success: false,
        report: null,
        message: 'Failed to perform consistency check',
      };
    }
  }
}
