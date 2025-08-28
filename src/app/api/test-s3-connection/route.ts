import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/auth/middleware/authMiddleware";
import { S3DirectService } from "@/services/s3DirectService";
import { logger } from "@/utils/logger";

/**
 * GET /api/test-s3-connection
 * Test S3 connectivity and permissions for debugging
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

    const result = await S3DirectService.testS3Connection(String(user._id));

    return NextResponse.json({
      success: result.success,
      message: result.message,
      userId: String(user._id),
    });
  } catch (error) {
    logger.error("S3 connection test API error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Test failed",
      },
      { status: 500 }
    );
  }
}
