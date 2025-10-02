import { ListObjectsV2Command, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client, getS3BucketName } from "../utils/s3ClientFactory";
import { redisCache } from "../utils/redisCache";
import { logger } from "@/utils/logger";

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
    path: string = "/",
    options: {
      maxKeys?: number;
      continuationToken?: string;
      useCache?: boolean;
      includeMetadata?: boolean;
    } = {}
  ): Promise<ListResult> {
    try {
      const {
        maxKeys = 1000,
        continuationToken,
        useCache = true,
        includeMetadata = false,
      } = options;

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
          message:
            "S3 configuration not found. Please configure your storage settings.",
          error: "S3_CONFIG_MISSING",
        };
      }

      const normalizedPath = path.replace(/\/+/g, "/").replace(/\/$/, "");
      const s3Prefix =
        [userId, normalizedPath.replace(/^\//, "")].filter(Boolean).join("/") +
        "/";

      const cacheKey = `list:${userId}:${normalizedPath}:${maxKeys}:${
        continuationToken || ""
      }:${includeMetadata}`;
      if (useCache) {
        const cached = await redisCache.get(cacheKey);
        if (cached) {
          return cached as ListResult;
        }
      }

      logger.info(
        "🔍 Listing S3 objects with prefix:",
        s3Prefix,
        useCache ? "(using cache)" : "(bypassing cache)"
      );

      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: s3Prefix,
        Delimiter: "/",
        MaxKeys: maxKeys,
        ...(continuationToken && { ContinuationToken: continuationToken }),
      });

      logger.info("🔍 Sending ListObjectsV2Command with params:", {
        Bucket: bucketName,
        Prefix: s3Prefix,
        Delimiter: "/",
        MaxKeys: maxKeys,
        ContinuationToken: continuationToken,
      });

      const response = await s3Client.send(listCommand);

      logger.info("🔍 S3 ListObjects response:", {
        CommonPrefixes: response.CommonPrefixes?.map((p) => p.Prefix) || [],
        Contents: response.Contents?.map((c) => c.Key) || [],
        IsTruncated: response.IsTruncated,
      });

      const folders: S3FileItem[] = [];
      if (response.CommonPrefixes) {
        for (const prefix of response.CommonPrefixes) {
          if (!prefix.Prefix || prefix.Prefix === s3Prefix) continue;

          const folderName = prefix.Prefix.replace(s3Prefix, "").replace(
            "/",
            ""
          );
          if (!folderName) continue;

          folders.push({
            key: prefix.Prefix,
            name: folderName,
            size: 0,
            lastModified: new Date(),
            isFolder: true,
            path: `${
              normalizedPath === "/" || normalizedPath === ""
                ? ""
                : normalizedPath
            }/${folderName}`,
          });
        }
      }

      let files: S3FileItem[] = [];
      let totalSize = 0;

      if (response.Contents) {
        const filePromises = response.Contents.filter(
          (object) => object.Key && !object.Key.endsWith("/")
        ).map(async (object) => {
          if (!object.Key) return null;

          const s3FileName = object.Key.replace(s3Prefix, "");
          if (!s3FileName) return null;

          let originalFileName = s3FileName;
          let contentType = "application/octet-stream";

          if (includeMetadata) {
            try {
              const headCommand = new HeadObjectCommand({
                Bucket: bucketName,
                Key: object.Key,
              });
              const headResult = await s3Client.send(headCommand);

              if (headResult.Metadata?.["original-name"]) {
                originalFileName = headResult.Metadata["original-name"];
              }

              if (headResult.ContentType) {
                contentType = headResult.ContentType;
              }
            } catch (error) {
              logger.warn(`Could not get metadata for ${object.Key}:`, error);
              const parts = s3FileName.split("-");
              if (parts.length >= 3) {
                originalFileName = parts.slice(2).join("-");
              }
            }
          } else {
            const parts = s3FileName.split("-");
            if (parts.length >= 3) {
              originalFileName = parts.slice(2).join("-");
            }
          }

          const fileItem: S3FileItem = {
            key: object.Key,
            name: originalFileName,
            size: object.Size || 0,
            lastModified: object.LastModified || new Date(),
            isFolder: false,
            path: `${
              normalizedPath === "/" || normalizedPath === ""
                ? ""
                : normalizedPath
            }/${originalFileName}`,
            mimeType: contentType,
          };

          if (contentType === "application/octet-stream") {
            const extension = originalFileName.split(".").pop()?.toLowerCase();
            if (extension) {
              fileItem.mimeType =
                S3ListingOperations.getMimeTypeFromExtension(extension);
            }
          }

          totalSize += object.Size || 0;
          return fileItem;
        });

        const fileResults = await Promise.all(filePromises);
        files = fileResults.filter((item): item is S3FileItem => item !== null);
      }

      const breadcrumbs =
        S3ListingOperations.generateBreadcrumbs(normalizedPath);

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

      if (useCache) {
        await redisCache.set(cacheKey, result, 2 * 60 * 1000);
      }

      logger.info(
        `📁 Listed ${files.length} files and ${folders.length} folders`
      );
      return result;
    } catch (error) {
      logger.error("List files error:", error);
      return {
        success: false,
        files: [],
        folders: [],
        currentPath: path,
        breadcrumbs: [],
        totalSize: 0,
        totalFiles: 0,
        totalFolders: 0,
        message: "Failed to list files",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * List all files recursively for a user
   */
  static async listAllFiles(userId: string): Promise<S3FileItem[]> {
    const s3Client = await getS3Client(userId);
    const bucketName = await getS3BucketName(userId);
    if (!s3Client || !bucketName) {
      return [];
    }

    let allFiles: S3FileItem[] = [];
    let continuationToken: string | undefined = undefined;
    let hasMore = true;

    while (hasMore) {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: `${userId}/`,
        ContinuationToken: continuationToken,
      });

      const response: import("@aws-sdk/client-s3").ListObjectsV2CommandOutput =
        await s3Client.send(command);

      if (response.Contents) {
        const fileItems = response.Contents.filter(
          (object) => object.Key && object.Size && object.Size > 0
        ).map((object: import("@aws-sdk/client-s3")._Object) => {
          const key = object.Key || "";
          const name = key.split("/").pop() || "";
          return {
            key,
            name,
            size: object.Size || 0,
            lastModified: object.LastModified || new Date(),
            isFolder: false,
            path: key.replace(`${userId}/`, "/"),
          };
        });
        allFiles = allFiles.concat(fileItems);
      }

      continuationToken = response.NextContinuationToken;
      hasMore = !!continuationToken;
    }

    return allFiles;
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
          message: "S3 configuration not found",
          error: "S3_CONFIG_MISSING",
        };
      }

      const cacheKey = `search:${userId}:${query}:${
        mimeTypeFilter || ""
      }:${maxResults}`;
      const cached = await redisCache.get(cacheKey);
      if (cached) {
        return cached as SearchResult;
      }

      logger.info("🔍 Searching S3 objects for query:", query);

      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: `${userId}/`,
        MaxKeys: 1000,
      });

      const response = await s3Client.send(listCommand);
      const matchingFiles: S3FileItem[] = [];

      if (response.Contents) {
        const queryLower = query.toLowerCase();

        for (const object of response.Contents) {
          if (object.Key && !object.Key.endsWith("/")) {
            const fileName = object.Key.split("/").pop() || "";

            if (fileName.toLowerCase().includes(queryLower)) {
              const extension = fileName.split(".").pop()?.toLowerCase();
              const mimeType = extension
                ? S3ListingOperations.getMimeTypeFromExtension(extension)
                : undefined;

              if (
                mimeTypeFilter &&
                mimeType &&
                !mimeType.includes(mimeTypeFilter)
              ) {
                continue;
              }

              const pathParts = object.Key.split("/");
              pathParts.shift();
              pathParts.pop();
              const filePath = "/" + pathParts.join("/");

              matchingFiles.push({
                key: object.Key,
                name: fileName,
                size: object.Size || 0,
                lastModified: object.LastModified || new Date(),
                mimeType,
                isFolder: false,
                path: filePath + "/" + fileName,
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

      await redisCache.set(cacheKey, result, 1 * 60 * 1000);

      logger.info(`🔍 Found ${matchingFiles.length} matching files`);
      return result;
    } catch (error) {
      logger.error("Search files error:", error);
      return {
        success: false,
        files: [],
        totalResults: 0,
        query,
        message: "Failed to search files",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Generate breadcrumbs for navigation
   */
  private static generateBreadcrumbs(
    path: string
  ): Array<{ name: string; path: string }> {
    const breadcrumbs = [{ name: "Home", path: "/" }];

    if (path !== "/") {
      const parts = path.split("/").filter(Boolean);
      let currentPath = "";

      for (const part of parts) {
        currentPath += "/" + part;
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
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      bmp: "image/bmp",
      ico: "image/x-icon",

      // Documents
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ppt: "application/vnd.ms-powerpoint",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",

      // Text
      txt: "text/plain",
      csv: "text/csv",
      json: "application/json",
      xml: "application/xml",
      html: "text/html",
      css: "text/css",
      js: "application/javascript",
      ts: "application/typescript",

      // Video
      mp4: "video/mp4",
      avi: "video/x-msvideo",
      mov: "video/quicktime",
      wmv: "video/x-ms-wmv",
      flv: "video/x-flv",
      webm: "video/webm",

      // Audio
      mp3: "audio/mpeg",
      wav: "audio/wav",
      flac: "audio/flac",
      aac: "audio/aac",
      ogg: "audio/ogg",

      // Archives
      zip: "application/zip",
      rar: "application/vnd.rar",
      "7z": "application/x-7z-compressed",
      tar: "application/x-tar",
      gz: "application/gzip",
    };

    return mimeTypes[extension] || "application/octet-stream";
  }
}
