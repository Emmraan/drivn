'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';
import { StatCardSkeleton, CardSkeleton } from '@/components/ui/SkeletonLoader';
import {
  ChartBarIcon,
  UsersIcon,
  DocumentIcon,
  CloudIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { logger } from "@/utils/logger";

interface AnalyticsData {
  userGrowth: {
    total: number;
    change: number;
    changePercent: number;
  };
  fileUploads: {
    total: number;
    change: number;
    changePercent: number;
  };
  storageUsage: {
    total: number;
    change: number;
    changePercent: number;
  };
  activeUsers: {
    total: number;
    change: number;
    changePercent: number;
  };
  dailyStats: Array<{
    date: string;
    users: number;
    uploads: number;
    storage: number;
  }>;
  topUsers: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    fileCount: number;
    storageUsed: number;
    lastActive: string;
  }>;
}

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const loadAnalytics = useCallback(async () => {
    if (!analytics) {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetch(`/api/admin/analytics?range=${timeRange}`);
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.analytics);
      } else {
        setError(data.message || 'Failed to load analytics data');
      }
    } catch (error) {
      logger.error('Error loading analytics:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [timeRange, analytics]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadAnalytics();
    }, analytics ? 1000 : 0);

    return () => clearTimeout(timeoutId);
  }, [timeRange, loadAnalytics, analytics]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analytics Dashboard
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analytics Dashboard
          </h1>
          <Button
            onClick={loadAnalytics}
            leftIcon={<ArrowPathIcon className="h-4 w-4" />}
            variant="outline"
          >
            Retry
          </Button>
        </div>

        <Card className="p-8 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Error Loading Analytics
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Button onClick={loadAnalytics} variant="primary">
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor platform usage and user activity
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Dropdown
            options={[
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' },
            ]}
            value={timeRange}
            onChange={(value) => setTimeRange(value as '7d' | '30d' | '90d')}
            placeholder="Select time range"
            className="w-40"
          />
          <Button
            onClick={loadAnalytics}
            leftIcon={<ArrowPathIcon className="h-4 w-4" />}
            variant="outline"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Users
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analytics?.userGrowth?.total?.toLocaleString() || 0}
                </p>
                <div className="flex items-center mt-2">
                  {(analytics?.userGrowth?.changePercent || 0) >= 0 ? (
                    <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm font-medium ${(analytics?.userGrowth?.changePercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {Math.abs(analytics?.userGrowth?.changePercent || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
              <UsersIcon className="h-8 w-8 text-blue-600" />
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  File Uploads
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analytics?.fileUploads?.total?.toLocaleString() || 0}
                </p>
                <div className="flex items-center mt-2">
                  {(analytics?.fileUploads?.changePercent || 0) >= 0 ? (
                    <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm font-medium ${(analytics?.fileUploads?.changePercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {Math.abs(analytics?.fileUploads?.changePercent || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
              <DocumentIcon className="h-8 w-8 text-green-600" />
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Storage Used
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatBytes(analytics?.storageUsage?.total || 0)}
                </p>
                <div className="flex items-center mt-2">
                  {(analytics?.storageUsage?.changePercent || 0) >= 0 ? (
                    <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm font-medium ${(analytics?.storageUsage?.changePercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {Math.abs(analytics?.storageUsage?.changePercent || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
              <CloudIcon className="h-8 w-8 text-purple-600" />
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Active Users
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analytics?.activeUsers?.total?.toLocaleString() || 0}
                </p>
                <div className="flex items-center mt-2">
                  {(analytics?.activeUsers?.changePercent || 0) >= 0 ? (
                    <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm font-medium ${(analytics?.activeUsers?.changePercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {Math.abs(analytics?.activeUsers?.changePercent || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
              <ChartBarIcon className="h-8 w-8 text-orange-600" />
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Top Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Top Users by Activity
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Most active users in the selected time period
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Files
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Storage Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Active
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {analytics?.topUsers?.map((user) => (
                  <tr key={user.userId} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.userName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {user.userEmail}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {user.fileCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatBytes(user.storageUsed)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(user.lastActive)}
                    </td>
                  </tr>
                )) || (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        No user data available
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
