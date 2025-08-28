import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/auth/middleware/authMiddleware";
import { S3DirectService } from "@/services/s3DirectService";
import { logger } from "@/utils/logger";

/**
 * GET /api/s3-search
 * Search files directly in S3
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
    const query = searchParams.get("q");
    const maxResults = parseInt(searchParams.get("maxResults") || "100");
    const mimeTypeFilter = searchParams.get("mimeType") || undefined;

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: "Search query is required" },
        { status: 400 }
      );
    }

    if (query.trim().length < 2) {
      return NextResponse.json(
        {
          success: false,
          message: "Search query must be at least 2 characters",
        },
        { status: 400 }
      );
    }

    const result = await S3DirectService.searchFiles(
      String(user._id),
      query.trim(),
      {
        maxResults,
        mimeTypeFilter,
      }
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          files: result.files,
          totalResults: result.totalResults,
          query: result.query,
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
    logger.error("S3 search API error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
