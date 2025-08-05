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
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface StorageStats {
  totalFiles: number;
  totalFolders: number;
  storageUsed: number;
  storageQuota: number;
  bucketType: 'user' | 'drivn' | 'mixed';
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

  const getUsagePercentage = () => {
    if (!stats || stats.storageQuota === 0) return 0;
    return Math.round((stats.storageUsed / stats.storageQuota) * 100);
  };

  const getUsageColor = () => {
    const percentage = getUsagePercentage();
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
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
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
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
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {stats ? formatBytes(stats.storageUsed) : '0 Bytes'} used of {stats ? formatBytes(stats.storageQuota) : '15 GB'}
            </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {getUsagePercentage()}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <motion.div
              className={`h-3 rounded-full ${getUsageColor()}`}
              initial={{ width: 0 }}
              animate={{ width: `${getUsagePercentage()}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          {getUsagePercentage() >= 90 && (
            <div className="flex items-center text-red-600 dark:text-red-400 text-sm">
              <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
              Storage is almost full. Consider upgrading your plan or cleaning up files.
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
