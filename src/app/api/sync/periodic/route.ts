import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/auth/middleware/authMiddleware';
import { periodicSyncService } from '@/services/periodicSyncService';

/**
 * POST /api/sync/periodic
 * Manage periodic sync for the authenticated user
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
    const { action, interval } = body;

    let result;

    switch (action) {
      case 'start':
        periodicSyncService.startUserSync(user._id, interval);
        result = {
          success: true,
          message: `Periodic sync started for user ${user._id}`,
        };
        break;

      case 'stop':
        periodicSyncService.stopUserSync(user._id);
        result = {
          success: true,
          message: `Periodic sync stopped for user ${user._id}`,
        };
        break;

      case 'status':
        const status = periodicSyncService.getSyncStatus();
        const userStatus = status.find(s => s.userId === user._id);
        result = {
          success: true,
          data: {
            isActive: userStatus?.isActive || false,
            allUsers: status,
          },
        };
        break;

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action. Valid actions: start, stop, status' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Periodic sync API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync/periodic
 * Get periodic sync status for the authenticated user
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

    const status = periodicSyncService.getSyncStatus();
    const userStatus = status.find(s => s.userId === user._id);

    return NextResponse.json({
      success: true,
      data: {
        isActive: userStatus?.isActive || false,
        userId: user._id,
      },
    });
  } catch (error) {
    console.error('Periodic sync status API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
