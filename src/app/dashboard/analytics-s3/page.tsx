'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  DocumentIcon,
  FolderIcon,
  CloudArrowUpIcon,
  ChartBarIcon,
  ArrowPathIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/SkeletonLoader';
import { useRouter } from 'next/navigation';

interface AnalyticsData {
  totalFiles: number;
  totalFolders: number;
  totalDownloads: number;
  storageUsed: number;
  recentActivity: Array<{
    type: 'upload';
    fileName: string;
    timestamp: string;
    size: number;
    mimeType?: string;
  }>;
  monthlyStats: Array<{
    month: string;
    uploads: number;
    downloads: number;
    storageAdded: number;
  }>;
  fileTypeStats: Array<{
    _id: string;
    count: number;
    size: number;
  }>;
  timeRange: string;
}

export default function S3AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [hasS3Config, setHasS3Config] = useState(false);
  const router = useRouter();

  const loadAnalytics = useCallback(async (range: string = timeRange) => {
    setLoading(true);
    setError(null);

    try {
      const [analyticsResponse, configResponse] = await Promise.all([
        fetch(`/api/s3-analytics?timeRange=${range}`),
        fetch('/api/s3-config'),
      ]);

      const analyticsResult = await analyticsResponse.json();
      const configResult = await configResponse.json();

      if (configResult.success) {
        setHasS3Config(configResult.hasConfig);
      }

      if (analyticsResult.success) {
        setData(analyticsResult.data);
      } else {
        setError(analyticsResult.message || 'Failed to load analytics');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
    loadAnalytics(range);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getFileTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'Images': 'bg-blue-500',
      'Videos': 'bg-red-500',
      'Audio': 'bg-green-500',
      'Documents': 'bg-yellow-500',
      'Other': 'bg-gray-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            S3 Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Storage analytics calculated directly from S3
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadAnalytics()}
            leftIcon={<ArrowPathIcon className="h-4 w-4" />}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Range:</span>
        {['7d', '30d', '90d'].map((range) => (
          <Button
            key={range}
            variant={timeRange === range ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => handleTimeRangeChange(range)}
            disabled={loading}
          >
            {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
          </Button>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <Card className="p-6">
          <div className="text-center">
            <div className="text-red-500 mb-2">
              <ChartBarIcon className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Failed to Load Analytics
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <Button onClick={() => loadAnalytics()} variant="primary">
              Try Again
            </Button>
          </div>
        </Card>
      )}

      {/* Loading State */}
      {loading && !data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-24" />
            </Card>
          ))}
        </div>
      )}

      {/* Analytics Content */}
      {data && hasS3Config && (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <DocumentIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Files</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatNumber(data.totalFiles)}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <FolderIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Folders</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatNumber(data.totalFolders)}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <CloudArrowUpIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Storage Used</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatBytes(data.storageUsed)}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                    <ChartBarIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Downloads</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatNumber(data.totalDownloads)}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* File Type Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                File Type Distribution
              </h3>
              
              {data.fileTypeStats.length > 0 ? (
                <div className="space-y-4">
                  {data.fileTypeStats.map((stat) => {
                    const percentage = data.totalFiles > 0 ? (stat.count / data.totalFiles) * 100 : 0;
                    return (
                      <div key={stat._id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full ${getFileTypeColor(stat._id)} mr-3`} />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {stat._id}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {stat.count} files
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {formatBytes(stat.size)}
                          </span>
                          <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getFileTypeColor(stat._id)}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white w-12 text-right">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No files to analyze</p>
                </div>
              )}
            </Card>
          </motion.div>

          {/* Note about S3 Limitations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-start">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg mr-4">
                  <ChartBarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    S3 Direct Analytics
                  </h3>
                  <p className="text-blue-800 dark:text-blue-200 text-sm">
                    These analytics are calculated directly from your S3 bucket contents.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </>
      )}

      {!loading && !hasS3Config && (
        <Card className="p-6">
          <div className="text-center py-8">
            <XCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Storage Configured
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You need to configure your S3 storage to start using DRIVN.
            </p>
            <Button
              variant="primary"
              onClick={() => router.push('/dashboard/settings')}
            >
              Configure Storage
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
