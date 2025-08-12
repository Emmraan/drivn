import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/middleware/authMiddleware';
import { FileService } from '@/services/fileService';

/**
 * POST /api/files/upload
 * Upload files to S3 and save metadata to database
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

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const folderId = formData.get('folderId') as string | null;
    const tags = formData.get('tags') as string | null;


    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No files provided' },
        { status: 400 }
      );
    }

    const uploadResults = [];
    const errors = [];

    // Set reasonable file size limit for user's own bucket
    const maxFileSize = 10 * 1024 * 1024 * 1024; // 10GB
    const limitDescription = '10GB';

    for (const file of files) {
      try {
        // Validate file
        if (file.size === 0) {
          errors.push(`File "${file.name}" is empty`);
          continue;
        }

        if (file.size > maxFileSize) {
          errors.push(`File "${file.name}" exceeds ${limitDescription} limit`);
          continue;
        }

        // Convert file to buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Parse tags
        const fileTags = tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];

        // Upload file
        const result = await FileService.uploadFile(user._id, {
          name: file.name,
          originalName: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          buffer,
          folderId: folderId || undefined,
          tags: fileTags,

        });

        if (result.success) {
          uploadResults.push({
            name: file.name,
            size: file.size,
            id: result.file?._id,
            success: true,
          });
        } else {
          errors.push(`Failed to upload "${file.name}": ${result.message}`);
        }
      } catch (error) {
        console.error(`Error uploading file "${file.name}":`, error);
        errors.push(`Failed to upload "${file.name}": Internal error`);
      }
    }

    const successCount = uploadResults.length;
    const errorCount = errors.length;

    if (successCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'All file uploads failed',
          errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${successCount} file(s)${errorCount > 0 ? ` with ${errorCount} error(s)` : ''}`,
      results: uploadResults,
      errors: errorCount > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('File upload API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/files/upload
 * Get upload configuration and limits
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // File size limit for user buckets
    const userBucketLimit = 10 * 1024 * 1024 * 1024; // 10GB (practical limit)

    return NextResponse.json({
      success: true,
      config: {
        maxFileSize: userBucketLimit,
        maxFiles: 10, // Max files per upload
        hasOwnS3Config: !!(user.s3Config?.bucketName && user.s3Config?.accessKeyId),
        allowedTypes: [
          // Images
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/svg+xml',
          // Documents
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          // Text
          'text/plain',
          'text/csv',
          'application/json',
          'application/xml',
          // Archives
          'application/zip',
          'application/x-rar-compressed',
          'application/x-7z-compressed',
          // Video
          'video/mp4',
          'video/mpeg',
          'video/quicktime',
          'video/x-msvideo',
          // Audio
          'audio/mpeg',
          'audio/wav',
          'audio/ogg',
          // Other
          'application/octet-stream',
        ],
      },
    });
  } catch (error) {
    console.error('Upload config API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
