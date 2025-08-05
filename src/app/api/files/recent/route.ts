import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/middleware/authMiddleware';
import { FileService } from '@/services/fileService';

/**
 * GET /api/files/recent
 * Get recent files for dashboard
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
    const limit = parseInt(searchParams.get('limit') || '10');

    const recentFiles = await FileService.getRecentFiles(user._id, limit);

    return NextResponse.json({
      success: true,
      files: recentFiles,
    });
  } catch (error) {
    console.error('Recent files API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
