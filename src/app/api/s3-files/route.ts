import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/auth/middleware/authMiddleware";
import { S3DirectService } from "@/services/s3DirectService";
import { logger } from "@/utils/logger";

/**
 * GET /api/s3-files
 * List files and folders directly from S3
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

    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path") || "";
    const maxKeys = parseInt(searchParams.get("maxKeys") || "50");
    const continuationToken =
      searchParams.get("continuationToken") || undefined;
    const includeMetadata = searchParams.get("includeMetadata") === "true";
    const noCache = searchParams.get("noCache") === "true";

    logger.info("🔍 S3 files API called:", {
      path,
      maxKeys,
      continuationToken,
      includeMetadata,
      noCache,
      userId: String(user._id),
    });

    if (noCache) {
      S3DirectService.forceClearUserCache(String(user._id));
    }

    const result = await S3DirectService.listItems(String(user._id), path, {
      maxKeys,
      continuationToken,
      useCache: !noCache,
    });

    if (result.success) {
      return NextResponse.json({
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
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.message || result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error("S3 files list API error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
