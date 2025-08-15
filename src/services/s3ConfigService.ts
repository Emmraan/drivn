import {
  S3Client,
  HeadBucketCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import connectDB from "@/utils/database";
import User from "@/auth/models/User";
import {
  S3Config,
  encryptS3Config,
  decryptS3Config,
  validateS3Config,
  sanitizeS3ConfigForLogging,
} from "@/utils/encryption";

/**
 * Service for managing user S3 configurations
 * Handles validation, testing, and secure storage of S3 credentials
 */
export class S3ConfigService {
  /**
   * Test S3 connection with provided credentials
   * @param config - S3 configuration to test
   * @returns Test result with success status and message
   */
  static async testS3Connection(
    config: S3Config
  ): Promise<{ success: boolean; message: string }> {
    try {
      const validation = validateS3Config(config);
      if (!validation.valid) {
        return {
          success: false,
          message: `Configuration validation failed: ${validation.errors.join(
            ", "
          )}`,
        };
      }

      const s3Client = new S3Client({
        region: config.region,
        endpoint: config.endpoint,
        forcePathStyle: config.forcePathStyle || false,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      });

      try {
        await s3Client.send(
          new HeadBucketCommand({ Bucket: config.bucketName })
        );
      } catch (error) {
        if (error instanceof Error && error.name === "NotFound") {
          return {
            success: false,
            message: `Bucket '${config.bucketName}' does not exist or is not accessible`,
          };
        }

        if (error instanceof Error && error.name === "Forbidden") {
          return {
            success: false,
            message: `Access denied to bucket '${config.bucketName}'. Check your credentials and permissions.`,
          };
        }

        throw error;
      }

      const testKey = `drivn-test-${Date.now()}.txt`;
      const testContent = "DRIVN connection test - safe to delete";

      try {
        await s3Client.send(
          new PutObjectCommand({
            Bucket: config.bucketName,
            Key: testKey,
            Body: testContent,
            ContentType: "text/plain",
          })
        );

        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: config.bucketName,
            Key: testKey,
          })
        );

        console.log(
          "S3 connection test successful:",
          sanitizeS3ConfigForLogging(config)
        );

        return {
          success: true,
          message:
            "S3 connection test successful! Your credentials are valid and you have read/write access to the bucket.",
        };
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "name" in error &&
          (error as { name: string }).name === "AccessDenied"
        ) {
          return {
            success: false,
            message:
              "Bucket is accessible but you do not have write permissions. Please check your IAM policy.",
          };
        }

        throw error;
      }
    } catch (error) {
      const hasMessage =
        typeof error === "object" && error !== null && "message" in error;
      const hasName =
        typeof error === "object" && error !== null && "name" in error;
      const hasCode =
        typeof error === "object" && error !== null && "code" in error;

      const errorMessage = hasMessage
        ? (error as { message: string }).message
        : "Unknown error";
      const errorName = hasName ? (error as { name: string }).name : "";
      const errorCode = hasCode ? (error as { code: string }).code : "";

      console.error(
        "S3 connection test failed:",
        errorMessage,
        sanitizeS3ConfigForLogging(config)
      );

      if (
        errorName === "CredentialsError" ||
        errorName === "InvalidAccessKeyId"
      ) {
        return {
          success: false,
          message: "Invalid access key ID or secret access key",
        };
      }

      if (errorName === "SignatureDoesNotMatch") {
        return {
          success: false,
          message: "Invalid secret access key",
        };
      }

      if (errorName === "NetworkingError" || errorCode === "ENOTFOUND") {
        return {
          success: false,
          message:
            "Network error: Could not connect to S3 endpoint. Check your endpoint URL and internet connection.",
        };
      }

      return {
        success: false,
        message: `Connection test failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Save S3 configuration for a user
   * @param userId - User ID
   * @param config - S3 configuration to save
   * @returns Save result
   */
  static async saveS3Config(
    userId: string,
    config: S3Config
  ): Promise<{ success: boolean; message: string }> {
    try {
      await connectDB();

      const validation = validateS3Config(config);
      if (!validation.valid) {
        return {
          success: false,
          message: `Configuration validation failed: ${validation.errors.join(
            ", "
          )}`,
        };
      }

      const testResult = await this.testS3Connection(config);
      if (!testResult.success) {
        return testResult;
      }

      const encryptedConfig = encryptS3Config(config, userId);

      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      user.s3Config = {
        accessKeyId: encryptedConfig,
        secretAccessKey: "",
        region: "",
        bucketName: "",
        endpoint: "",
      };

      await user.save();

      console.log(
        "S3 configuration saved for user:",
        userId,
        sanitizeS3ConfigForLogging(config)
      );

      return {
        success: true,
        message: "S3 configuration saved successfully",
      };
    } catch (error) {
      let errorMessage = "Unknown error";

      if (typeof error === "object" && error !== null && "message" in error) {
        errorMessage = String((error as { message: unknown }).message);
      }

      console.error("Error saving S3 configuration:", errorMessage);

      return {
        success: false,
        message: "Failed to save S3 configuration",
      };
    }
  }

  /**
   * Get S3 configuration for a user
   * @param userId - User ID
   * @returns S3 configuration or null if not found
   */
  static async getS3Config(userId: string): Promise<S3Config | null> {
    try {
      await connectDB();

      const user = await User.findById(userId);
      if (!user || !user.s3Config?.accessKeyId) {
        return null;
      }

      const decryptedConfig = decryptS3Config(
        user.s3Config.accessKeyId,
        userId
      );
      return decryptedConfig;
    } catch (error) {
      console.error("Error retrieving S3 configuration:", error);
      return null;
    }
  }

  /**
   * Delete S3 configuration for a user
   * @param userId - User ID
   * @returns Delete result
   */
  static async deleteS3Config(
    userId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      await connectDB();

      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      user.s3Config = undefined;
      await user.save();

      console.log("S3 configuration deleted for user:", userId);

      return {
        success: true,
        message: "S3 configuration deleted successfully",
      };
    } catch (error) {
      const errorMessage =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message: unknown }).message)
          : "Unknown error";

      console.error("Error deleting S3 configuration:", errorMessage);

      return {
        success: false,
        message: "Failed to delete S3 configuration",
      };
    }
  }

  /**
   * Check if user has S3 configuration
   * @param userId - User ID
   * @returns Boolean indicating if user has S3 config
   */
  static async hasS3Config(userId: string): Promise<boolean> {
    try {
      await connectDB();
      const user = await User.findById(userId);
      return !!user?.s3Config?.accessKeyId;
    } catch (error) {
      console.error("Error checking S3 configuration:", error);
      return false;
    }
  }
}
