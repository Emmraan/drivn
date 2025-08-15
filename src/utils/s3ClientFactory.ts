import { S3Client, S3ClientConfig } from "@aws-sdk/client-s3";
import { NextRequest } from "next/server";
import { S3Config } from "./encryption";
import { S3ConfigService } from "@/services/s3ConfigService";
import { getS3ConfigFromCookie } from "./cookieManager";

/**
 * S3 Client Factory
 * Creates S3 client instances using user's encrypted credentials
 */

/**
 * Create S3 client from user's stored configuration
 * @param userId - User ID to retrieve configuration for
 * @param request - Optional NextRequest for cookie-based config (fallback)
 * @returns S3Client instance or null if no configuration found
 */
export async function createS3Client(
  userId: string,
  request?: NextRequest
): Promise<S3Client | null> {
  try {
    let s3Config = await S3ConfigService.getS3Config(userId);

    if (!s3Config && request) {
      s3Config = getS3ConfigFromCookie<S3Config>(request, userId);
    }

    if (!s3Config) {
      console.log("No S3 configuration found for user:", userId);
      return null;
    }

    if (
      !s3Config.accessKeyId ||
      !s3Config.secretAccessKey ||
      !s3Config.region
    ) {
      console.error("Invalid S3 configuration - missing required fields");
      return null;
    }

    const clientConfig: S3ClientConfig = {
      region: s3Config.region,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
    };

    if (s3Config.endpoint) {
      clientConfig.endpoint = s3Config.endpoint;
      clientConfig.forcePathStyle = s3Config.forcePathStyle || false;
    }

    const s3Client = new S3Client(clientConfig);

    console.log("S3 client created successfully for user:", userId, {
      region: s3Config.region,
      bucketName: s3Config.bucketName,
      endpoint: s3Config.endpoint || "AWS S3",
    });

    return s3Client;
  } catch (error) {
    console.error("Error creating S3 client for user:", userId, error);
    return null;
  }
}

/**
 * Create S3 client with explicit configuration (for testing)
 * @param config - S3 configuration object
 * @returns S3Client instance
 */
export function createS3ClientWithConfig(config: S3Config): S3Client {
  const clientConfig: S3ClientConfig = {
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  };

  if (config.endpoint) {
    clientConfig.endpoint = config.endpoint;
    clientConfig.forcePathStyle = config.forcePathStyle || false;
  }

  return new S3Client(clientConfig);
}

/**
 * Get S3 configuration for a user
 * @param userId - User ID
 * @param request - Optional NextRequest for cookie fallback
 * @returns S3 configuration or null
 */
export async function getS3Config(
  userId: string,
  request?: NextRequest
): Promise<S3Config | null> {
  try {
    let s3Config = await S3ConfigService.getS3Config(userId);

    if (!s3Config && request) {
      s3Config = getS3ConfigFromCookie<S3Config>(request, userId);
    }

    return s3Config;
  } catch (error) {
    console.error("Error getting S3 config for user:", userId, error);
    return null;
  }
}

/**
 * Get bucket name for a user
 * @param userId - User ID
 * @param request - Optional NextRequest for cookie fallback
 * @returns Bucket name or null
 */
export async function getS3BucketName(
  userId: string,
  request?: NextRequest
): Promise<string | null> {
  const config = await getS3Config(userId, request);
  return config?.bucketName || null;
}

/**
 * Validate S3 client connection
 * @param s3Client - S3Client instance to test
 * @param bucketName - Bucket name to test against
 * @returns Promise<boolean> indicating if connection is valid
 */
export async function validateS3ClientConnection(
  s3Client: S3Client,
  bucketName: string
): Promise<boolean> {
  try {
    const { HeadBucketCommand } = await import("@aws-sdk/client-s3");
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    return true;
  } catch (error) {
    console.error("S3 client connection validation failed:", error);
    return false;
  }
}

/**
 * S3 Client Manager - Singleton pattern for reusing clients
 */
class S3ClientManager {
  private clients: Map<string, { client: S3Client; timestamp: number }> =
    new Map();
  private readonly CLIENT_TTL = 30 * 60 * 1000; // 30 minutes

  /**
   * Get or create S3 client for user
   * @param userId - User ID
   * @param request - Optional NextRequest
   * @returns S3Client or null
   */
  async getClient(
    userId: string,
    request?: NextRequest
  ): Promise<S3Client | null> {
    const now = Date.now();
    const cached = this.clients.get(userId);

    if (cached && now - cached.timestamp < this.CLIENT_TTL) {
      return cached.client;
    }

    const client = await createS3Client(userId, request);

    if (client) {
      this.clients.set(userId, { client, timestamp: now });

      this.cleanupExpiredClients();
    }

    return client;
  }

  /**
   * Remove client from cache
   * @param userId - User ID
   */
  removeClient(userId: string): void {
    this.clients.delete(userId);
  }

  /**
   * Clear all cached clients
   */
  clearAll(): void {
    this.clients.clear();
  }

  /**
   * Clean up expired clients
   */
  private cleanupExpiredClients(): void {
    const now = Date.now();

    for (const [userId, cached] of this.clients.entries()) {
      if (now - cached.timestamp >= this.CLIENT_TTL) {
        this.clients.delete(userId);
      }
    }
  }
}

export const s3ClientManager = new S3ClientManager();

/**
 * Helper function to get S3 client using the manager
 * @param userId - User ID
 * @param request - Optional NextRequest
 * @returns S3Client or null
 */
export async function getS3Client(
  userId: string,
  request?: NextRequest
): Promise<S3Client | null> {
  return s3ClientManager.getClient(userId, request);
}

/**
 * Helper function to invalidate cached S3 client (call when config changes)
 * @param userId - User ID
 */
export function invalidateS3Client(userId: string): void {
  s3ClientManager.removeClient(userId);
}
