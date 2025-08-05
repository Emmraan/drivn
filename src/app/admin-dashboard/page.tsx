'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  UsersIcon,
  CloudIcon,
  DocumentIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { DashboardSkeleton } from '@/components/ui/SkeletonLoader';
import Card from '@/components/ui/Card';

interface AdminStats {
  totalUsers: number;
  totalFiles: number;
  totalStorage: number;
  drivnUsers: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      const data = await response.json();

      if (data.success) {
        const users = data.data.users;
        const totalUsers = users.length;
        const drivnUsers = users.filter((user: any) => user.canUseDrivnS3).length;
        const totalFiles = users.reduce((sum: number, user: any) => sum + user.stats.totalFiles, 0);
        const totalStorage = users.reduce((sum: number, user: any) => sum + user.stats.totalSize, 0);

        setStats({
          totalUsers,
          totalFiles,
          totalStorage,
          drivnUsers,
        });
      }
    } catch (error) {
      console.error('Error loading admin stats:', error);
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

  if (loading) {
    return <DashboardSkeleton />;
  }

  const statCards = [
    {
      name: 'Total Users',
      value: stats?.totalUsers.toLocaleString() || '0',
      icon: UsersIcon,
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'positive' as const,
    },
    {
      name: 'Total Files',
      value: stats?.totalFiles.toLocaleString() || '0',
      icon: DocumentIcon,
      color: 'bg-green-500',
      change: '+8%',
      changeType: 'positive' as const,
    },
    {
      name: 'Total Storage',
      value: formatBytes(stats?.totalStorage || 0),
      icon: CloudIcon,
      color: 'bg-purple-500',
      change: '+15%',
      changeType: 'positive' as const,
    },
    {
      name: 'DRIVN S3 Users',
      value: stats?.drivnUsers.toLocaleString() || '0',
      icon: ChartBarIcon,
      color: 'bg-orange-500',
      change: `${stats ? Math.round((stats.drivnUsers / stats.totalUsers) * 100) : 0}%`,
      changeType: 'neutral' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Admin Overview
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          System-wide statistics and management
        </p>
      </div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, type: 'spring', stiffness: 80 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.name}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span
                  className={`text-sm font-medium ${
                    stat.changeType === 'positive'
                      ? 'text-green-600 dark:text-green-400'
                      : stat.changeType === 'negative'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {stat.change}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                  {stat.name === 'DRIVN S3 Users' ? 'of total users' : 'from last month'}
                </span>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.a
            href="/admin-dashboard/users"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-300 dark:hover:border-primary-600 transition-colors group"
          >
            <UsersIcon className="h-8 w-8 text-primary-600 mb-2" />
            <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400">
              Manage Users
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              View and manage user accounts and permissions
            </p>
          </motion.a>

          <motion.a
            href="/admin-dashboard/storage"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-300 dark:hover:border-primary-600 transition-colors group"
          >
            <CloudIcon className="h-8 w-8 text-primary-600 mb-2" />
            <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400">
              Storage Management
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Monitor storage usage and manage S3 access
            </p>
          </motion.a>

          <motion.a
            href="/admin-dashboard/analytics"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-300 dark:hover:border-primary-600 transition-colors group"
          >
            <ChartBarIcon className="h-8 w-8 text-primary-600 mb-2" />
            <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400">
              Analytics
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              View detailed analytics and usage reports
            </p>
          </motion.a>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
