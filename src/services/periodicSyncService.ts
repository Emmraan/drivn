import { SyncService } from './syncService';
import connectDB from '@/utils/database';
import User from '@/auth/models/User';

/**
 * Periodic Sync Service
 * Handles background synchronization tasks
 */
export class PeriodicSyncService {
  private static instance: PeriodicSyncService;
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEFAULT_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): PeriodicSyncService {
    if (!PeriodicSyncService.instance) {
      PeriodicSyncService.instance = new PeriodicSyncService();
    }
    return PeriodicSyncService.instance;
  }

  /**
   * Start periodic sync for a user
   */
  public startUserSync(userId: string, intervalMs: number = this.DEFAULT_SYNC_INTERVAL): void {
    // Clear existing interval if any
    this.stopUserSync(userId);

    const interval = setInterval(async () => {
      try {
        console.log(`Running periodic sync for user: ${userId}`);
        const result = await SyncService.performFullSync(userId);
        
        if (!result.success) {
          console.error(`Periodic sync failed for user ${userId}:`, result.message);
        } else {
          console.log(`Periodic sync completed for user ${userId}:`, result.message);
        }
      } catch (error) {
        console.error(`Periodic sync error for user ${userId}:`, error);
      }
    }, intervalMs);

    this.syncIntervals.set(userId, interval);
    console.log(`Started periodic sync for user ${userId} with interval ${intervalMs}ms`);
  }

  /**
   * Stop periodic sync for a user
   */
  public stopUserSync(userId: string): void {
    const interval = this.syncIntervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.syncIntervals.delete(userId);
      console.log(`Stopped periodic sync for user: ${userId}`);
    }
  }

  /**
   * Start periodic sync for all active users
   */
  public async startAllUsersSyncs(): Promise<void> {
    try {
      await connectDB();
      
      // Get all users who have S3 configuration
      const users = await User.find({
        $or: [
          { 's3Config.bucket': { $exists: true, $ne: null } },
          { canUseDrivnS3: true }
        ]
      }).select('_id');

      console.log(`Starting periodic sync for ${users.length} users`);

      for (const user of users) {
        this.startUserSync(user._id.toString());
      }
    } catch (error) {
      console.error('Error starting periodic syncs for all users:', error);
    }
  }

  /**
   * Stop all periodic syncs
   */
  public stopAllSyncs(): void {
    for (const [userId, interval] of this.syncIntervals) {
      clearInterval(interval);
      console.log(`Stopped periodic sync for user: ${userId}`);
    }
    this.syncIntervals.clear();
  }

  /**
   * Get sync status for all users
   */
  public getSyncStatus(): { userId: string; isActive: boolean }[] {
    const status: { userId: string; isActive: boolean }[] = [];
    
    for (const userId of this.syncIntervals.keys()) {
      status.push({ userId, isActive: true });
    }

    return status;
  }

  /**
   * Perform immediate sync for all users
   */
  public async syncAllUsersNow(): Promise<{ success: boolean; results: any[] }> {
    try {
      await connectDB();
      
      const users = await User.find({
        $or: [
          { 's3Config.bucket': { $exists: true, $ne: null } },
          { canUseDrivnS3: true }
        ]
      }).select('_id');

      const results = await Promise.allSettled(
        users.map(user => SyncService.performFullSync(user._id.toString()))
      );

      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const totalCount = results.length;

      return {
        success: successCount === totalCount,
        results: results.map((result, index) => ({
          userId: users[index]._id.toString(),
          status: result.status,
          result: result.status === 'fulfilled' ? result.value : { error: result.reason }
        }))
      };
    } catch (error) {
      console.error('Error syncing all users:', error);
      return {
        success: false,
        results: []
      };
    }
  }
}

// Export singleton instance
export const periodicSyncService = PeriodicSyncService.getInstance();
