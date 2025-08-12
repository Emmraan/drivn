import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/middleware/authMiddleware';
import { S3DirectService } from '@/services/s3DirectService';

/**
 * DELETE /api/s3-files/[...path]
 * Delete a file directly from S3
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { path } = await params;
    const s3Key = path.join('/');

    if (!s3Key) {
      return NextResponse.json(
        { success: false, message: 'S3 key is required' },
        { status: 400 }
      );
    }

    const result = await S3DirectService.deleteFile(String(user._id), s3Key);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.message || result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('S3 file delete API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/s3-files/[...path]
 * Rename a file in S3
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { path } = await params;
    const s3Key = path.join('/');
    const body = await request.json();
    const { newName } = body;

    if (!s3Key) {
      return NextResponse.json(
        { success: false, message: 'S3 key is required' },
        { status: 400 }
      );
    }

    if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'New file name is required' },
        { status: 400 }
      );
    }

    const result = await S3DirectService.renameFile(String(user._id), s3Key, newName.trim());

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.file,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.message || result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('S3 file rename API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
