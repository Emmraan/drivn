import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/middleware/authMiddleware';
import connectDB from '@/utils/database';
import ActivityLog, { IActivityLogModel } from '@/models/ActivityLog';
import FileMetadata, { IFileMetadataModel } from '@/models/FileMetadata';
import { Types } from 'mongoose';
import { S3DirectService } from '@/services/s3DirectService';

/**
 * GET /api/analytics
 * Get analytics data for the authenticated user
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

    await connectDB();

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '30d';

    // Get basic stats from hybrid models
    const [fileMetadataStats, activityStats, s3Stats] = await Promise.all([
      (FileMetadata as unknown as IFileMetadataModel).getStorageStats(user._id),
      (ActivityLog as unknown as IActivityLogModel).getUserStats(user._id, timeRange as '7d' | '30d' | '90d'),
      S3DirectService.getStorageStats(String(user._id)),
    ]);

    const totalFiles = fileMetadataStats.totalFiles;
    const totalFolders = s3Stats.success ? s3Stats.data?.totalFolders || 0 : 0;
    const totalDownloads = activityStats.download?.count || 0;
    const storageUsed = fileMetadataStats.totalSize;

    // Get recent activity from activity logs
    const recentActivityLogs = await (ActivityLog as unknown as IActivityLogModel).getRecentActivity(user._id, 10);
    const recentActivity = recentActivityLogs.map((log: { action: string; fileName: string; timestamp: Date; fileSize?: number; mimeType?: string }) => ({
      type: log.action,
      fileName: log.fileName,
      timestamp: log.timestamp.toISOString(),
      size: log.fileSize,
      mimeType: log.mimeType,
    }));

    // Get monthly stats from activity logs for the last 6 months
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const monthlyStats = await ActivityLog.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(user._id),
          timestamp: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            action: '$action'
          },
          count: { $sum: 1 },
          storage: { $sum: '$fileSize' }
        }
      },
      {
        $group: {
          _id: {
            year: '$_id.year',
            month: '$_id.month'
          },
          uploads: {
            $sum: {
              $cond: [{ $eq: ['$_id.action', 'upload'] }, '$count', 0]
            }
          },
          downloads: {
            $sum: {
              $cond: [{ $eq: ['$_id.action', 'download'] }, '$count', 0]
            }
          },
          storage: {
            $sum: {
              $cond: [{ $eq: ['$_id.action', 'upload'] }, '$storage', 0]
            }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Fill in missing months with zero data
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const filledMonthlyStats = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      const existingData = monthlyStats.find(stat => 
        stat._id.year === year && stat._id.month === month
      );
      
      filledMonthlyStats.push({
        month: monthNames[month - 1],
        uploads: existingData?.uploads || 0,
        downloads: existingData?.downloads || 0,
        storage: existingData ? (existingData.storage / (1024 * 1024 * 1024)) : 0, // Convert to GB
      });
    }

    // Get file type distribution from metadata
    const fileTypeStats = await (FileMetadata as unknown as IFileMetadataModel).getFileTypeStats(user._id);

    return NextResponse.json({
      success: true,
      data: {
        totalFiles,
        totalFolders,
        totalDownloads,
        storageUsed,
        recentActivity,
        monthlyStats: filledMonthlyStats,
        fileTypeStats,
        timeRange,
      },
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
