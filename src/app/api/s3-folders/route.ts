import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/middleware/authMiddleware';
import { S3DirectService } from '@/services/s3DirectService';

/**
 * POST /api/s3-folders
 * Create a new folder directly in S3
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, parentPath } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Folder name is required' },
        { status: 400 }
      );
    }

    // Validate folder name
    const trimmedName = name.trim();
    if (trimmedName.length > 255) {
      return NextResponse.json(
        { success: false, message: 'Folder name must be less than 255 characters' },
        { status: 400 }
      );
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(trimmedName)) {
      return NextResponse.json(
        { success: false, message: 'Folder name contains invalid characters' },
        { status: 400 }
      );
    }

    const result = await S3DirectService.createFolder(
      String(user._id),
      trimmedName,
      parentPath || ''
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
    console.error('S3 folder create API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
