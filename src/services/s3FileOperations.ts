import {
  PutObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client, getS3BucketName } from '../utils/s3ClientFactory';
import { s3Cache } from '../utils/s3Cache';
import ActivityLog, { IActivityLogModel } from '../models/ActivityLog';
import FileMetadata, { IFileMetadataModel } from '../models/FileMetadata';

export interface S3FileItem {
  key: string;
  name: string;
  size: number;
  lastModified: Date;
  mimeType?: string;
  isFolder: boolean;
  path: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  success: boolean;
  message: string;
  file?: S3FileItem;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  message: string;
  deletedCount?: number;
  error?: string;
}

export class S3FileOperations {
  /**
   * Upload a file to S3
   */
  static async uploadFile(
    userId: string,
    file: File,
    currentPath: string = '/'
  ): Promise<UploadResult> {
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

      // Generate unique S3 key
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const sanitizedPath = currentPath.replace(/\/+/g, '/').replace(/\/$/, '');
      const s3Key = `${userId}${sanitizedPath}/${timestamp}-${randomSuffix}-${file.name}`;

      // Convert File to ArrayBuffer then to Uint8Array
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const uploadCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: uint8Array,
        ContentType: file.type || 'application/octet-stream',
        Metadata: {
          'original-name': file.name.replace(/[^\w\-_.]/g, '_'),
          'user-id': userId,
          'uploaded-at': new Date().toISOString(),
          'file-size': file.size.toString(),
        },
      });

      await s3Client.send(uploadCommand);

      // Log activity
      await (ActivityLog as unknown as IActivityLogModel).logActivity(userId, 'upload', file.name, {
        filePath: `${sanitizedPath}/${file.name}`,
        fileSize: file.size,
        mimeType: file.type,
        s3Key,
      });

      // Update file metadata for search indexing
      await (FileMetadata as unknown as IFileMetadataModel).syncFromS3Object(userId, {
        Key: s3Key,
        Size: file.size,
        LastModified: new Date(),
        ContentType: file.type,
      });

      // Invalidate cache
      s3Cache.invalidate(userId);

      const uploadedFile: S3FileItem = {
        key: s3Key,
        name: file.name,
        size: file.size,
        lastModified: new Date(),
        mimeType: file.type,
        isFolder: false,
        path: `${sanitizedPath}/${file.name}`,
        metadata: {
          'original-name': file.name,
          'user-id': userId,
          'uploaded-at': new Date().toISOString(),
        },
      };

      return {
        success: true,
        message: 'File uploaded successfully',
        file: uploadedFile,
      };
    } catch (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        message: 'Failed to upload file',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete a file from S3
   */
  static async deleteFile(userId: string, s3Key: string): Promise<DeleteResult> {
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

      // Get file info before deletion for logging
      let fileName = s3Key.split('/').pop() || s3Key;
      let fileSize = 0;
      try {
        const headCommand = new HeadObjectCommand({
          Bucket: bucketName,
          Key: s3Key,
        });
        const headResult = await s3Client.send(headCommand);
        fileSize = headResult.ContentLength || 0;
        fileName = headResult.Metadata?.['original-name'] || fileName;
      } catch (error) {
        console.warn('Could not get file metadata before deletion:', error);
      }

      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      });

      await s3Client.send(deleteCommand);

      // Log activity
      await (ActivityLog as unknown as IActivityLogModel).logActivity(userId, 'delete', fileName, {
        fileSize,
        s3Key,
      });

      // Remove from metadata
      await FileMetadata.findOneAndDelete({ s3Key });

      // Invalidate cache
      s3Cache.invalidate(userId);

      return {
        success: true,
        message: 'File deleted successfully',
        deletedCount: 1,
      };
    } catch (error) {
      console.error('Delete error:', error);
      return {
        success: false,
        message: 'Failed to delete file',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Rename a file in S3
   */
  static async renameFile(
    userId: string,
    s3Key: string,
    newName: string
  ): Promise<UploadResult> {
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

      // Generate new S3 key with new name
      const keyParts = s3Key.split('/');
      keyParts[keyParts.length - 1] = newName;
      const newS3Key = keyParts.join('/');

      // Copy to new key
      const copyCommand = new CopyObjectCommand({
        Bucket: bucketName,
        CopySource: `${bucketName}/${s3Key}`,
        Key: newS3Key,
        MetadataDirective: 'REPLACE',
        Metadata: {
          'original-name': newName.replace(/[^\w\-_.]/g, '_'),
          'user-id': userId,
          'renamed-at': new Date().toISOString(),
        },
      });

      await s3Client.send(copyCommand);

      // Delete old file
      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      });

      await s3Client.send(deleteCommand);

      // Log activity
      await (ActivityLog as unknown as IActivityLogModel).logActivity(userId, 'rename', newName, {
        s3Key: newS3Key,
      });

      // Update metadata
      await FileMetadata.findOneAndUpdate(
        { s3Key },
        { s3Key: newS3Key, fileName: newName },
        { upsert: true }
      );

      // Invalidate cache
      s3Cache.invalidate(userId);

      return {
        success: true,
        message: 'File renamed successfully',
      };
    } catch (error) {
      console.error('Rename error:', error);
      return {
        success: false,
        message: 'Failed to rename file',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get download URL for a file
   */
  static async getDownloadUrl(userId: string, s3Key: string): Promise<{
    success: boolean;
    url?: string;
    message: string;
  }> {
    try {
      const s3Client = await getS3Client(userId);
      const bucketName = await getS3BucketName(userId);

      if (!s3Client || !bucketName) {
        return {
          success: false,
          message: 'S3 configuration not found',
        };
      }

      const fileName = s3Key.split('/').pop() || 'download';
      
      const getObjectCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        ResponseContentDisposition: `attachment; filename="${fileName}"`,
      });

      const signedUrl = await getSignedUrl(s3Client, getObjectCommand, { 
        expiresIn: 3600 // 1 hour
      });

      // Log download activity
      await (ActivityLog as unknown as IActivityLogModel).logActivity(userId, 'download', fileName, {
        s3Key,
      });

      return {
        success: true,
        url: signedUrl,
        message: 'Download URL generated successfully',
      };
    } catch (error) {
      console.error('Download URL error:', error);
      return {
        success: false,
        message: 'Failed to generate download URL',
      };
    }
  }
}
