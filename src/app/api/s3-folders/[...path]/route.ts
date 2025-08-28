import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/auth/middleware/authMiddleware";
import { S3DirectService } from "@/services/s3DirectService";
import { logger } from "@/utils/logger";

/**
 * DELETE /api/s3-folders/[...path]
 * Delete a folder and all its contents directly from S3
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const { path } = await params;
    const folderPath = path.join("/");

    if (!folderPath) {
      return NextResponse.json(
        { success: false, message: "Folder path is required" },
        { status: 400 }
      );
    }

    const result = await S3DirectService.deleteFolder(
      String(user._id),
      folderPath
    );

    if (result.success) {
      S3DirectService.forceClearUserCache(String(user._id));

      return NextResponse.json({
        success: true,
        message: result.message,
        deletedCount: result.deletedCount,
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error("S3 folder delete API error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/s3-folders/[...path]
 * Rename a folder in S3
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const { path } = await params;
    const folderPath = path.join("/");
    const body = await request.json();
    const { newName } = body;

    if (!folderPath) {
      return NextResponse.json(
        { success: false, message: "Folder path is required" },
        { status: 400 }
      );
    }

    if (
      !newName ||
      typeof newName !== "string" ||
      newName.trim().length === 0
    ) {
      return NextResponse.json(
        { success: false, message: "New folder name is required" },
        { status: 400 }
      );
    }

    const result = await S3DirectService.renameFolder(
      String(user._id),
      folderPath,
      newName.trim()
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.folder,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.message || result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error("S3 folder rename API error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
