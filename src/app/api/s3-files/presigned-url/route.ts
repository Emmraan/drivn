import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/middleware/authMiddleware';
import { S3DirectService } from '@/services/s3DirectService';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { fileName, fileType, fileSize, path } = await request.json();

    if (!fileName || !fileType || !fileSize) {
      return NextResponse.json(
        { success: false, message: 'Missing required file information' },
        { status: 400 }
      );
    }

    const result = await S3DirectService.getUploadPresignedUrl(
      String(user._id),
      fileName,
      fileType,
      fileSize,
      path
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          url: result.url,
          key: result.key,
        },
        message: result.message,
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Generate pre-signed URL API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}