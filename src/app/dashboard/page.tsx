'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAuth } from '@/auth/context/AuthContext';
import {
  CloudIcon,
  FolderIcon,
  ChartBarIcon,
  CogIcon,
  PlusIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

const quickActions = [
  {
    name: 'Upload Files',
    description: 'Upload files to your cloud storage',
    href: '/dashboard/files/upload',
    icon: ArrowUpTrayIcon,
    color: 'bg-blue-500',
  },
  {
    name: 'Create Folder',
    description: 'Organize your files with folders',
    href: '/dashboard/files/new-folder',
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

const stats = [
  {
    name: 'Total Files',
    value: '0',
    icon: FolderIcon,
    change: '+0%',
    changeType: 'neutral' as const,
  },
  {
    name: 'Storage Used',
    value: '0 GB',
    icon: CloudIcon,
    change: '0 GB available',
    changeType: 'neutral' as const,
  },
  {
    name: 'Bandwidth',
    value: '0 GB',
    icon: ChartBarIcon,
    change: 'This month',
    changeType: 'neutral' as const,
  },
];

export default function DashboardPage() {
  const { user } = useAuth();

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
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {stats.map((stat, index) => (
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
          {quickActions.map((action, index) => (
            <Link key={action.name} href={action.href}>
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
            </Link>
          ))}
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
    </div>
  );
}
