import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/auth/middleware/authMiddleware";
import { S3ConfigService } from "@/services/s3ConfigService";
import { validateS3Config } from "@/utils/encryption";
import { logger } from "@/utils/logger";
import { redisCache } from "@/utils/redisCache";

/**
 * GET /api/s3-config
 * Retrieve user's S3 configuration (returns sanitized version without credentials)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const refresh = request.nextUrl.searchParams.get("refresh") === "true";
    const cacheKey = `dashboard/config:${String(user._id)}`;

    if (refresh) {
      await redisCache.invalidate(cacheKey);
      logger.info("💾 Config cache invalidated for refresh");
    }

    const cachedResult = await redisCache.get(cacheKey);
    if (cachedResult) {
      logger.info("💾 Config cache HIT");
      return NextResponse.json(cachedResult);
    }

    logger.info("💾 Config cache MISS, fetching...");

    const hasConfig = await S3ConfigService.hasS3Config(user._id);

    let response;
    if (!hasConfig) {
      response = {
        success: true,
        hasConfig: false,
        message: "No S3 configuration found",
      };
    } else {
      const config = await S3ConfigService.getS3Config(user._id);

      if (!config) {
        response = {
          success: true,
          hasConfig: false,
          message: "No S3 configuration found",
        };
      } else {
        response = {
          success: true,
          hasConfig: true,
          config: {
            region: config.region,
            bucketName: config.bucketName,
            endpoint: config.endpoint,
            forcePathStyle: config.forcePathStyle,
          },
        };
      }
    }

    await redisCache.set(cacheKey, response, 10 * 60 * 1000);

    return NextResponse.json(response);
  } catch (error) {
    logger.error("Error retrieving S3 configuration:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/s3-config
 * Save or update user's S3 configuration
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      accessKeyId,
      secretAccessKey,
      region,
      bucketName,
      endpoint,
      forcePathStyle,
    } = body;

    if (!accessKeyId || !secretAccessKey || !region || !bucketName) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Access Key ID, Secret Access Key, Region, and Bucket are required",
        },
        { status: 400 }
      );
    }

    const s3Config = {
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
      region: region.trim(),
      bucketName: bucketName.trim(),
      endpoint: endpoint?.trim() || undefined,
      forcePathStyle: forcePathStyle || false,
    };

    const validation = validateS3Config(s3Config);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: `Configuration validation failed: ${validation.errors.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    const result = await S3ConfigService.saveS3Config(user._id, s3Config);

    if (result.success) {
      await redisCache.invalidate(`dashboard/config`);
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    logger.error("Error saving S3 configuration:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/s3-config
 * Delete user's S3 configuration
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const result = await S3ConfigService.deleteS3Config(user._id);

    if (result.success) {
      await redisCache.invalidate(`dashboard/config`);
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    logger.error("Error deleting S3 configuration:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
