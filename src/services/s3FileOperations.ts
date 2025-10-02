import {
  PutObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3Client, getS3BucketName } from "../utils/s3ClientFactory";
import { redisCache } from "../utils/redisCache";
import ActivityLog, { IActivityLogModel } from "../models/ActivityLog";
import FileMetadata from "../models/FileMetadata";
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

async function fileExists(
  s3Client: S3Client,
  bucketName: string,
  key: string
): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({ Bucket: bucketName, Key: key });
    await s3Client.send(command);
    return true;
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      "name" in error &&
      (error as Error).name === "NotFound"
    ) {
      return false;
    }
    throw error;
  }
}

async function getUniqueS3Key(
  s3Client: S3Client,
  bucketName: string,
  originalKey: string
): Promise<string> {
  let s3Key = originalKey;
  let counter = 1;
  const fileExtension = originalKey.includes(".")
    ? "." + originalKey.split(".").pop()
    : "";
  const fileNameWithoutExt = fileExtension
    ? originalKey.substring(0, originalKey.lastIndexOf("."))
    : originalKey;

  while (await fileExists(s3Client, bucketName, s3Key)) {
    s3Key = `${fileNameWithoutExt}(${counter})${fileExtension}`;
    counter++;
  }
  return s3Key;
}

export class S3FileOperations {
  /**
   * Delete a file from S3
   */
  static async deleteFile(
    userId: string,
    s3Key: string
  ): Promise<DeleteResult> {
    try {
      const s3Client = await getS3Client(userId);
      const bucketName = await getS3BucketName(userId);

      if (!s3Client || !bucketName) {
        return {
          success: false,
          message: "S3 configuration not found",
          error: "S3_CONFIG_MISSING",
        };
      }

      let fileName = s3Key.split("/").pop() || s3Key;
      let fileSize = 0;
      try {
        const headCommand = new HeadObjectCommand({
          Bucket: bucketName,
          Key: s3Key,
        });
        const headResult = await s3Client.send(headCommand);
        fileSize = headResult.ContentLength || 0;
        fileName = headResult.Metadata?.["original-name"] || fileName;
      } catch (error) {
        logger.warn("Could not get file metadata before deletion:", error);
      }

      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      });

      await s3Client.send(deleteCommand);

      await (ActivityLog as unknown as IActivityLogModel).logActivity(
        userId,
        "delete",
        fileName,
        {
          fileSize,
          s3Key,
        }
      );

      await redisCache.invalidate(`activity:${userId}:*`);

      await FileMetadata.findOneAndDelete({ s3Key });

      await redisCache.invalidate(`list:${userId}:/`);
      await redisCache.invalidate(`analytics:${userId}:*`);

      return {
        success: true,
        message: "File deleted successfully",
        deletedCount: 1,
      };
    } catch (error) {
      logger.error("Delete error:", error);
      return {
        success: false,
        message: "Failed to delete file",
        error: error instanceof Error ? error.message : "Unknown error",
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
          message: "S3 configuration not found",
          error: "S3_CONFIG_MISSING",
        };
      }

      const keyParts = s3Key.split("/");
      const oldFileName = keyParts[keyParts.length - 1];

      const filenameParts = oldFileName.split("-");
      let newFileName = newName;

      if (filenameParts.length >= 3) {
        const timestamp = filenameParts;
        const randomSuffix = filenameParts;
        newFileName = `${timestamp}-${randomSuffix}-${newName}`;
      }

      keyParts[keyParts.length - 1] = newFileName;
      const newS3Key = keyParts.join("/");

      const copyCommand = new CopyObjectCommand({
        Bucket: bucketName,
        CopySource: `${bucketName}/${s3Key}`,
        Key: newS3Key,
        MetadataDirective: "REPLACE",
        Metadata: {
          "original-name": newName.replace(/[^\w\-_.]/g, "_"),
          "user-id": userId,
          "renamed-at": new Date().toISOString(),
        },
      });

      await s3Client.send(copyCommand);

      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      });

      await s3Client.send(deleteCommand);

      await (ActivityLog as unknown as IActivityLogModel).logActivity(
        userId,
        "rename",
        newName,
        {
          s3Key: newS3Key,
        }
      );

      await redisCache.invalidate(`activity:${userId}:*`);

      await FileMetadata.findOneAndUpdate(
        { s3Key },
        { s3Key: newS3Key, fileName: newName },
        { upsert: true }
      );

      await redisCache.invalidate(`list:${userId}:/`);
      await redisCache.invalidate(`analytics:${userId}:*`);

      const renamedFile: S3FileItem = {
        key: newS3Key,
        name: newName,
        size: 0,
        lastModified: new Date(),
        mimeType: undefined,
        isFolder: false,
        path: newS3Key.replace(`${userId}/`, ""),
        metadata: {
          "original-name": newName,
          "user-id": userId,
          "renamed-at": new Date().toISOString(),
        },
      };
      try {
        const headCommand = new HeadObjectCommand({
          Bucket: bucketName,
          Key: newS3Key,
        });
        const headResult = await s3Client.send(headCommand);

        renamedFile.size = headResult.ContentLength || 0;
        renamedFile.mimeType = headResult.ContentType;
        renamedFile.lastModified = headResult.LastModified || new Date();
      } catch (headError) {
        logger.warn("Could not get file metadata after rename:", headError);
      }

      return {
        success: true,
        message: "File renamed successfully",
        file: renamedFile,
      };
    } catch (error) {
      logger.error("Rename error:", error);
      return {
        success: false,
        message: "Failed to rename file",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get download URL for a file
   */
  static async getDownloadUrl(
    userId: string,
    s3Key: string
  ): Promise<{
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
          message: "S3 configuration not found",
        };
      }

      const fileName = s3Key.split("/").pop() || "download";

      const getObjectCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        ResponseContentDisposition: `attachment; filename="${fileName}"`,
      });

      const signedUrl = await getSignedUrl(s3Client, getObjectCommand, {
        expiresIn: 3600,
      });

      await (ActivityLog as unknown as IActivityLogModel).logActivity(
        userId,
        "download",
        fileName,
        {
          s3Key,
        }
      );

      return {
        success: true,
        url: signedUrl,
        message: "Download URL generated successfully",
      };
    } catch (error) {
      logger.error("Download URL error:", error);
      return {
        success: false,
        message: "Failed to generate download URL",
      };
    }
  }

  /**
   * Get a pre-signed URL for uploading a file to S3
   */
  static async getUploadPresignedUrl(
    userId: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    currentPath: string = "/"
  ): Promise<{
    success: boolean;
    url?: string;
    key?: string;
    message: string;
  }> {
    try {
      const s3Client = await getS3Client(userId);
      const bucketName = await getS3BucketName(userId);

      if (!s3Client || !bucketName) {
        return {
          success: false,
          message: "S3 configuration not found",
        };
      }

      const sanitizedPath = currentPath.replace(/\/+/g, "/").replace(/\/$/, "");
      const originalS3Key = `${userId}${
        sanitizedPath === "/" || sanitizedPath === "" ? "" : sanitizedPath
      }/${fileName}`;

      const s3Key = await getUniqueS3Key(s3Client, bucketName, originalS3Key);

      const putObjectCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        ContentType: fileType,
        ContentLength: fileSize,
        Metadata: {
          "original-name": fileName.replace(/[^\w\-_.]/g, "_"),
          "user-id": userId,
          "uploaded-at": new Date().toISOString(),
          "file-size": fileSize.toString(),
        },
      });

      const signedUrl = await getSignedUrl(s3Client, putObjectCommand, {
        expiresIn: 3600,
      });

      return {
        success: true,
        url: signedUrl,
        key: s3Key,
        message: "Pre-signed URL generated successfully",
      };
    } catch (error) {
      logger.error("Generate pre-signed URL error:", error);
      return {
        success: false,
        message: "Failed to generate pre-signed URL",
      };
    }
  }
}
