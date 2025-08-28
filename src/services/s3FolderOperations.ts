import {
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { getS3Client, getS3BucketName } from "../utils/s3ClientFactory";
import { s3Cache } from "../utils/s3Cache";
import ActivityLog, { IActivityLogModel } from "../models/ActivityLog";
import FileMetadata, { IFileMetadataModel } from "../models/FileMetadata";
import { logger } from "@/utils/logger";

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
    currentPath: string = "/"
  ): Promise<FolderResult> {
    try {
      const s3Client = await getS3Client(userId);
      const bucketName = await getS3BucketName(userId);

      if (!s3Client || !bucketName) {
        return {
          success: false,
          message:
            "S3 configuration not found. Please configure your storage settings.",
          error: "S3_CONFIG_MISSING",
        };
      }

      const sanitizedFolderName = folderName.trim().replace(/[/\\]/g, "_");
      if (!sanitizedFolderName) {
        return {
          success: false,
          message: "Folder name cannot be empty",
          error: "INVALID_NAME",
        };
      }

      const sanitizedPath = currentPath.replace(/\/+/g, "/").replace(/\/$/, "");
      const folderKey = `${userId}${sanitizedPath}/${sanitizedFolderName}/`;

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
            message: "A folder with this name already exists",
            error: "FOLDER_EXISTS",
          };
        }
      } catch (error) {
        logger.warn("Could not check for existing folder:", error);
      }

      const putCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: folderKey,
        Body: "",
        ContentType: "application/x-directory",
        Metadata: {
          "folder-name": sanitizedFolderName,
          "user-id": userId,
          "created-at": new Date().toISOString(),
        },
      });

      await s3Client.send(putCommand);

      await (ActivityLog as unknown as IActivityLogModel).logActivity(
        userId,
        "create_folder",
        sanitizedFolderName,
        {
          filePath: `${sanitizedPath}/${sanitizedFolderName}`,
          s3Key: folderKey,
        }
      );

      s3Cache.invalidate(`list:${userId}:/`);

      const folder: S3FolderItem = {
        key: folderKey,
        name: sanitizedFolderName,
        path: `${sanitizedPath}/${sanitizedFolderName}`,
        isFolder: true,
      };

      return {
        success: true,
        message: "Folder created successfully",
        folder,
      };
    } catch (error) {
      logger.error("Create folder error:", error);
      return {
        success: false,
        message: "Failed to create folder",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Delete a folder and all its contents from S3
   */
  static async deleteFolder(
    userId: string,
    folderPath: string
  ): Promise<DeleteFolderResult> {
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

      const normalizedFolderPath = folderPath
        .replace(/\/+/g, "/")
        .replace(/\/$/, "");
      const folderPrefix = `${userId}${normalizedFolderPath}/`;

      logger.info("🗑️ Deleting folder with prefix:", folderPrefix);

      const allObjects: Array<{
        Key?: string;
        Size?: number;
        LastModified?: Date;
      }> = [];
      let continuationToken: string | undefined;

      do {
        const listCommand = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: folderPrefix,
          ContinuationToken: continuationToken,
        });

        const objects = await s3Client.send(listCommand);

        if (objects.Contents) {
          allObjects.push(...objects.Contents);
        }

        continuationToken = objects.NextContinuationToken;
      } while (continuationToken);

      logger.info(
        "🔍 Found objects to delete:",
        allObjects.map((obj) => obj.Key) || []
      );

      if (allObjects.length === 0) {
        return {
          success: false,
          message: "Folder not found or already empty",
          error: "FOLDER_NOT_FOUND",
        };
      }

      const objectsToDelete = allObjects
        .filter((obj) => obj.Key)
        .map((obj) => ({ Key: obj.Key! }));

      const folderMarkerKey = folderPrefix;
      if (!objectsToDelete.some((obj) => obj.Key === folderMarkerKey)) {
        logger.info("Adding folder marker to deletion list:", folderMarkerKey);
        objectsToDelete.push({ Key: folderMarkerKey });
      }

      logger.info(
        "📝 Final objects prepared for deletion:",
        objectsToDelete.map((obj) => obj.Key)
      );

      const batchSize = 1000;
      let totalDeleted = 0;

      for (let i = 0; i < objectsToDelete.length; i += batchSize) {
        const batch = objectsToDelete.slice(i, i + batchSize);

        logger.info(
          `🗑️ Deleting batch ${Math.floor(i / batchSize) + 1}:`,
          batch.map((obj) => obj.Key)
        );

        const deleteCommand = new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: batch,
            Quiet: false,
          },
        });

        const deleteResult = await s3Client.send(deleteCommand);
        const deletedCount = batch.length - (deleteResult.Errors?.length || 0);
        totalDeleted += deletedCount;

        logger.info(
          `✅ Successfully deleted ${deletedCount} objects in this batch`
        );

        if (deleteResult.Deleted && deleteResult.Deleted.length > 0) {
          logger.info(
            "✅ Deleted objects:",
            deleteResult.Deleted.map((obj) => obj.Key)
          );
        }

        if (deleteResult.Errors && deleteResult.Errors.length > 0) {
          logger.error(
            "❌ Failed to delete some objects:",
            deleteResult.Errors
          );
        }
      }

      const deletedFolderName =
        folderPath.split("/").filter(Boolean).pop() || "folder";
      await (ActivityLog as unknown as IActivityLogModel).logActivity(
        userId,
        "delete_folder",
        deletedFolderName,
        {
          filePath: folderPath,
          s3Key: folderPrefix,
        }
      );

      await (FileMetadata as unknown as IFileMetadataModel).deleteMany({
        userId,
        s3Key: {
          $regex: `^${folderPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
        },
      });

      let verificationAttempts = 0;
      const maxVerificationAttempts = 5;
      const verificationDelay = 2000;

      while (verificationAttempts < maxVerificationAttempts) {
        try {
          if (verificationAttempts > 0) {
            await new Promise((resolve) =>
              setTimeout(resolve, verificationDelay)
            );
          }

          const verifyCommand = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: folderPrefix,
            MaxKeys: 1,
          });
          const remainingObjects = await s3Client.send(verifyCommand);

          const parentPrefix = `${userId}${normalizedFolderPath.substring(
            0,
            normalizedFolderPath.lastIndexOf("/")
          )}/`;
          const parentListCommand = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: parentPrefix,
            Delimiter: "/",
            MaxKeys: 1000,
          });
          const parentListing = await s3Client.send(parentListCommand);

          const folderStillInCommonPrefixes =
            parentListing.CommonPrefixes?.some(
              (prefix) => prefix.Prefix === folderPrefix
            );

          logger.info("🔍 Verification details:", {
            remainingObjects: remainingObjects.Contents?.length || 0,
            folderInCommonPrefixes: folderStillInCommonPrefixes,
            checkedPrefix: folderPrefix,
            parentPrefix,
          });

          const hasRemainingObjects =
            remainingObjects.Contents && remainingObjects.Contents.length > 0;

          if (hasRemainingObjects || folderStillInCommonPrefixes) {
            verificationAttempts++;
            logger.info(
              `🔄 Verification attempt ${verificationAttempts}/${maxVerificationAttempts}:`,
              {
                remainingObjects: hasRemainingObjects
                  ? remainingObjects.Contents?.map((obj) => obj.Key)
                  : [],
                stillInCommonPrefixes: folderStillInCommonPrefixes,
              }
            );

            if (verificationAttempts >= maxVerificationAttempts) {
              logger.warn(
                "⚠️ Folder still visible after maximum verification attempts. This is likely due to S3 eventual consistency and should resolve shortly."
              );
              try {
                logger.info(
                  "🔪 Attempting final, direct deletion of folder marker:",
                  folderPrefix
                );
                const deleteMarkerCommand = new DeleteObjectsCommand({
                  Bucket: bucketName,
                  Delete: { Objects: [{ Key: folderPrefix }] },
                });
                await s3Client.send(deleteMarkerCommand);
                logger.info(
                  "✅ Final deletion command sent for folder marker."
                );
              } catch (finalDeleteError) {
                logger.error(
                  "❌ Error during final direct deletion:",
                  finalDeleteError
                );
              }
            }
          } else {
            logger.info(
              "✅ Folder deletion verified - no objects remain and not in CommonPrefixes:",
              folderPrefix
            );
            break;
          }
        } catch (verifyError) {
          logger.warn("Could not verify folder deletion:", verifyError);
          break;
        }
      }

      s3Cache.invalidate(`list:${userId}:/`);
      const parentPath = normalizedFolderPath.substring(
        0,
        normalizedFolderPath.lastIndexOf("/")
      );
      s3Cache.invalidate(`list:${userId}:${parentPath}`);
      s3Cache.invalidate(`list:${userId}:`);

      logger.info(
        `✅ Folder deletion completed: ${totalDeleted} items deleted, cache invalidated`
      );

      return {
        success: true,
        message: `Folder and ${totalDeleted} item(s) deleted successfully`,
        deletedCount: totalDeleted,
      };
    } catch (error) {
      logger.error("Delete folder error:", error);
      return {
        success: false,
        message: "Failed to delete folder",
        error: error instanceof Error ? error.message : "Unknown error",
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
          message: "S3 configuration not found",
          error: "S3_CONFIG_MISSING",
        };
      }

      const sanitizedNewName = newFolderName.trim().replace(/[/\\]/g, "_");
      if (!sanitizedNewName) {
        return {
          success: false,
          message: "Folder name cannot be empty",
          error: "INVALID_NAME",
        };
      }

      const oldFolderPrefix = `${userId}${oldFolderPath}${
        oldFolderPath.endsWith("/") ? "" : "/"
      }`;

      const pathParts = oldFolderPath.split("/").filter(Boolean);
      pathParts[pathParts.length - 1] = sanitizedNewName;
      const newFolderPath = "/" + pathParts.join("/");
      const newFolderPrefix = `${userId}${newFolderPath}/`;

      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: oldFolderPrefix,
      });

      const objects = await s3Client.send(listCommand);

      if (!objects.Contents || objects.Contents.length === 0) {
        return {
          success: false,
          message: "Folder not found or is empty",
          error: "FOLDER_NOT_FOUND",
        };
      }

      const copyPromises = objects.Contents.filter(
        (obj) => obj.Key !== oldFolderPrefix
      ).map(async (obj) => {
        if (!obj.Key) return;

        const newKey = obj.Key.replace(oldFolderPrefix, newFolderPrefix);

        const copyCommand = new CopyObjectCommand({
          Bucket: bucketName,
          CopySource: `${bucketName}/${obj.Key}`,
          Key: newKey,
          MetadataDirective: "COPY",
        });

        await s3Client.send(copyCommand);
        return { oldKey: obj.Key, newKey };
      });

      const copyResults = await Promise.all(copyPromises);
      const successfulCopies = copyResults.filter(Boolean);

      if (objects.Contents && objects.Contents.length > 0) {
        const objectsToDelete = successfulCopies.map((result) => ({
          Key: result!.oldKey,
        }));
        objectsToDelete.push({ Key: oldFolderPrefix });

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

      const putCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: newFolderPrefix,
        Body: "",
        ContentType: "application/x-directory",
      });
      await s3Client.send(putCommand);

      await (ActivityLog as unknown as IActivityLogModel).logActivity(
        userId,
        "rename_folder",
        sanitizedNewName,
        {
          filePath: newFolderPath,
          s3Key: newFolderPrefix,
          metadata: {
            oldPath: oldFolderPath,
            newPath: newFolderPath,
            filesRenamed: successfulCopies.length,
          },
        }
      );

      for (const result of successfulCopies) {
        if (result) {
          await FileMetadata.findOneAndUpdate(
            { s3Key: result.oldKey },
            { s3Key: result.newKey },
            { upsert: false }
          );
        }
      }

      s3Cache.invalidate(`list:${userId}:/`);

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
      logger.error("Rename folder error:", error);
      return {
        success: false,
        message: "Failed to rename folder",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
