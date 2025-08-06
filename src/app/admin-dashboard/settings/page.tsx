'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import TextArea from '@/components/ui/TextArea';
import { CardSkeleton } from '@/components/ui/SkeletonLoader';
import {
  CogIcon,
  CloudIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface AdminSettings {
  platformSettings: {
    siteName: string;
    siteDescription: string;
    maxFileSize: number;
    allowedFileTypes: string[];
    enableRegistration: boolean;
    requireEmailVerification: boolean;
  };
  storageSettings: {
    defaultStorageQuota: number;
    maxStorageQuota: number;
    enablePlatformStorage: boolean;
    enableUserStorage: boolean;
  };
  securitySettings: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    enableTwoFactor: boolean;
    passwordMinLength: number;
  };
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/settings');
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.settings);
      } else {
        setError(data.message || 'Failed to load settings');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Settings saved successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.message || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updatePlatformSetting = (key: keyof AdminSettings['platformSettings'], value: string | number | boolean | string[]) => {
    if (!settings) return;
    setSettings({
      ...settings,
      platformSettings: {
        ...settings.platformSettings,
        [key]: value,
      },
    });
  };

  const updateStorageSetting = (key: keyof AdminSettings['storageSettings'], value: number | boolean) => {
    if (!settings) return;
    setSettings({
      ...settings,
      storageSettings: {
        ...settings.storageSettings,
        [key]: value,
      },
    });
  };

  const updateSecuritySetting = (key: keyof AdminSettings['securitySettings'], value: number | boolean) => {
    if (!settings) return;
    setSettings({
      ...settings,
      securitySettings: {
        ...settings.securitySettings,
        [key]: value,
      },
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Admin Settings
          </h1>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Admin Settings
          </h1>
          <Button
            onClick={loadSettings}
            leftIcon={<ArrowPathIcon className="h-4 w-4" />}
            variant="outline"
          >
            Retry
          </Button>
        </div>

        <Card className="p-8 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Error Loading Settings
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Button onClick={loadSettings} variant="primary">
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
            Admin Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure platform settings and preferences
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            onClick={loadSettings}
            leftIcon={<ArrowPathIcon className="h-4 w-4" />}
            variant="outline"
          >
            Refresh
          </Button>
          <Button
            onClick={saveSettings}
            loading={saving}
            variant="primary"
          >
            Save Changes
          </Button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
        >
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700 dark:text-red-400">{error}</span>
          </div>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
        >
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
            <span className="text-green-700 dark:text-green-400">{success}</span>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6">
            <div className="flex items-center mb-6">
              <CogIcon className="h-6 w-6 text-blue-600 mr-3" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Platform Settings
              </h3>
            </div>
            
            <div className="space-y-4">
              <Input
                label="Site Name"
                value={settings?.platformSettings?.siteName || ''}
                onChange={(e) => updatePlatformSetting('siteName', e.target.value)}
                placeholder="Enter site name"
              />
              
              <TextArea
                label="Site Description"
                value={settings?.platformSettings?.siteDescription || ''}
                onChange={(e) => updatePlatformSetting('siteDescription', e.target.value)}
                placeholder="Enter site description"
                rows={3}
              />
              
              <Input
                label="Max File Size (MB)"
                type="number"
                value={settings?.platformSettings?.maxFileSize || 0}
                onChange={(e) => updatePlatformSetting('maxFileSize', parseInt(e.target.value))}
                placeholder="Enter max file size"
              />
              
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="enableRegistration"
                  checked={settings?.platformSettings?.enableRegistration || false}
                  onChange={(e) => updatePlatformSetting('enableRegistration', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="enableRegistration" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable User Registration
                </label>
              </div>
              
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="requireEmailVerification"
                  checked={settings?.platformSettings?.requireEmailVerification || false}
                  onChange={(e) => updatePlatformSetting('requireEmailVerification', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="requireEmailVerification" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Require Email Verification
                </label>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Storage Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6">
            <div className="flex items-center mb-6">
              <CloudIcon className="h-6 w-6 text-green-600 mr-3" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Storage Settings
              </h3>
            </div>
            
            <div className="space-y-4">
              <Input
                label="Default Storage Quota (GB)"
                type="number"
                value={settings?.storageSettings?.defaultStorageQuota || 0}
                onChange={(e) => updateStorageSetting('defaultStorageQuota', parseInt(e.target.value))}
                placeholder="Enter default quota"
              />
              
              <Input
                label="Maximum Storage Quota (GB)"
                type="number"
                value={settings?.storageSettings?.maxStorageQuota || 0}
                onChange={(e) => updateStorageSetting('maxStorageQuota', parseInt(e.target.value))}
                placeholder="Enter max quota"
              />
              
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="enablePlatformStorage"
                  checked={settings?.storageSettings?.enablePlatformStorage || false}
                  onChange={(e) => updateStorageSetting('enablePlatformStorage', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="enablePlatformStorage" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable Platform Storage
                </label>
              </div>
              
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="enableUserStorage"
                  checked={settings?.storageSettings?.enableUserStorage || false}
                  onChange={(e) => updateStorageSetting('enableUserStorage', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="enableUserStorage" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable User Storage
                </label>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Security Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="p-6">
            <div className="flex items-center mb-6">
              <ShieldCheckIcon className="h-6 w-6 text-purple-600 mr-3" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Security Settings
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Session Timeout (minutes)"
                type="number"
                value={settings?.securitySettings?.sessionTimeout || 0}
                onChange={(e) => updateSecuritySetting('sessionTimeout', parseInt(e.target.value))}
                placeholder="Enter session timeout"
              />
              
              <Input
                label="Max Login Attempts"
                type="number"
                value={settings?.securitySettings?.maxLoginAttempts || 0}
                onChange={(e) => updateSecuritySetting('maxLoginAttempts', parseInt(e.target.value))}
                placeholder="Enter max attempts"
              />
              
              <Input
                label="Password Min Length"
                type="number"
                value={settings?.securitySettings?.passwordMinLength || 0}
                onChange={(e) => updateSecuritySetting('passwordMinLength', parseInt(e.target.value))}
                placeholder="Enter min length"
              />
              
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="enableTwoFactor"
                  checked={settings?.securitySettings?.enableTwoFactor || false}
                  onChange={(e) => updateSecuritySetting('enableTwoFactor', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="enableTwoFactor" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable Two-Factor Authentication
                </label>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
