import {
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getS3Client, getS3BucketName } from '../utils/s3ClientFactory';
import { s3Cache } from '../utils/s3Cache';
import ActivityLog, { IActivityLogModel } from '../models/ActivityLog';
import FileMetadata, { IFileMetadataModel } from '../models/FileMetadata';

export interface S3FolderItem {
  key: string;
  name: string;
  path: string;
  isFolder: boolean;
  size?: number;
  lastModified?: Date;
}

export interface FolderResult {
  success: boolean;
  message: string;
  folder?: S3FolderItem;
  error?: string;
}

export interface DeleteFolderResult {
  success: boolean;
  message: string;
  deletedCount?: number;
  error?: string;
}

export class S3FolderOperations {
  /**
   * Create a folder in S3 (folder marker)
   */
  static async createFolder(
    userId: string,
    folderName: string,
    currentPath: string = '/'
  ): Promise<FolderResult> {
    try {
      const s3Client = await getS3Client(userId);
      const bucketName = await getS3BucketName(userId);

      if (!s3Client || !bucketName) {
        return {
          success: false,
          message: 'S3 configuration not found. Please configure your storage settings.',
          error: 'S3_CONFIG_MISSING',
        };
      }

      // Sanitize folder name
      const sanitizedFolderName = folderName.trim().replace(/[/\\]/g, '_');
      if (!sanitizedFolderName) {
        return {
          success: false,
          message: 'Folder name cannot be empty',
          error: 'INVALID_NAME',
        };
      }

      // Create folder path
      const sanitizedPath = currentPath.replace(/\/+/g, '/').replace(/\/$/, '');
      const folderKey = `${userId}${sanitizedPath}/${sanitizedFolderName}/`;

      // Check if folder already exists
      try {
        const listCommand = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: folderKey,
          MaxKeys: 1,
        });
        const existingObjects = await s3Client.send(listCommand);
        
        if (existingObjects.Contents && existingObjects.Contents.length > 0) {
          return {
            success: false,
            message: 'A folder with this name already exists',
            error: 'FOLDER_EXISTS',
          };
        }
      } catch (error) {
        console.warn('Could not check for existing folder:', error);
      }

      // Create folder marker
      const putCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: folderKey,
        Body: '',
        ContentType: 'application/x-directory',
        Metadata: {
          'folder-name': sanitizedFolderName,
          'user-id': userId,
          'created-at': new Date().toISOString(),
        },
      });

      await s3Client.send(putCommand);

      // Log activity
      await (ActivityLog as unknown as IActivityLogModel).logActivity(userId, 'create_folder', sanitizedFolderName, {
        filePath: `${sanitizedPath}/${sanitizedFolderName}`,
        s3Key: folderKey,
      });

      // Invalidate cache
      s3Cache.invalidate(userId);

      const folder: S3FolderItem = {
        key: folderKey,
        name: sanitizedFolderName,
        path: `${sanitizedPath}/${sanitizedFolderName}`,
        isFolder: true,
      };

      return {
        success: true,
        message: 'Folder created successfully',
        folder,
      };
    } catch (error) {
      console.error('Create folder error:', error);
      return {
        success: false,
        message: 'Failed to create folder',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete a folder and all its contents from S3
   */
  static async deleteFolder(userId: string, folderPath: string): Promise<DeleteFolderResult> {
    try {
      const s3Client = await getS3Client(userId);
      const bucketName = await getS3BucketName(userId);

      if (!s3Client || !bucketName) {
        return {
          success: false,
          message: 'S3 configuration not found',
          error: 'S3_CONFIG_MISSING',
        };
      }

      // Ensure folder path ends with /
      const folderPrefix = `${userId}${folderPath}${folderPath.endsWith('/') ? '' : '/'}`;

      // List all objects in the folder
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: folderPrefix,
      });

      const objects = await s3Client.send(listCommand);
      
      if (!objects.Contents || objects.Contents.length === 0) {
        return {
          success: false,
          message: 'Folder not found or already empty',
          error: 'FOLDER_NOT_FOUND',
        };
      }

      // Prepare objects for deletion
      const objectsToDelete = objects.Contents.map(obj => ({ Key: obj.Key! }));

      // Delete all objects in batches (S3 allows max 1000 objects per delete request)
      const batchSize = 1000;
      let totalDeleted = 0;

      for (let i = 0; i < objectsToDelete.length; i += batchSize) {
        const batch = objectsToDelete.slice(i, i + batchSize);
        
        const deleteCommand = new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: batch,
            Quiet: true,
          },
        });

        const deleteResult = await s3Client.send(deleteCommand);
        totalDeleted += batch.length - (deleteResult.Errors?.length || 0);

        if (deleteResult.Errors && deleteResult.Errors.length > 0) {
          console.warn('Some objects failed to delete:', deleteResult.Errors);
        }
      }

      // Log activity
      const folderName = folderPath.split('/').filter(Boolean).pop() || 'folder';
      await (ActivityLog as unknown as IActivityLogModel).logActivity(userId, 'delete_folder', folderName, {
        filePath: folderPath,
        s3Key: folderPrefix,
      });

      // Remove metadata for all files in the folder
      await (FileMetadata as unknown as IFileMetadataModel).deleteMany({
        userId,
        s3Key: { $regex: `^${folderPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` }
      });

      // Invalidate cache
      s3Cache.invalidate(userId);

      return {
        success: true,
        message: `Folder and ${totalDeleted} item(s) deleted successfully`,
        deletedCount: totalDeleted,
      };
    } catch (error) {
      console.error('Delete folder error:', error);
      return {
        success: false,
        message: 'Failed to delete folder',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Rename a folder in S3
   */
  static async renameFolder(
    userId: string,
    oldFolderPath: string,
    newFolderName: string
  ): Promise<FolderResult> {
    try {
      const s3Client = await getS3Client(userId);
      const bucketName = await getS3BucketName(userId);

      if (!s3Client || !bucketName) {
        return {
          success: false,
          message: 'S3 configuration not found',
          error: 'S3_CONFIG_MISSING',
        };
      }

      // Sanitize new folder name
      const sanitizedNewName = newFolderName.trim().replace(/[/\\]/g, '_');
      if (!sanitizedNewName) {
        return {
          success: false,
          message: 'Folder name cannot be empty',
          error: 'INVALID_NAME',
        };
      }

      // This is a complex operation that would require copying all objects
      // For now, we'll return an error suggesting manual recreation
      // Note: newFolderPath calculation removed as it's not implemented
      return {
        success: false,
        message: 'Folder renaming is not supported. Please create a new folder and move files manually.',
        error: 'OPERATION_NOT_SUPPORTED',
      };
    } catch (error) {
      console.error('Rename folder error:', error);
      return {
        success: false,
        message: 'Failed to rename folder',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
