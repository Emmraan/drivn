import { S3Client, ListObjectsV2Command, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import connectDB from '@/utils/database';
import File from '@/models/File';
import Folder from '@/models/Folder';
import { createS3Client, getS3BucketName, isUsingDrivnS3 } from '@/utils/s3ClientFactory';
import { Types } from 'mongoose';

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
   * Import files from S3 that exist but are not in database
   * This handles files uploaded directly to S3
   */
  static async importOrphanedS3Files(userId: string): Promise<{ success: boolean; message: string; stats?: any }> {
    try {
      await connectDB();

      const s3Client = await createS3Client(userId);
      const bucketName = await getS3BucketName(userId);
      const isUsingDrivn = await isUsingDrivnS3(userId);

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
      const s3Contents = s3Objects.Contents || [];

      // Get all existing file keys from database
      const dbFiles = await File.find({ userId }).select('s3Key');
      const dbKeys = new Set(dbFiles.map(file => file.s3Key));

      let importedFiles = 0;
      let createdFolders = 0;
      const errors: string[] = [];

      // Process each S3 object
      for (const s3Object of s3Contents) {
        if (!s3Object.Key || dbKeys.has(s3Object.Key)) {
          continue; // Skip if already in database
        }

        try {
          // Skip folder markers (keys ending with /)
          if (s3Object.Key.endsWith('/')) {
            continue;
          }

          // Parse the S3 key to extract file information
          const keyParts = s3Object.Key.split('/');
          const fileName = keyParts[keyParts.length - 1];

          // Skip if no filename
          if (!fileName) continue;

          // Create folder structure if needed
          let folderId: string | null = null;
          if (keyParts.length > 2) { // More than just userId/filename
            const folderPath = keyParts.slice(1, -1); // Remove userId and filename
            folderId = await this.ensureFolderStructure(userId, folderPath);
            if (folderId) createdFolders++;
          }

          // Get file metadata from S3
          const headCommand = new HeadObjectCommand({
            Bucket: bucketName,
            Key: s3Object.Key,
          });
          const headResult = await s3Client.send(headCommand);

          // Extract original filename from metadata or use current name
          const originalName = headResult.Metadata?.['original-name'] || fileName;
          const mimeType = headResult.ContentType || 'application/octet-stream';

          // Create file record in database
          const file = new File({
            name: fileName,
            originalName: originalName,
            size: s3Object.Size || 0,
            mimeType: mimeType,
            s3Key: s3Object.Key,
            s3Bucket: bucketName,
            bucketType: isUsingDrivn ? 'drivn' : 'user',
            userId: new Types.ObjectId(userId),
            folderId: folderId ? new Types.ObjectId(folderId) : null,
            path: this.buildFilePath(keyParts.slice(1)), // Remove userId from path
            isPublic: false,
            downloadCount: 0,
          });

          await file.save();
          importedFiles++;

          // Update folder file count if file is in a folder
          if (folderId) {
            await Folder.findByIdAndUpdate(folderId, {
              $inc: { fileCount: 1, totalSize: s3Object.Size || 0 },
            });
          }

        } catch (error: any) {
          errors.push(`Error importing ${s3Object.Key}: ${error.message}`);
        }
      }

      return {
        success: true,
        message: `Import completed. Added ${importedFiles} files and ${createdFolders} folders.`,
        stats: {
          importedFiles,
          createdFolders,
          errors: errors.length,
          errorDetails: errors,
        },
      };
    } catch (error) {
      console.error('Import error:', error);
      return {
        success: false,
        message: 'Failed to import files from S3',
      };
    }
  }

  /**
   * Ensure folder structure exists in database for given path
   */
  private static async ensureFolderStructure(userId: string, folderPath: string[]): Promise<string | null> {
    try {
      let currentParentId: string | null = null;
      let currentPath = '';

      for (const folderName of folderPath) {
        currentPath += `/${folderName}`;

        // Check if folder already exists
        let folder = await Folder.findOne({
          userId: new Types.ObjectId(userId),
          parentId: currentParentId ? new Types.ObjectId(currentParentId) : null,
          name: folderName,
        });

        if (!folder) {
          // Create the folder
          folder = new Folder({
            name: folderName,
            userId: new Types.ObjectId(userId),
            parentId: currentParentId ? new Types.ObjectId(currentParentId) : null,
            path: currentPath,
            isPublic: false,
            fileCount: 0,
            folderCount: 0,
            totalSize: 0,
          });

          await folder.save();

          // Update parent folder count
          if (currentParentId) {
            await Folder.findByIdAndUpdate(currentParentId, {
              $inc: { folderCount: 1 },
            });
          }
        }

        currentParentId = folder._id.toString();
      }

      return currentParentId;
    } catch (error) {
      console.error('Error ensuring folder structure:', error);
      return null;
    }
  }

  /**
   * Build file path from S3 key parts
   */
  private static buildFilePath(pathParts: string[]): string {
    return '/' + pathParts.join('/');
  }

  /**
   * Create folder markers in S3 for database folders that don't exist in S3
   */
  static async syncFoldersToS3(userId: string): Promise<{ success: boolean; message: string; stats?: any }> {
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

      // Get all folders from database
      const dbFolders = await Folder.find({ userId }).sort({ path: 1 });

      let createdMarkers = 0;
      const errors: string[] = [];

      for (const folder of dbFolders) {
        try {
          // Create S3 folder marker (empty object with trailing slash)
          const folderKey = `${userId}${folder.path}/`;

          // Check if folder marker already exists
          try {
            await s3Client.send(new HeadObjectCommand({
              Bucket: bucketName,
              Key: folderKey,
            }));
            // Folder marker exists, skip
            continue;
          } catch (error: any) {
            if (error.name !== 'NotFound' && error.$metadata?.httpStatusCode !== 404) {
              throw error; // Re-throw non-404 errors
            }
            // Folder marker doesn't exist, create it
          }

          // Create folder marker in S3
          await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: folderKey,
            Body: '',
            ContentType: 'application/x-directory',
            Metadata: {
              'folder-name': folder.name,
              'user-id': userId,
              'created-at': folder.createdAt.toISOString(),
            },
          }));

          createdMarkers++;
        } catch (error: any) {
          errors.push(`Error creating folder marker for ${folder.path}: ${error.message}`);
        }
      }

      return {
        success: true,
        message: `Folder sync completed. Created ${createdMarkers} folder markers in S3.`,
        stats: {
          createdMarkers,
          errors: errors.length,
          errorDetails: errors,
        },
      };
    } catch (error) {
      console.error('Folder sync error:', error);
      return {
        success: false,
        message: 'Failed to sync folders to S3',
      };
    }
  }

  /**
   * Perform comprehensive bidirectional sync
   */
  static async performFullSync(userId: string): Promise<{ success: boolean; message: string; report: any }> {
    try {
      const [
        dbSyncResult,
        importResult,
        folderSyncResult,
        orphanedResult
      ] = await Promise.all([
        this.syncUserFiles(userId),
        this.importOrphanedS3Files(userId),
        this.syncFoldersToS3(userId),
        this.findOrphanedS3Files(userId),
      ]);

      const report = {
        databaseSync: dbSyncResult,
        s3Import: importResult,
        folderSync: folderSyncResult,
        orphanedFiles: orphanedResult,
        timestamp: new Date().toISOString(),
      };

      const totalErrors = (dbSyncResult.stats?.errors || 0) +
                         (importResult.stats?.errors || 0) +
                         (folderSyncResult.stats?.errors || 0);

      return {
        success: totalErrors === 0,
        message: `Full sync completed. ${totalErrors > 0 ? `${totalErrors} errors occurred.` : 'All operations successful.'}`,
        report,
      };
    } catch (error) {
      console.error('Full sync error:', error);
      return {
        success: false,
        message: 'Failed to perform full sync',
        report: null,
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
