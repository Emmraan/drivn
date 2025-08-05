import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/auth/middleware/adminMiddleware';
import connectDB from '@/utils/database';
import User from '@/auth/models/User';
import File from '@/models/File';
import { Types } from 'mongoose';

/**
 * GET /api/admin/users
 * Get all users with their statistics
 */
export const GET = requireAdmin(async (request: NextRequest) => {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    // Build search query
    const searchQuery = search
      ? {
          $or: [
            { email: { $regex: search, $options: 'i' } },
            { name: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    // Get users with pagination
    const skip = (page - 1) * limit;
    const users = await User.find(searchQuery)
      .select('-password -s3Config.secretAccessKey')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalUsers = await User.countDocuments(searchQuery);

    // Get file statistics for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const fileStats = await File.aggregate([
          { $match: { userId: new Types.ObjectId(user._id) } },
          {
            $group: {
              _id: null,
              totalFiles: { $sum: 1 },
              totalSize: { $sum: '$size' },
              bucketTypes: { $addToSet: '$bucketType' },
            },
          },
        ]);

        const stats = fileStats[0] || { totalFiles: 0, totalSize: 0, bucketTypes: [] };
        
        let bucketType: 'user' | 'drivn' | 'mixed' = 'user';
        if (stats.bucketTypes.length > 1) {
          bucketType = 'mixed';
        } else if (stats.bucketTypes.includes('drivn')) {
          bucketType = 'drivn';
        }

        return {
          _id: user._id,
          email: user.email,
          name: user.name,
          provider: user.provider,
          emailVerified: user.emailVerified,
          canUseDrivnS3: user.canUseDrivnS3 || false,
          storageQuota: user.storageQuota,
          storageUsed: user.storageUsed,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          stats: {
            totalFiles: stats.totalFiles,
            totalSize: stats.totalSize,
            bucketType,
          },
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        users: usersWithStats,
        pagination: {
          page,
          limit,
          total: totalUsers,
          pages: Math.ceil(totalUsers / limit),
        },
      },
    });
  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
});
