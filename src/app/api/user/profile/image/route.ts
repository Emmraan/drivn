import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/auth/middleware/authMiddleware";
import connectDB from "@/utils/database";
import User from "@/auth/models/User";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getS3Client, getS3BucketName } from "@/utils/s3ClientFactory";
import { S3ConfigService } from "@/services/s3ConfigService";
import sharp from "sharp";

/**
 * PUT /api/user/profile/image
 * Update user profile image by uploading to S3 with optimization
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    await connectDB();

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

    const formData = await request.formData();
    const imageFile = formData.get("image") as File;

    if (!imageFile) {
      return NextResponse.json(
        { success: false, message: "Image file is required" },
        { status: 400 }
      );
    }

    if (!imageFile.type.startsWith("image/")) {
      return NextResponse.json(
        { success: false, message: "Please upload a valid image file" },
        { status: 400 }
      );
    }

    if (imageFile.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: "Image size should be less than 5MB" },
        { status: 400 }
      );
    }

    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());

    const optimizedImageBuffer = await sharp(imageBuffer)
      .resize(400, 400, {
        fit: "cover",
        position: "center",
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    const fileExtension = imageFile.name.split(".").pop() || "jpg";
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const s3Key = `profile-images/${user._id}/profile-${timestamp}-${randomId}.${fileExtension}`;

    // Delete old profile image if it exists and is an S3 URL
    if (
      user.image &&
      user.image.startsWith("http") &&
      user.image.includes("profile-images/")
    ) {
      try {
        const urlParts = user.image.split("/");
        const profileImagesIndex = urlParts.findIndex(
          (part) => part === "profile-images"
        );
        if (profileImagesIndex !== -1) {
          const oldS3Key = urlParts.slice(profileImagesIndex).join("/");
          if (oldS3Key && oldS3Key !== s3Key) {
            const deleteCommand = new DeleteObjectCommand({
              Bucket: bucketName,
              Key: oldS3Key,
            });
            await s3Client.send(deleteCommand);
            console.log("Deleted old profile image:", oldS3Key);
          }
        }
      } catch (deleteError) {
        console.error("Error deleting old profile image:", deleteError);
      }
    }

    // Upload to S3 with public read access
    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: optimizedImageBuffer,
      ContentType: "image/jpeg",
      ACL: "public-read",
      Metadata: {
        "user-id": String(user._id),
        "uploaded-at": new Date().toISOString(),
        "original-name": imageFile.name,
      },
    });

    await s3Client.send(uploadCommand);

    // Generate S3 URL based on configuration
    let s3Url: string;

    if (s3Config.endpoint) {
      const endpointUrl = s3Config.endpoint.startsWith("http")
        ? s3Config.endpoint
        : `https://${s3Config.endpoint}`;

      const cleanEndpoint = endpointUrl.replace(/\/$/, "");

      // For custom endpoints, the URL format depends on the provider
      if (
        s3Config.endpoint.includes("backblaze") ||
        s3Config.endpoint.includes("b2")
      ) {
        // Backblaze B2 format
        s3Url = `${cleanEndpoint}/file/${bucketName}/${s3Key}`;
      } else if (s3Config.endpoint.includes("tebi")) {
        // Tebi S3-compatible format
        s3Url = `${cleanEndpoint}/${bucketName}/${s3Key}`;
      } else if (
        s3Config.endpoint.includes("digitalocean") ||
        s3Config.endpoint.includes("spaces")
      ) {
        // DigitalOcean Spaces format
        s3Url = `${cleanEndpoint}/${bucketName}/${s3Key}`;
      } else if (
        s3Config.endpoint.includes("linode") ||
        s3Config.endpoint.includes("objectstorage")
      ) {
        // Linode Object Storage format
        s3Url = `${cleanEndpoint}/${bucketName}/${s3Key}`;
      } else if (s3Config.endpoint.includes("wasabi")) {
        // Wasabi format
        s3Url = `${cleanEndpoint}/${bucketName}/${s3Key}`;
      } else if (
        s3Config.endpoint.includes("minio") ||
        s3Config.endpoint.includes("localhost")
      ) {
        // MinIO or local development format
        s3Url = `${cleanEndpoint}/${bucketName}/${s3Key}`;
      } else {
        // Generic S3-compatible format (try path-style first)
        s3Url = `${cleanEndpoint}/${bucketName}/${s3Key}`;
      }
    } else {
      // AWS S3 default format
      s3Url = `https://${bucketName}.s3.${
        s3Config.region || process.env.AWS_REGION || "us-east-1"
      }.amazonaws.com/${s3Key}`;
    }

    // Update user profile with S3 URL
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { image: s3Url },
      { new: true }
    ).select("-password");

    return NextResponse.json({
      success: true,
      message: "Profile image updated successfully",
      user: {
        _id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        image: updatedUser.image,
        emailVerified: updatedUser.emailVerified,
      },
    });
  } catch (error) {
    console.error("Update profile image API error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
