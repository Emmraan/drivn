import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/auth/middleware/authMiddleware";
import { S3ConfigService } from "@/services/s3ConfigService";
import { validateS3Config } from "@/utils/encryption";

/**
 * POST /api/s3-config/test
 * Test S3 connection with provided credentials without saving
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

    const testResult = await S3ConfigService.testS3Connection(s3Config);

    if (testResult.success) {
      return NextResponse.json(testResult, { status: 200 });
    } else {
      return NextResponse.json(testResult, { status: 400 });
    }
  } catch (error) {
    console.error("Error testing S3 configuration:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
