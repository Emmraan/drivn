'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CloudIcon,
  ServerIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { StatCardSkeleton } from '@/components/ui/SkeletonLoader';

interface StorageStats {
  totalFiles: number;
  totalFolders: number;
  storageUsed: number;
  storageQuota: number;
  bucketType: 'user' | 'drivn' | 'mixed';
  platformStorageUsed?: number; // Storage used in platform bucket
  userStorageUsed?: number; // Storage used in user's own bucket
  canUseDrivnS3?: boolean; // Whether user has platform bucket access
  hasOwnS3Config?: boolean; // Whether user has their own S3 config
}

export default function StoragePage() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStorageStats();
  }, []);

  const loadStorageStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/storage/stats');
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading storage stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getBucketTypeInfo = () => {
    if (!stats) return { icon: ServerIcon, text: 'Unknown', color: 'text-gray-500' };
    
    switch (stats.bucketType) {
      case 'drivn':
        return { 
          icon: CheckCircleIcon, 
          text: 'DRIVN Managed Storage', 
          color: 'text-green-600' 
        };
      case 'user':
        return { 
          icon: ServerIcon, 
          text: 'Personal S3 Storage', 
          color: 'text-blue-600' 
        };
      case 'mixed':
        return { 
          icon: ExclamationTriangleIcon, 
          text: 'Mixed Storage Sources', 
          color: 'text-yellow-600' 
        };
      default:
        return { icon: XCircleIcon, text: 'No Storage Configured', color: 'text-red-600' };
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-48 animate-pulse"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64 animate-pulse"></div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <StatCardSkeleton />
            </Card>
          ))}
        </div>

        {/* Storage Chart Skeleton */}
        <Card className="animate-pulse">
          <div className="p-6 space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </Card>
      </div>
    );
  }

  const bucketInfo = getBucketTypeInfo();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Storage Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Monitor your storage usage and manage your S3 configuration
        </p>
      </div>

      {/* Storage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CloudIcon className="h-8 w-8 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Storage Used
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats ? formatBytes(stats.storageUsed) : '0 Bytes'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ServerIcon className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Storage Quota
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats ? formatBytes(stats.storageQuota) : '15 GB'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-purple-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Files
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.totalFiles.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <bucketInfo.icon className={`h-8 w-8 ${bucketInfo.color}`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Storage Type
              </p>
              <p className={`text-sm font-medium ${bucketInfo.color}`}>
                {bucketInfo.text}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Usage Progress */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Storage Usage
        </h2>
        <div className="space-y-6">
          {/* Platform Storage (only show progress bar if user has access and admin granted it) */}
          {stats?.canUseDrivnS3 && (stats.platformStorageUsed !== undefined) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Platform Storage (DRIVN Managed)
                </h3>
                <span className="text-xs px-2 py-1 bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 rounded-full">
                  Managed
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {formatBytes(stats.platformStorageUsed)} used of {formatBytes(stats.storageQuota)}
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {Math.round((stats.platformStorageUsed / stats.storageQuota) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <motion.div
                  className={`h-3 rounded-full ${
                    (stats.platformStorageUsed / stats.storageQuota) >= 0.9
                      ? 'bg-red-500'
                      : (stats.platformStorageUsed / stats.storageQuota) >= 0.7
                      ? 'bg-yellow-500'
                      : 'bg-primary-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((stats.platformStorageUsed / stats.storageQuota) * 100, 100)}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
              {(stats.platformStorageUsed / stats.storageQuota) >= 0.9 && (
                <div className="flex items-center text-red-600 dark:text-red-400 text-sm">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                  Platform storage is almost full. Consider cleaning up files or contact admin.
                </div>
              )}
            </div>
          )}

          {/* User's Own Storage (show as "X GB/NA" format without progress bar) */}
          {stats?.hasOwnS3Config && (stats.userStorageUsed !== undefined) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Personal S3 Storage
                </h3>
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                  Personal
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {formatBytes(stats.userStorageUsed)} / No Limit
                </span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  Unlimited
                </span>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  You&apos;re using your own S3 bucket with no storage limits imposed by DRIVN.
                </p>
              </div>
            </div>
          )}

          {/* Mixed Storage Scenario */}
          {stats?.bucketType === 'mixed' && stats?.canUseDrivnS3 && stats?.hasOwnS3Config && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Combined Storage Summary
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                  <p className="text-xs font-medium text-primary-700 dark:text-primary-300 mb-1">Platform</p>
                  <p className="text-sm font-semibold text-primary-900 dark:text-primary-100">
                    {formatBytes(stats.platformStorageUsed || 0)}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Personal</p>
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    {formatBytes(stats.userStorageUsed || 0)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* No Storage Configured */}
          {stats && !stats.canUseDrivnS3 && !stats.hasOwnS3Config && stats.bucketType !== 'user' && (
            <div className="text-center py-8">
              <XCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Storage Configured
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You need to configure your S3 storage or request platform access to start using DRIVN.
              </p>
              <Button
                variant="primary"
                onClick={() => window.location.href = '/dashboard/settings'}
              >
                Configure Storage
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Storage Actions */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Storage Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => window.location.href = '/dashboard/settings'}
          >
            <ServerIcon className="h-5 w-5 mr-2" />
            Configure S3 Settings
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => window.location.href = '/dashboard/files'}
          >
            <CloudIcon className="h-5 w-5 mr-2" />
            Manage Files
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={loadStorageStats}
          >
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Refresh Stats
          </Button>
        </div>
      </Card>
    </div>
  );
}
