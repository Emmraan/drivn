import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/auth/middleware/adminMiddleware';
import { periodicSyncService } from '@/services/periodicSyncService';

/**
 * POST /api/admin/sync
 * Admin endpoint to manage sync across all users
 */
export const POST = requireAdmin(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { action } = body;

    let result;

    switch (action) {
      case 'start-all':
        await periodicSyncService.startAllUsersSyncs();
        result = {
          success: true,
          message: 'Periodic sync started for all users',
        };
        break;

      case 'stop-all':
        periodicSyncService.stopAllSyncs();
        result = {
          success: true,
          message: 'All periodic syncs stopped',
        };
        break;

      case 'sync-all-now':
        const syncResult = await periodicSyncService.syncAllUsersNow();
        result = {
          success: syncResult.success,
          message: `Immediate sync completed for all users. ${syncResult.results.length} users processed.`,
          data: syncResult.results,
        };
        break;

      case 'status':
        const status = periodicSyncService.getSyncStatus();
        result = {
          success: true,
          data: {
            activeUsers: status.length,
            users: status,
          },
        };
        break;

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action. Valid actions: start-all, stop-all, sync-all-now, status' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Admin sync API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * GET /api/admin/sync
 * Get sync status for all users
 */
export const GET = requireAdmin(async (request: NextRequest) => {
  try {
    const status = periodicSyncService.getSyncStatus();

    return NextResponse.json({
      success: true,
      data: {
        activeUsers: status.length,
        users: status,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Admin sync status API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
});
