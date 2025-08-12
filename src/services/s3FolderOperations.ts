import {
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
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

      // Calculate the old and new folder prefixes
      const oldFolderPrefix = `${userId}${oldFolderPath}${oldFolderPath.endsWith('/') ? '' : '/'}`;

      // Calculate the new folder path by replacing the last segment
      const pathParts = oldFolderPath.split('/').filter(Boolean);
      pathParts[pathParts.length - 1] = sanitizedNewName;
      const newFolderPath = '/' + pathParts.join('/');
      const newFolderPrefix = `${userId}${newFolderPath}/`;

      // List all objects in the old folder
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: oldFolderPrefix,
      });

      const objects = await s3Client.send(listCommand);

      if (!objects.Contents || objects.Contents.length === 0) {
        return {
          success: false,
          message: 'Folder not found or is empty',
          error: 'FOLDER_NOT_FOUND',
        };
      }

      // Copy all objects to new locations
      const copyPromises = objects.Contents.map(async (obj) => {
        if (!obj.Key) return;

        // Calculate new key by replacing the old prefix with new prefix
        const newKey = obj.Key.replace(oldFolderPrefix, newFolderPrefix);

        const copyCommand = new CopyObjectCommand({
          Bucket: bucketName,
          CopySource: `${bucketName}/${obj.Key}`,
          Key: newKey,
          MetadataDirective: 'REPLACE',
          Metadata: {
            'user-id': userId,
            'renamed-at': new Date().toISOString(),
          },
        });

        await s3Client.send(copyCommand);
        return { oldKey: obj.Key, newKey };
      });

      const copyResults = await Promise.all(copyPromises);
      const successfulCopies = copyResults.filter(Boolean);

      // Delete old objects
      if (successfulCopies.length > 0) {
        const objectsToDelete = successfulCopies.map(result => ({ Key: result!.oldKey }));

        // Delete in batches
        const batchSize = 1000;
        for (let i = 0; i < objectsToDelete.length; i += batchSize) {
          const batch = objectsToDelete.slice(i, i + batchSize);

          const deleteCommand = new DeleteObjectsCommand({
            Bucket: bucketName,
            Delete: {
              Objects: batch,
              Quiet: true,
            },
          });

          await s3Client.send(deleteCommand);
        }
      }

      // Log activity
      await (ActivityLog as unknown as IActivityLogModel).logActivity(userId, 'rename_folder', sanitizedNewName, {
        filePath: newFolderPath,
        s3Key: newFolderPrefix,
        metadata: {
          oldPath: oldFolderPath,
          newPath: newFolderPath,
          filesRenamed: successfulCopies.length,
        },
      });

      // Update metadata for all files in the folder
      for (const result of successfulCopies) {
        if (result) {
          await FileMetadata.findOneAndUpdate(
            { s3Key: result.oldKey },
            { s3Key: result.newKey },
            { upsert: false }
          );
        }
      }

      // Invalidate cache
      s3Cache.invalidate(userId);

      const renamedFolder: S3FolderItem = {
        key: newFolderPrefix,
        name: sanitizedNewName,
        path: newFolderPath,
        isFolder: true,
      };

      return {
        success: true,
        message: `Folder renamed successfully. ${successfulCopies.length} items moved.`,
        folder: renamedFolder,
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
