import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/auth/middleware/adminMiddleware';
import connectDB from '@/utils/database';
import User from '@/auth/models/User';
import File from '@/models/File';
import Folder from '@/models/Folder';

/**
 * GET /api/admin/storage/stats
 * Get storage statistics for admin dashboard
 */
export const GET = requireAdmin(async (request: NextRequest) => {
  try {
    await connectDB();

    // Get total users
    const totalUsers = await User.countDocuments();

    // Get total files and storage
    const fileStats = await File.aggregate([
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalStorageUsed: { $sum: '$size' },
        },
      },
    ]);

    // Get total folders
    const totalFolders = await Folder.countDocuments();

    // Get storage by bucket type
    const storageByBucket = await File.aggregate([
      {
        $group: {
          _id: '$bucketType',
          totalSize: { $sum: '$size' },
          fileCount: { $sum: 1 },
        },
      },
    ]);

    // Get storage by user
    const storageByUser = await File.aggregate([
      {
        $group: {
          _id: '$userId',
          storageUsed: { $sum: '$size' },
          fileCount: { $sum: 1 },
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
        $lookup: {
          from: 'folders',
          localField: '_id',
          foreignField: 'userId',
          as: 'folders',
        },
      },
      {
        $project: {
          userId: '$_id',
          userName: '$user.name',
          userEmail: '$user.email',
          storageUsed: 1,
          fileCount: 1,
          folderCount: { $size: '$folders' },
          bucketType: { $ifNull: ['$user.bucketType', 'platform'] },
        },
      },
      {
        $sort: { storageUsed: -1 },
      },
      {
        $limit: 50,
      },
    ]);

    const stats = {
      totalUsers,
      totalFiles: fileStats[0]?.totalFiles || 0,
      totalFolders,
      totalStorageUsed: fileStats[0]?.totalStorageUsed || 0,
      platformStorageUsed: storageByBucket.find(b => b._id === 'platform')?.totalSize || 0,
      userStorageUsed: storageByBucket.find(b => b._id === 'user')?.totalSize || 0,
      storageByUser: storageByUser.map(user => ({
        userId: user.userId.toString(),
        userName: user.userName,
        userEmail: user.userEmail,
        storageUsed: user.storageUsed,
        fileCount: user.fileCount,
        folderCount: user.folderCount,
        bucketType: user.bucketType,
      })),
    };

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Storage stats error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
});
