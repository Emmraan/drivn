import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/middleware/authMiddleware';
import connectDB from '@/utils/database';
import File from '@/models/File';
import Folder from '@/models/Folder';
import { Types } from 'mongoose';

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

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    // Get basic stats
    const [totalFiles, totalFolders, totalDownloads] = await Promise.all([
      File.countDocuments({ userId: new Types.ObjectId(user._id) }),
      Folder.countDocuments({ userId: new Types.ObjectId(user._id) }),
      File.aggregate([
        { $match: { userId: new Types.ObjectId(user._id) } },
        { $group: { _id: null, totalDownloads: { $sum: '$downloadCount' } } }
      ]).then(result => result[0]?.totalDownloads || 0),
    ]);

    // Get storage used
    const storageStats = await File.aggregate([
      { $match: { userId: new Types.ObjectId(user._id) } },
      { $group: { _id: null, totalSize: { $sum: '$size' } } }
    ]);
    const storageUsed = storageStats[0]?.totalSize || 0;

    // Get recent activity (last 10 activities)
    const recentFiles = await File.find({ 
      userId: new Types.ObjectId(user._id),
      createdAt: { $gte: startDate }
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('name createdAt size mimeType');

    const recentActivity = recentFiles.map(file => ({
      type: 'upload' as const,
      fileName: file.name,
      timestamp: file.createdAt.toISOString(),
      size: file.size,
      mimeType: file.mimeType,
    }));

    // Get monthly stats for the last 6 months
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    
    const monthlyStats = await File.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(user._id),
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          uploads: { $sum: 1 },
          storage: { $sum: '$size' },
          downloads: { $sum: '$downloadCount' }
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

    // Get file type distribution
    const fileTypeStats = await File.aggregate([
      { $match: { userId: new Types.ObjectId(user._id) } },
      {
        $group: {
          _id: {
            $cond: [
              { $regexMatch: { input: '$mimeType', regex: /^image\// } },
              'Images',
              {
                $cond: [
                  { $regexMatch: { input: '$mimeType', regex: /^video\// } },
                  'Videos',
                  {
                    $cond: [
                      { $regexMatch: { input: '$mimeType', regex: /^audio\// } },
                      'Audio',
                      {
                        $cond: [
                          { $regexMatch: { input: '$mimeType', regex: /pdf/ } },
                          'Documents',
                          'Other'
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          },
          count: { $sum: 1 },
          size: { $sum: '$size' }
        }
      }
    ]);

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
