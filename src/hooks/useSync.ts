import { useState, useEffect, useCallback } from 'react';

interface SyncStatus {
  isActive: boolean;
  userId?: string;
}

interface SyncResult {
  success: boolean;
  message: string;
  stats?: any;
  report?: any;
}

export function useSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ isActive: false });
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  // Check periodic sync status
  const checkSyncStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/sync/periodic');
      const data = await response.json();
      
      if (data.success) {
        setSyncStatus(data.data);
      }
    } catch (error) {
      console.error('Error checking sync status:', error);
    }
  }, []);

  // Start periodic sync
  const startPeriodicSync = useCallback(async (interval?: number) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/sync/periodic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', interval }),
      });

      const result = await response.json();
      if (result.success) {
        await checkSyncStatus();
      }
      return result;
    } catch (error) {
      console.error('Error starting periodic sync:', error);
      return { success: false, message: 'Failed to start periodic sync' };
    } finally {
      setIsLoading(false);
    }
  }, [checkSyncStatus]);

  // Stop periodic sync
  const stopPeriodicSync = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/sync/periodic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });

      const result = await response.json();
      if (result.success) {
        await checkSyncStatus();
      }
      return result;
    } catch (error) {
      console.error('Error stopping periodic sync:', error);
      return { success: false, message: 'Failed to stop periodic sync' };
    } finally {
      setIsLoading(false);
    }
  }, [checkSyncStatus]);

  // Perform immediate sync
  const performSync = useCallback(async (action: 'sync' | 'full' | 'import' | 'folders' | 'check' = 'full') => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();
      setLastSyncResult(result);
      return result;
    } catch (error) {
      console.error('Error performing sync:', error);
      const errorResult = { success: false, message: 'Failed to perform sync' };
      setLastSyncResult(errorResult);
      return errorResult;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-check sync status on mount
  useEffect(() => {
    checkSyncStatus();
  }, [checkSyncStatus]);

  return {
    syncStatus,
    isLoading,
    lastSyncResult,
    startPeriodicSync,
    stopPeriodicSync,
    performSync,
    checkSyncStatus,
  };
}

// Admin hook for managing sync across all users
export function useAdminSync() {
  const [allUsersStatus, setAllUsersStatus] = useState<{ activeUsers: number; users: any[] }>({ 
    activeUsers: 0, 
    users: [] 
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<any>(null);

  // Check sync status for all users
  const checkAllUsersStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/sync');
      const data = await response.json();
      
      if (data.success) {
        setAllUsersStatus(data.data);
      }
    } catch (error) {
      console.error('Error checking admin sync status:', error);
    }
  }, []);

  // Start sync for all users
  const startAllUsersSync = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start-all' }),
      });

      const result = await response.json();
      if (result.success) {
        await checkAllUsersStatus();
      }
      return result;
    } catch (error) {
      console.error('Error starting sync for all users:', error);
      return { success: false, message: 'Failed to start sync for all users' };
    } finally {
      setIsLoading(false);
    }
  }, [checkAllUsersStatus]);

  // Stop sync for all users
  const stopAllUsersSync = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop-all' }),
      });

      const result = await response.json();
      if (result.success) {
        await checkAllUsersStatus();
      }
      return result;
    } catch (error) {
      console.error('Error stopping sync for all users:', error);
      return { success: false, message: 'Failed to stop sync for all users' };
    } finally {
      setIsLoading(false);
    }
  }, [checkAllUsersStatus]);

  // Sync all users immediately
  const syncAllUsersNow = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync-all-now' }),
      });

      const result = await response.json();
      setLastSyncResult(result);
      return result;
    } catch (error) {
      console.error('Error syncing all users:', error);
      const errorResult = { success: false, message: 'Failed to sync all users' };
      setLastSyncResult(errorResult);
      return errorResult;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-check status on mount
  useEffect(() => {
    checkAllUsersStatus();
  }, [checkAllUsersStatus]);

  return {
    allUsersStatus,
    isLoading,
    lastSyncResult,
    startAllUsersSync,
    stopAllUsersSync,
    syncAllUsersNow,
    checkAllUsersStatus,
  };
}
