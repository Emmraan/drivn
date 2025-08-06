'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAuth } from '@/auth/context/AuthContext';
import { DashboardSkeleton } from '@/components/ui/SkeletonLoader';
import FileUpload from '@/components/dashboard/FileUpload';
import CreateFolder from '@/components/dashboard/CreateFolder';
import {
  CloudIcon,
  FolderIcon,
  ChartBarIcon,
  CogIcon,
  PlusIcon,
  ArrowUpTrayIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

const getQuickActions = (setShowUploadModal: (show: boolean) => void, setShowCreateFolderModal: (show: boolean) => void) => [
  {
    name: 'Upload Files',
    description: 'Upload files to your cloud storage',
    onClick: () => setShowUploadModal(true),
    icon: ArrowUpTrayIcon,
    color: 'bg-blue-500',
  },
  {
    name: 'Create Folder',
    description: 'Organize your files with folders',
    onClick: () => setShowCreateFolderModal(true),
    icon: PlusIcon,
    color: 'bg-green-500',
  },
  {
    name: 'Configure S3',
    description: 'Set up your S3 storage credentials',
    href: '/dashboard/settings',
    icon: CogIcon,
    color: 'bg-purple-500',
  },
];



interface DashboardStats {
  totalFiles: number;
  totalFolders: number;
  storageUsed: number;
  totalDownloads: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalFiles: 0,
    totalFolders: 0,
    storageUsed: 0,
    totalDownloads: 0,
  });

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics?timeRange=30d');
      const data = await response.json();

      if (data.success) {
        setStats({
          totalFiles: data.data.totalFiles,
          totalFolders: data.data.totalFolders,
          storageUsed: data.data.storageUsed,
          totalDownloads: data.data.totalDownloads,
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleUploadComplete = () => {
    loadDashboardData(); // Refresh dashboard data
    setShowUploadModal(false);
    // Redirect to files page after successful upload
    setTimeout(() => {
      router.push('/dashboard/files');
    }, 1000); // Small delay to show success state
  };

  const handleFolderCreated = () => {
    loadDashboardData(); // Refresh dashboard data
    setShowCreateFolderModal(false);
    // Redirect to files page after successful folder creation
    setTimeout(() => {
      router.push('/dashboard/files');
    }, 1000); // Small delay to show success state
  };

  const quickActions = getQuickActions(setShowUploadModal, setShowCreateFolderModal);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const dashboardStats = [
    {
      name: 'Total Files',
      value: stats.totalFiles.toString(),
      icon: DocumentIcon,
      change: 'Files uploaded',
      changeType: 'neutral' as const,
    },
    {
      name: 'Total Folders',
      value: stats.totalFolders.toString(),
      icon: FolderIcon,
      change: 'Folders created',
      changeType: 'neutral' as const,
    },
    {
      name: 'Storage Used',
      value: formatBytes(stats.storageUsed),
      icon: CloudIcon,
      change: 'Total storage',
      changeType: 'neutral' as const,
    },
    {
      name: 'Downloads',
      value: stats.totalDownloads.toString(),
      icon: ChartBarIcon,
      change: 'Total downloads',
      changeType: 'neutral' as const,
    },
  ];

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.name}!
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Here what happening with your cloud storage today.
          </p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        {dashboardStats.map((stat) => (
          <Card key={stat.name} className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <stat.icon className="h-8 w-8 text-gray-400" />
              </div>
              <div className="ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {stat.name}
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {stat.value}
                    </div>
                  </dd>
                  <dd className="text-sm text-gray-500 dark:text-gray-400">
                    {stat.change}
                  </dd>
                </dl>
              </div>
            </div>
          </Card>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => {
            const content = (
              <Card hover className="p-6 h-full">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 p-3 rounded-lg ${action.color}`}>
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {action.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Card>
            );

            if (action.href) {
              return (
                <Link key={action.name} href={action.href}>
                  {content}
                </Link>
              );
            } else {
              return (
                <button
                  key={action.name}
                  onClick={action.onClick}
                  className="text-left w-full"
                >
                  {content}
                </button>
              );
            }
          })}
        </div>
      </motion.div>

      {/* Getting Started */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="p-8 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20">
          <div className="text-center">
            <CloudIcon className="mx-auto h-12 w-12 text-primary-600 dark:text-primary-400" />
            <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
              Get Started with DRIVN
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Configure your S3-compatible storage credentials to start uploading and managing your files. 
              DRIVN works with any S3-compatible provider including AWS S3, Backblaze B2, Wasabi, and more.
            </p>
            <div className="mt-6">
              <Link href="/dashboard/settings">
                <Button size="lg">
                  Configure Storage
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Modals */}
      <FileUpload
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={handleUploadComplete}
      />

      <CreateFolder
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        onFolderCreated={handleFolderCreated}
      />
    </div>
  );
}
