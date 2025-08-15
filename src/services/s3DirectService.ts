// S3 Direct Service - Main orchestrator for S3 operations
// This service coordinates between different S3 operation modules

import { S3FileOperations } from './s3FileOperations';
import { S3FolderOperations } from './s3FolderOperations';
import { S3ListingOperations } from './s3ListingOperations';
import { s3Cache } from '../utils/s3Cache';
import { S3ConfigService } from './s3ConfigService';

// Re-export types for convenience
export type { S3FileItem, UploadResult, DeleteResult } from './s3FileOperations';
export type { FolderResult, DeleteFolderResult } from './s3FolderOperations';
export type { ListResult, SearchResult } from './s3ListingOperations';

/**
 * Main S3 Direct Service
 * Provides a unified interface for all S3 operations
 */
export class S3DirectService {
  static uploadFile = S3FileOperations.uploadFile;
  static deleteFile = S3FileOperations.deleteFile;
  static renameFile = S3FileOperations.renameFile;
  static getDownloadUrl = S3FileOperations.getDownloadUrl;

  static createFolder = S3FolderOperations.createFolder;
  static deleteFolder = S3FolderOperations.deleteFolder;
  static renameFolder = S3FolderOperations.renameFolder;

  static listFiles = S3ListingOperations.listFiles;
  static searchFiles = S3ListingOperations.searchFiles;

  static clearCache = () => s3Cache.clear();
  static invalidateCache = (pattern: string) => s3Cache.invalidate(pattern);
  static forceClearUserCache = (userId: string) => s3Cache.invalidate(userId);
  static getCacheSize = () => s3Cache.size();
  static getCacheKeys = () => s3Cache.keys();

  static listItems = S3ListingOperations.listFiles;

  static async getStorageStats(userId: string) {
    try {
      const s3Config = await S3ConfigService.getS3Config(userId);
      if (!s3Config || !s3Config.accessKeyId) {
        return {
          success: true,
          data: {
            totalFiles: 0,
            totalFolders: 0,
            totalSize: 0,
            fileTypeStats: {},
          },
          message: 'No S3 configuration found',
        };
      }

      const allFiles = await S3ListingOperations.listAllFiles(userId);

      const fileTypeStats: Record<string, { count: number; size: number }> = {};
      let totalSize = 0;
      let totalFiles = 0;

      const processItems = (items: Array<{ isFolder: boolean; size: number; name: string }>) => {
        for (const item of items) {
          if (!item.isFolder) {
            totalFiles++;
            totalSize += item.size;

            const extension = item.name.split('.').pop()?.toLowerCase() || 'unknown';
            if (!fileTypeStats[extension]) {
              fileTypeStats[extension] = { count: 0, size: 0 };
            }
            fileTypeStats[extension].count++;
            fileTypeStats[extension].size += item.size;
          }
        }
      };

      processItems(allFiles);

      const rootListing = await S3ListingOperations.listFiles(userId, '/');
      const totalFolders = rootListing.success ? rootListing.folders.length : 0;

      return {
        success: true,
        data: {
          totalFiles,
          totalFolders,
          totalSize,
          fileTypeStats,
        },
        message: 'Storage stats retrieved successfully',
      };
    } catch (error) {
      console.error('Get storage stats error:', error);
      return {
        success: false,
        message: 'Failed to get storage stats',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async testS3Connection(userId: string) {
    try {
      const result = await S3ListingOperations.listFiles(userId, '/', { maxKeys: 1 });
      return {
        success: result.success,
        message: result.success ? 'S3 connection successful' : result.message || result.error,
      };
    } catch (error) {
      console.error('Test S3 connection error:', error);
      return {
        success: false,
        message: 'Failed to test S3 connection',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}