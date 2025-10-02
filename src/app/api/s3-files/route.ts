import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/auth/middleware/authMiddleware";
import { S3DirectService } from "@/services/s3DirectService";
import { logger } from "@/utils/logger";
import { redisCache } from "@/utils/redisCache";

/**
 * GET /api/s3-files
 * List files and folders directly from S3
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path") || "";
    const maxKeys = parseInt(searchParams.get("maxKeys") || "50");
    const continuationToken =
      searchParams.get("continuationToken") || undefined;
    const includeMetadata = searchParams.get("includeMetadata") === "true";
    const noCache = searchParams.get("noCache") === "true";
    const refresh = searchParams.get("refresh") === "true";

    const cacheKey = `dashboard/files:${String(user._id)}:${path}:${maxKeys}:${
      continuationToken || ""
    }:${includeMetadata}`;

    logger.info("🔍 S3 files API called:", {
      path,
      maxKeys,
      continuationToken,
      includeMetadata,
      noCache,
      refresh,
      userId: String(user._id),
    });

    logger.info("Cache key:", cacheKey);

    if (refresh) {
      await redisCache.invalidate(cacheKey);
      logger.info("💾 Files cache invalidated for refresh");
    }

    if (!noCache) {
      const cachedResult = await redisCache.get(cacheKey);
      if (cachedResult) {
        logger.info("💾 Files cache HIT");
        return NextResponse.json(cachedResult);
      }
    }

    logger.info("💾 Files cache MISS, listing...");

    if (noCache) {
      await S3DirectService.forceClearUserCache(String(user._id));
    }

    const listStart = Date.now();
    const result = await S3DirectService.listItems(String(user._id), path, {
      maxKeys,
      continuationToken,
      useCache: !noCache,
      includeMetadata,
    });
    logger.info(
      `🔍 S3DirectService.listItems took ${Date.now() - listStart}ms`
    );

    if (result.success) {
      const response = {
        success: true,
        data: {
          files: result.files,
          folders: result.folders,
          currentPath: result.currentPath,
          breadcrumbs: result.breadcrumbs,
          totalSize: result.totalSize,
          totalFiles: result.totalFiles,
          totalFolders: result.totalFolders,
          hasMore: result.hasMore,
          nextToken: result.nextToken,
        },
        message: result.message,
      };

      await redisCache.set(cacheKey, response, 5 * 60 * 1000);

      logger.info(`🔍 S3 files API completed in ${Date.now() - startTime}ms`);
      return NextResponse.json(response);
    } else {
      logger.info(`🔍 S3 files API failed in ${Date.now() - startTime}ms`);
      return NextResponse.json(
        { success: false, message: result.message || result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error(
      `S3 files list API error after ${Date.now() - startTime}ms:`,
      error
    );
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
