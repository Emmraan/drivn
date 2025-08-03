'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/auth/context/AuthContext';
import S3ConfigForm, { S3ConfigData } from '@/components/dashboard/S3ConfigForm';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { SkeletonSettings } from '@/components/ui/Skeleton';
import {
  CogIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface S3ConfigStatus {
  hasConfig: boolean;
  config?: {
    region: string;
    bucket: string;
    endpoint?: string;
    forcePathStyle?: boolean;
  };
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [configStatus, setConfigStatus] = useState<S3ConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Load existing configuration
  useEffect(() => {
    loadS3Config();
  }, []);

  const loadS3Config = async () => {
    try {
      const response = await fetch('/api/s3-config', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setConfigStatus(data);
      } else {
        console.error('Failed to load S3 config');
        setConfigStatus({ hasConfig: false });
      }
    } catch (error) {
      console.error('Error loading S3 config:', error);
      setConfigStatus({ hasConfig: false });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (config: S3ConfigData) => {
    try {
      const response = await fetch('/api/s3-config/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(config),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Test connection error:', error);
      return {
        success: false,
        message: 'Failed to test connection. Please try again.',
      };
    }
  };

  const handleSaveConfig = async (config: S3ConfigData) => {
    try {
      const response = await fetch('/api/s3-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(config),
      });

      const result = await response.json();
      
      if (result.success) {
        setNotification({
          type: 'success',
          message: 'S3 configuration saved successfully!',
        });
        await loadS3Config(); // Reload config status
      } else {
        setNotification({
          type: 'error',
          message: result.message || 'Failed to save configuration',
        });
      }
    } catch (error) {
      console.error('Save config error:', error);
      setNotification({
        type: 'error',
        message: 'Failed to save configuration. Please try again.',
      });
    }
  };

  const handleDeleteConfig = async () => {
    if (!confirm('Are you sure you want to delete your S3 configuration? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/s3-config', {
        method: 'DELETE',
        credentials: 'include',
      });

      const result = await response.json();
      
      if (result.success) {
        setNotification({
          type: 'success',
          message: 'S3 configuration deleted successfully!',
        });
        await loadS3Config(); // Reload config status
      } else {
        setNotification({
          type: 'error',
          message: result.message || 'Failed to delete configuration',
        });
      }
    } catch (error) {
      console.error('Delete config error:', error);
      setNotification({
        type: 'error',
        message: 'Failed to delete configuration. Please try again.',
      });
    }
  };

  // Auto-hide notifications after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (loading) {
    return <SkeletonSettings />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center space-x-3 mb-8">
          <CogIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Settings
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Manage your storage configuration and account settings.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Notification */}
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`p-4 rounded-lg flex items-center space-x-3 ${
            notification.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
          ) : (
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
          )}
          <p className={`text-sm font-medium ${
            notification.type === 'success'
              ? 'text-green-800 dark:text-green-200'
              : 'text-red-800 dark:text-red-200'
          }`}>
            {notification.message}
          </p>
          <button
            onClick={() => setNotification(null)}
            className={`ml-auto text-sm underline ${
              notification.type === 'success'
                ? 'text-green-700 dark:text-green-300'
                : 'text-red-700 dark:text-red-300'
            }`}
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* Current Configuration Status */}
      {configStatus?.hasConfig && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <CheckCircleIcon className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                    S3 Configuration Active
                  </h3>
                  <div className="mt-2 text-sm text-green-700 dark:text-green-300 space-y-1">
                    <p><strong>Region:</strong> {configStatus.config?.region}</p>
                    <p><strong>Bucket:</strong> {configStatus.config?.bucket}</p>
                    {configStatus.config?.endpoint && (
                      <p><strong>Endpoint:</strong> {configStatus.config.endpoint}</p>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteConfig}
                leftIcon={<TrashIcon className="h-4 w-4" />}
                className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-600 dark:hover:bg-red-900/20"
              >
                Delete
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* S3 Configuration Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <S3ConfigForm
          onSave={handleSaveConfig}
          onTest={handleTestConnection}
          initialConfig={configStatus?.config}
          loading={loading}
        />
      </motion.div>
    </div>
  );
}
