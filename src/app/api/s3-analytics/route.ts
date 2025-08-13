import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/middleware/authMiddleware';
import { S3DirectService } from '@/services/s3DirectService';

/**
 * GET /api/s3-analytics
 * Get analytics data directly from S3
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

    const result = await S3DirectService.getStorageStats(String(user._id));

    if (result.success && result.data) {
      // Transform file type stats to match expected format
      const fileTypeStats = Object.entries(result.data.fileTypeStats).map(([extension, stats]) => ({
        _id: getFileTypeCategory(extension),
        count: stats.count,
        size: stats.size,
      }));

      // Calculate recent activity (this is simplified since we don't have timestamps in S3 listing)
      // In a real implementation, you might want to store this data separately or use S3 CloudTrail
      const recentActivity: Array<{
        type: 'upload';
        fileName: string;
        timestamp: string;
        size: number;
        mimeType?: string;
      }> = [];

      return NextResponse.json({
        success: true,
        data: {
          totalFiles: result.data.totalFiles,
          totalFolders: result.data.totalFolders,
          totalDownloads: 0, // Not available from S3 directly
          storageUsed: result.data.totalSize,
          recentActivity,
          monthlyStats: [], // Would need separate tracking
          fileTypeStats,
          timeRange: '30d',
          hasOwnS3Config: !!(user.s3Config?.accessKeyId),
        },
        message: result.message,
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('S3 analytics API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to categorize file types
 */
function getFileTypeCategory(extension: string): string {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
  const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
  const audioExtensions = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'];
  const documentExtensions = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'];

  if (imageExtensions.includes(extension)) {
    return 'Images';
  } else if (videoExtensions.includes(extension)) {
    return 'Videos';
  } else if (audioExtensions.includes(extension)) {
    return 'Audio';
  } else if (documentExtensions.includes(extension)) {
    return 'Documents';
  } else {
    return 'Other';
  }
}
