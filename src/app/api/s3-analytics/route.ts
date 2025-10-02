import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/auth/middleware/authMiddleware";
import { S3DirectService } from "@/services/s3DirectService";
import ActivityLog from "@/models/ActivityLog";
import connectDB from "@/utils/database";
import { logger } from "@/utils/logger";
import { redisCache } from "@/utils/redisCache";

/**
 * GET /api/s3-analytics
 * Get analytics data directly from S3
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const timeRange =
      (request.nextUrl.searchParams.get("timeRange") as "7d" | "30d" | "90d") ||
      "30d";
    const refresh = request.nextUrl.searchParams.get("refresh") === "true";
    const cacheKey = `dashboard/analytics:${String(user._id)}:${timeRange}`;
    const activityCacheKey = `dashboard/activity:${String(
      user._id
    )}:${timeRange}`;

    if (refresh) {
      await redisCache.invalidate(cacheKey);
      await redisCache.invalidate(activityCacheKey);
      logger.info("💾 Analytics cache invalidated for refresh");
    }

    const cachedResult = await redisCache.get(cacheKey);
    if (cachedResult) {
      logger.info("💾 Analytics cache HIT");
      return NextResponse.json(cachedResult);
    }

    logger.info("💾 Analytics cache MISS, computing...");

    const s3StatsResult = await S3DirectService.getStorageStats(
      String(user._id)
    );

    if (s3StatsResult.success && s3StatsResult.data) {
      let activityStats: Record<
        string,
        { count: number; totalSize: number }
      > | null = (await redisCache.get(activityCacheKey)) as Record<
        string,
        { count: number; totalSize: number }
      > | null;
      if (!activityStats) {
        activityStats = await ActivityLog.getUserStats(
          String(user._id),
          timeRange
        );
        await redisCache.set(activityCacheKey, activityStats, 10 * 60 * 1000);
      }

      logger.info("Activity Stats:", activityStats);

      const totalDownloads = activityStats.download?.count || 0;
      logger.info("Total Downloads:", totalDownloads);

      const fileTypeStats = Object.entries(
        s3StatsResult.data.fileTypeStats
      ).map(([extension, stats]) => ({
        _id: getFileTypeCategory(extension),
        count: stats.count,
        size: stats.size,
      }));

      const recentActivity: Array<{
        type: "upload";
        fileName: string;
        timestamp: string;
        size: number;
        mimeType?: string;
      }> = [];

      const response = {
        success: true,
        data: {
          totalFiles: s3StatsResult.data.totalFiles,
          totalFolders: s3StatsResult.data.totalFolders,
          totalDownloads: totalDownloads,
          storageUsed: s3StatsResult.data.totalSize,
          recentActivity,
          monthlyStats: [],
          fileTypeStats,
          timeRange: timeRange,
          hasOwnS3Config: !!user.s3Config?.accessKeyId,
        },
        message: s3StatsResult.message,
      };

      await redisCache.set(cacheKey, response, 5 * 60 * 1000);

      return NextResponse.json(response);
    } else {
      return NextResponse.json(
        { success: false, message: s3StatsResult.message },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error("S3 analytics API error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Helper function to categorize file types
 */
function getFileTypeCategory(extension: string): string {
  const imageExtensions = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "webp",
    "svg",
    "bmp",
    "ico",
  ];
  const videoExtensions = ["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv"];
  const audioExtensions = ["mp3", "wav", "flac", "aac", "ogg", "wma"];
  const documentExtensions = ["pdf", "doc", "docx", "txt", "rtf", "odt"];

  if (imageExtensions.includes(extension)) {
    return "Images";
  } else if (videoExtensions.includes(extension)) {
    return "Videos";
  } else if (audioExtensions.includes(extension)) {
    return "Audio";
  } else if (documentExtensions.includes(extension)) {
    return "Documents";
  } else {
    return "Other";
  }
}
