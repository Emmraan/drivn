import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getS3Client, getS3BucketName } from '../utils/s3ClientFactory';
import { s3Cache } from '../utils/s3Cache';

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

export interface ListResult {
  success: boolean;
  files: S3FileItem[];
  folders: S3FileItem[];
  currentPath: string;
  breadcrumbs: Array<{ name: string; path: string }>;
  totalSize: number;
  totalFiles: number;
  totalFolders: number;
  message?: string;
  error?: string;
  hasMore?: boolean;
  nextToken?: string;
}

export interface SearchResult {
  success: boolean;
  files: S3FileItem[];
  totalResults: number;
  query: string;
  message?: string;
  error?: string;
}

export class S3ListingOperations {
  /**
   * List files and folders in a specific path
   */
  static async listFiles(
    userId: string,
    path: string = '/',
    options: {
      maxKeys?: number;
      continuationToken?: string;
      useCache?: boolean;
    } = {}
  ): Promise<ListResult> {
    try {
      const { maxKeys = 1000, continuationToken, useCache = true } = options;
      
      const s3Client = await getS3Client(userId);
      const bucketName = await getS3BucketName(userId);

      if (!s3Client || !bucketName) {
        return {
          success: false,
          files: [],
          folders: [],
          currentPath: path,
          breadcrumbs: [],
          totalSize: 0,
          totalFiles: 0,
          totalFolders: 0,
          message: 'S3 configuration not found. Please configure your storage settings.',
          error: 'S3_CONFIG_MISSING',
        };
      }

      // Normalize path
      const normalizedPath = path.replace(/\/+/g, '/').replace(/\/$/, '');
      const s3Prefix = `${userId}${normalizedPath === '/' ? '' : normalizedPath}/`;

      // Check cache first
      const cacheKey = `list:${userId}:${normalizedPath}:${maxKeys}:${continuationToken || ''}`;
      if (useCache) {
        const cached = s3Cache.get(cacheKey);
        if (cached) {
          return cached as ListResult;
        }
      }

      console.log('🔍 Listing S3 objects with prefix:', s3Prefix);

      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: s3Prefix,
        Delimiter: '/',
        MaxKeys: maxKeys,
        ContinuationToken: continuationToken,
      });

      const response = await s3Client.send(listCommand);

      // Process folders (common prefixes)
      const folders: S3FileItem[] = [];
      if (response.CommonPrefixes) {
        for (const prefix of response.CommonPrefixes) {
          if (prefix.Prefix) {
            const folderName = prefix.Prefix.replace(s3Prefix, '').replace('/', '');
            if (folderName) {
              folders.push({
                key: prefix.Prefix,
                name: folderName,
                size: 0,
                lastModified: new Date(),
                isFolder: true,
                path: `${normalizedPath === '/' || normalizedPath === '' ? '' : normalizedPath}/${folderName}`,
              });
            }
          }
        }
      }

      // Process files
      const files: S3FileItem[] = [];
      let totalSize = 0;

      if (response.Contents) {
        for (const object of response.Contents) {
          if (object.Key && !object.Key.endsWith('/')) {
            const fileName = object.Key.replace(s3Prefix, '');
            if (fileName) {
              const fileItem: S3FileItem = {
                key: object.Key,
                name: fileName,
                size: object.Size || 0,
                lastModified: object.LastModified || new Date(),
                isFolder: false,
                path: `${normalizedPath === '/' || normalizedPath === '' ? '' : normalizedPath}/${fileName}`,
              };

              // Try to determine MIME type from file extension
              const extension = fileName.split('.').pop()?.toLowerCase();
              if (extension) {
                fileItem.mimeType = S3ListingOperations.getMimeTypeFromExtension(extension);
              }

              files.push(fileItem);
              totalSize += object.Size || 0;
            }
          }
        }
      }

      // Generate breadcrumbs
      const breadcrumbs = S3ListingOperations.generateBreadcrumbs(normalizedPath);

      const result: ListResult = {
        success: true,
        files: files.sort((a, b) => a.name.localeCompare(b.name)),
        folders: folders.sort((a, b) => a.name.localeCompare(b.name)),
        currentPath: normalizedPath,
        breadcrumbs,
        totalSize,
        totalFiles: files.length,
        totalFolders: folders.length,
        hasMore: response.IsTruncated || false,
        nextToken: response.NextContinuationToken,
      };

      // Cache the result
      if (useCache) {
        s3Cache.set(cacheKey, result, 2 * 60 * 1000); // 2 minutes cache
      }

      console.log(`📁 Listed ${files.length} files and ${folders.length} folders`);
      return result;
    } catch (error) {
      console.error('List files error:', error);
      return {
        success: false,
        files: [],
        folders: [],
        currentPath: path,
        breadcrumbs: [],
        totalSize: 0,
        totalFiles: 0,
        totalFolders: 0,
        message: 'Failed to list files',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Search files by name
   */
  static async searchFiles(
    userId: string,
    query: string,
    options: {
      maxResults?: number;
      mimeTypeFilter?: string;
    } = {}
  ): Promise<SearchResult> {
    try {
      const { maxResults = 100, mimeTypeFilter } = options;
      
      const s3Client = await getS3Client(userId);
      const bucketName = await getS3BucketName(userId);

      if (!s3Client || !bucketName) {
        return {
          success: false,
          files: [],
          totalResults: 0,
          query,
          message: 'S3 configuration not found',
          error: 'S3_CONFIG_MISSING',
        };
      }

      // Check cache first
      const cacheKey = `search:${userId}:${query}:${mimeTypeFilter || ''}:${maxResults}`;
      const cached = s3Cache.get(cacheKey);
      if (cached) {
        return cached as SearchResult;
      }

      console.log('🔍 Searching S3 objects for query:', query);

      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: `${userId}/`,
        MaxKeys: 1000, // Get more objects to search through
      });

      const response = await s3Client.send(listCommand);
      const matchingFiles: S3FileItem[] = [];

      if (response.Contents) {
        const queryLower = query.toLowerCase();
        
        for (const object of response.Contents) {
          if (object.Key && !object.Key.endsWith('/')) {
            const fileName = object.Key.split('/').pop() || '';
            
            // Check if filename matches query
            if (fileName.toLowerCase().includes(queryLower)) {
              const extension = fileName.split('.').pop()?.toLowerCase();
              const mimeType = extension ? S3ListingOperations.getMimeTypeFromExtension(extension) : undefined;
              
              // Apply MIME type filter if specified
              if (mimeTypeFilter && mimeType && !mimeType.includes(mimeTypeFilter)) {
                continue;
              }

              const pathParts = object.Key.split('/');
              pathParts.shift(); // Remove userId
              pathParts.pop(); // Remove filename
              const filePath = '/' + pathParts.join('/');

              matchingFiles.push({
                key: object.Key,
                name: fileName,
                size: object.Size || 0,
                lastModified: object.LastModified || new Date(),
                mimeType,
                isFolder: false,
                path: filePath + '/' + fileName,
              });

              if (matchingFiles.length >= maxResults) {
                break;
              }
            }
          }
        }
      }

      const result: SearchResult = {
        success: true,
        files: matchingFiles.sort((a, b) => a.name.localeCompare(b.name)),
        totalResults: matchingFiles.length,
        query,
      };

      // Cache the result
      s3Cache.set(cacheKey, result, 1 * 60 * 1000); // 1 minute cache for search

      console.log(`🔍 Found ${matchingFiles.length} matching files`);
      return result;
    } catch (error) {
      console.error('Search files error:', error);
      return {
        success: false,
        files: [],
        totalResults: 0,
        query,
        message: 'Failed to search files',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate breadcrumbs for navigation
   */
  private static generateBreadcrumbs(path: string): Array<{ name: string; path: string }> {
    const breadcrumbs = [{ name: 'Home', path: '/' }];
    
    if (path !== '/') {
      const parts = path.split('/').filter(Boolean);
      let currentPath = '';
      
      for (const part of parts) {
        currentPath += '/' + part;
        breadcrumbs.push({
          name: part,
          path: currentPath,
        });
      }
    }
    
    return breadcrumbs;
  }

  /**
   * Get MIME type from file extension
   */
  private static getMimeTypeFromExtension(extension: string): string {
    const mimeTypes: Record<string, string> = {
      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      bmp: 'image/bmp',
      ico: 'image/x-icon',
      
      // Documents
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      
      // Text
      txt: 'text/plain',
      csv: 'text/csv',
      json: 'application/json',
      xml: 'application/xml',
      html: 'text/html',
      css: 'text/css',
      js: 'application/javascript',
      ts: 'application/typescript',
      
      // Video
      mp4: 'video/mp4',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime',
      wmv: 'video/x-ms-wmv',
      flv: 'video/x-flv',
      webm: 'video/webm',
      
      // Audio
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      flac: 'audio/flac',
      aac: 'audio/aac',
      ogg: 'audio/ogg',
      
      // Archives
      zip: 'application/zip',
      rar: 'application/vnd.rar',
      '7z': 'application/x-7z-compressed',
      tar: 'application/x-tar',
      gz: 'application/gzip',
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
  }
}
