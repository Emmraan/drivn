import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/middleware/authMiddleware';
import { SyncService } from '@/services/syncService';

/**
 * POST /api/sync
 * Sync user's database with S3 bucket
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

    const body = await request.json();
    const { action = 'sync' } = body;

    let result;

    switch (action) {
      case 'sync':
        result = await SyncService.syncUserFiles(user._id);
        break;
      case 'check':
        result = await SyncService.performConsistencyCheck(user._id);
        break;
      case 'orphaned':
        result = await SyncService.findOrphanedS3Files(user._id);
        break;
      case 'import':
        result = await SyncService.importOrphanedS3Files(user._id);
        break;
      case 'folders':
        result = await SyncService.syncFoldersToS3(user._id);
        break;
      case 'folder-import':
        result = await SyncService.syncFoldersFromS3(user._id);
        break;
      case 'full':
        result = await SyncService.performFullSync(user._id);
        break;
      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action. Valid actions: sync, check, orphaned, import, folders, folder-import, full' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Sync API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
