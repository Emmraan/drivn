import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/middleware/authMiddleware';
import { FileService } from '@/services/fileService';

/**
 * GET /api/storage/stats
 * Get storage statistics for user
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

    const stats = await FileService.getStorageStats(user._id);

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Storage stats API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
