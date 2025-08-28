import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/auth/middleware/authMiddleware";
import connectDB from "@/utils/database";
import User from "@/auth/models/User";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3Client, getS3BucketName } from "@/utils/s3ClientFactory";
import { S3ConfigService } from "@/services/s3ConfigService";
import { logger } from "@/utils/logger";

/**
 * POST /api/user/profile/image/refresh
 * Refresh expired profile image URL with new presigned URL
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

    await connectDB();

    if (!user.image || !user.image.includes("profile-images/")) {
      return NextResponse.json(
        { success: false, message: "No profile image found" },
        { status: 404 }
      );
    }

    const s3Client = await getS3Client(user._id);
    const bucketName = await getS3BucketName(user._id);
    const s3Config = await S3ConfigService.getS3Config(user._id);

    if (!s3Client || !bucketName || !s3Config) {
      return NextResponse.json(
        {
          success: false,
          message:
            "S3 configuration not found. Please configure your S3 settings first.",
        },
        { status: 400 }
      );
    }

    // Extract S3 key from the current image URL
    let s3Key: string;
    try {
      if (user.image.includes("X-Amz-Algorithm")) {
        const url = new URL(user.image);
        s3Key = url.pathname.startsWith("/")
          ? url.pathname.substring(1)
          : url.pathname;
        if (s3Key.startsWith(bucketName + "/")) {
          s3Key = s3Key.substring(bucketName.length + 1);
        }
      } else {
        const url = new URL(user.image);
        const pathParts = url.pathname.split("/");
        const profileImagesIndex = pathParts.findIndex(
          (part) => part === "profile-images"
        );
        if (profileImagesIndex !== -1) {
          s3Key = pathParts.slice(profileImagesIndex).join("/");
        } else {
          return NextResponse.json(
            { success: false, message: "Invalid image URL format" },
            { status: 400 }
          );
        }
      }
    } catch (error) {
      logger.error("Error parsing image URL:", error);
      return NextResponse.json(
        { success: false, message: "Invalid image URL format" },
        { status: 400 }
      );
    }

    // Generate new presigned URL
    const getObjectCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
    });

    const newPresignedUrl = await getSignedUrl(s3Client, getObjectCommand, {
      expiresIn: 604800,
    });

    // Update user profile with new URL
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { image: newPresignedUrl },
      { new: true }
    ).select("-password");

    return NextResponse.json({
      success: true,
      message: "Profile image URL refreshed successfully",
      user: {
        _id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        image: updatedUser.image,
        emailVerified: updatedUser.emailVerified,
      },
    });
  } catch (error) {
    logger.error("Refresh profile image URL API error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
