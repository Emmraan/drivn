import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/middleware/authMiddleware';
import { S3DirectService } from '@/services/s3DirectService';

/**
 * GET /api/s3-files
 * List files and folders directly from S3
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

    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    const maxKeys = parseInt(searchParams.get('maxKeys') || '50');
    const continuationToken = searchParams.get('continuationToken') || undefined;
    const includeMetadata = searchParams.get('includeMetadata') === 'true';
    const noCache = searchParams.get('noCache') === 'true';

    console.log('🔍 S3 files API called:', { path, maxKeys, continuationToken, includeMetadata, noCache, userId: String(user._id) });

    // Force clear cache if noCache is requested
    if (noCache) {
      S3DirectService.forceClearUserCache(String(user._id));
    }

    const result = await S3DirectService.listItems(String(user._id), path, {
      maxKeys,
      continuationToken,
      useCache: !noCache, // Disable cache when noCache is true
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          files: result.files,
          folders: result.folders,
          currentPath: result.currentPath,
          breadcrumbs: result.breadcrumbs,
          totalSize: result.totalSize,
          totalFiles: result.totalFiles,
          totalFolders: result.totalFolders,
          hasMore: result.hasMore,
          nextToken: result.nextToken,
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
    console.error('S3 files list API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/s3-files
 * Upload files directly to S3
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

    // Debug user object
    console.log('User object in S3 files API:', {
      user: user,
      userId: user._id,
      userIdType: typeof user._id,
      userIdString: String(user._id),
    });

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const path = formData.get('path') as string || '';

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No files provided' },
        { status: 400 }
      );
    }

    const uploadResults = [];
    const errors = [];

    for (const file of files) {
      try {
        const result = await S3DirectService.uploadFile(String(user._id), file, path);

        if (result.success && result.file) {
          uploadResults.push(result.file);
        } else {
          errors.push({ fileName: file.name, error: result.message });
        }
      } catch (error) {
        errors.push({ 
          fileName: file.name, 
          error: error instanceof Error ? error.message : 'Upload failed' 
        });
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      data: {
        uploaded: uploadResults,
        errors,
        totalUploaded: uploadResults.length,
        totalErrors: errors.length,
      },
      message: errors.length === 0 
        ? 'All files uploaded successfully' 
        : `${uploadResults.length} files uploaded, ${errors.length} failed`,
    });
  } catch (error) {
    console.error('S3 files upload API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
