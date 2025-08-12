import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/auth/middleware/adminMiddleware';
import connectDB from '@/utils/database';
import User from '@/auth/models/User';
import ActivityLog from '@/models/ActivityLog';
import FileMetadata from '@/models/FileMetadata';

/**
 * GET /api/admin/analytics
 * Get analytics data for admin dashboard
 */
export const GET = requireAdmin(async (request: NextRequest) => {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';

    // Calculate date range
    const now = new Date();
    const daysBack = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    const previousStartDate = new Date(startDate.getTime() - daysBack * 24 * 60 * 60 * 1000);

    // Get user growth
    const currentUsers = await User.countDocuments({
      createdAt: { $gte: startDate },
    });
    const previousUsers = await User.countDocuments({
      createdAt: { $gte: previousStartDate, $lt: startDate },
    });
    const totalUsers = await User.countDocuments();

    // Get file uploads from activity logs
    const currentUploads = await ActivityLog.countDocuments({
      action: 'upload',
      timestamp: { $gte: startDate },
    });
    const previousUploads = await ActivityLog.countDocuments({
      action: 'upload',
      timestamp: { $gte: previousStartDate, $lt: startDate },
    });

    // Get storage usage from file metadata
    const currentStorageStats = await FileMetadata.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalSize: { $sum: '$fileSize' },
        },
      },
    ]);

    const previousStorageStats = await FileMetadata.aggregate([
      {
        $match: {
          createdAt: { $gte: previousStartDate, $lt: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalSize: { $sum: '$fileSize' },
        },
      },
    ]);

    const totalStorageStats = await FileMetadata.aggregate([
      {
        $group: {
          _id: null,
          totalSize: { $sum: '$fileSize' },
        },
      },
    ]);

    // Get active users (users who uploaded files in the period)
    const currentActiveUsers = await ActivityLog.distinct('userId', {
      action: 'upload',
      timestamp: { $gte: startDate },
    });
    const previousActiveUsers = await ActivityLog.distinct('userId', {
      action: 'upload',
      timestamp: { $gte: previousStartDate, $lt: startDate },
    });

    // Get top users by activity
    const topUsers = await ActivityLog.aggregate([
      {
        $match: {
          action: 'upload',
          timestamp: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$userId',
          fileCount: { $sum: 1 },
          storageUsed: { $sum: '$fileSize' },
          lastActive: { $max: '$timestamp' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          userId: '$_id',
          userName: '$user.name',
          userEmail: '$user.email',
          fileCount: 1,
          storageUsed: 1,
          lastActive: 1,
        },
      },
      {
        $sort: { fileCount: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const currentStorage = currentStorageStats[0]?.totalSize || 0;
    const previousStorage = previousStorageStats[0]?.totalSize || 0;
    const totalStorage = totalStorageStats[0]?.totalSize || 0;

    const analytics = {
      userGrowth: {
        total: totalUsers,
        change: currentUsers - previousUsers,
        changePercent: calculateChange(currentUsers, previousUsers),
      },
      fileUploads: {
        total: currentUploads,
        change: currentUploads - previousUploads,
        changePercent: calculateChange(currentUploads, previousUploads),
      },
      storageUsage: {
        total: totalStorage,
        change: currentStorage - previousStorage,
        changePercent: calculateChange(currentStorage, previousStorage),
      },
      activeUsers: {
        total: currentActiveUsers.length,
        change: currentActiveUsers.length - previousActiveUsers.length,
        changePercent: calculateChange(currentActiveUsers.length, previousActiveUsers.length),
      },
      topUsers: topUsers.map(user => ({
        userId: user.userId.toString(),
        userName: user.userName,
        userEmail: user.userEmail,
        fileCount: user.fileCount,
        storageUsed: user.storageUsed,
        lastActive: user.lastActive.toISOString(),
      })),
    };

    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
});
