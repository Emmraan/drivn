import { NextResponse } from 'next/server';
import { requireAdmin } from '@/auth/middleware/adminMiddleware';
import connectDB from '@/utils/database';
import User from '@/auth/models/User';
import FileMetadata from '@/models/FileMetadata';

/**
 * GET /api/admin/storage/stats
 * Get storage statistics for admin dashboard
 */
export const GET = requireAdmin(async () => {
  try {
    await connectDB();

    // Get total users
    const totalUsers = await User.countDocuments();

    // Get total files and storage
    const fileStats = await FileMetadata.aggregate([
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalStorageUsed: { $sum: '$fileSize' },
        },
      },
    ]);

    // Folders are now virtual in S3, not tracked separately
    const totalFolders = 0;



    // Get storage by user
    const storageByUser = await FileMetadata.aggregate([
      {
        $group: {
          _id: '$userId',
          storageUsed: { $sum: '$fileSize' },
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
          bucketType: 'user',
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
      storageByUser: storageByUser.map((user) => ({
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
