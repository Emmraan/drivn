'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Dropdown from '@/components/ui/Dropdown';
import { cn } from '@/utils/cn';
import {
  CloudIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  InformationCircleIcon,
  DocumentDuplicateIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface S3ConfigFormProps {
  onSave: (config: S3ConfigData) => Promise<void>;
  onTest: (config: S3ConfigData) => Promise<{ success: boolean; message: string }>;
  initialConfig?: Partial<S3ConfigData>;
  loading?: boolean;
}

export interface S3ConfigData {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}

const commonProviders = [
  { name: 'AWS S3', endpoint: '', region: 'us-east-1' },
  { name: 'Backblaze B2', endpoint: 'https://s3.us-west-004.backblazeb2.com', region: 'us-west-004' },
  { name: 'Wasabi', endpoint: 'https://s3.wasabisys.com', region: 'us-east-1' },
  { name: 'DigitalOcean Spaces', endpoint: 'https://nyc3.digitaloceanspaces.com', region: 'nyc3' },
  { name: 'TEBI', endpoint: 'https://s3.tebi.io', region: 'global' },
  { name: 'Custom', endpoint: '', region: '' },
];

export default function S3ConfigForm({ onSave, onTest, initialConfig, loading }: S3ConfigFormProps) {
  const [config, setConfig] = useState<S3ConfigData>({
    accessKeyId: initialConfig?.accessKeyId || '',
    secretAccessKey: initialConfig?.secretAccessKey || '',
    region: initialConfig?.region || '',
    bucketName: initialConfig?.bucketName || '',
    endpoint: initialConfig?.endpoint || '',
    forcePathStyle: initialConfig?.forcePathStyle || false,
  });

  const [showSecretKey, setShowSecretKey] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('Custom');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const provider = commonProviders.find(p => p.endpoint === config.endpoint);
    if (provider) {
      setSelectedProvider(provider.name);
    } else {
      setSelectedProvider('Custom');
    }
  }, [config.endpoint]);

  const handleProviderChange = (providerName: string) => {
    const provider = commonProviders.find(p => p.name === providerName);
    if (provider) {
      setConfig(prev => ({
        ...prev,
        endpoint: provider.endpoint,
        region: provider.region,
      }));
      setSelectedProvider(providerName);
    }
  };

  const handleInputChange = (field: keyof S3ConfigData, value: string | boolean) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setTestResult(null);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const result = await onTest(config);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to test connection. Please try again.',
        error: error as string
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      await onSave(config);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
  const codeText = `<?xml version='1.0' encoding='UTF-8'?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
    <CORSRule>
        <AllowedOrigin>${APP_URL}</AllowedOrigin>
        <AllowedMethod>HEAD</AllowedMethod>
        <AllowedMethod>GET</AllowedMethod>
        <AllowedMethod>POST</AllowedMethod>
        <AllowedMethod>PUT</AllowedMethod>
        <AllowedMethod>DELETE</AllowedMethod>
        <AllowedHeader>*</AllowedHeader>
        <MaxAgeSeconds>3000</MaxAgeSeconds>
    </CORSRule>
</CORSConfiguration>`;
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const isFormValid = config.accessKeyId && config.secretAccessKey && config.region && config.bucketName;

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <CloudIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              S3 Storage Configuration
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure your S3-compatible storage credentials
            </p>
          </div>
        </div>

        {/* Provider Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Storage Provider
          </label>
          <Dropdown
            options={commonProviders.map(provider => ({
              value: provider.name,
              label: provider.name
            }))}
            value={selectedProvider}
            onChange={handleProviderChange}
            placeholder="Select a storage provider"
          />
        </div>

        {/* Access Key ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Access Key ID *
          </label>
          <input
            type="text"
            value={config.accessKeyId}
            onChange={(e) => handleInputChange('accessKeyId', e.target.value)}
            placeholder="Enter your access key ID"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        {/* Secret Access Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Secret Access Key *
          </label>
          <div className="relative">
            <input
              type={showSecretKey ? 'text' : 'password'}
              value={config.secretAccessKey}
              onChange={(e) => handleInputChange('secretAccessKey', e.target.value)}
              placeholder="Enter your secret access key"
              className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowSecretKey(!showSecretKey)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showSecretKey ? (
                <EyeSlashIcon className="h-5 w-5 text-gray-400" />
              ) : (
                <EyeIcon className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Region */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Region *
          </label>
          <input
            type="text"
            value={config.region}
            onChange={(e) => handleInputChange('region', e.target.value)}
            placeholder="e.g., us-east-1"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        {/* Bucket */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bucket Name *
          </label>
          <input
            type="text"
            value={config.bucketName}
            onChange={(e) => handleInputChange('bucketName', e.target.value)}
            placeholder="Enter your bucket name"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        {/* Endpoint (for non-AWS providers) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Endpoint URL
          </label>
          <input
            type="text"
            value={config.endpoint}
            onChange={(e) => handleInputChange('endpoint', e.target.value)}
            placeholder="Leave empty for AWS S3"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Only required for non-AWS S3 providers
          </p>
        </div>

        {/* Force Path Style */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="forcePathStyle"
            checked={config.forcePathStyle}
            onChange={(e) => handleInputChange('forcePathStyle', e.target.checked)}
            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          />
          <label htmlFor="forcePathStyle" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            Force path-style addressing
          </label>
        </div>

        {/* Test Result */}
        {testResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'p-4 rounded-lg flex items-start space-x-3',
              testResult.success
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            )}
          >
            {testResult.success ? (
              <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            ) : (
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className={cn(
                'text-sm font-medium',
                testResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
              )}>
                {testResult.success ? 'Connection Successful' : 'Connection Failed'}
              </p>
              <p className={cn(
                'text-sm mt-1',
                testResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
              )}>
                {testResult.message}
              </p>
            </div>
          </motion.div>
        )}

        {/* CORS Configuration */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row items-start space-y-3 sm:space-y-0 sm:space-x-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-700 dark:text-yellow-300 w-full overflow-x-auto">
              <p className="font-medium mb-2">Required CORS Configuration</p>
              <p className="mb-3">
                To prevent CORS errors, add this configuration to your S3 bucket CORS policy:
              </p>
              <div className="relative bg-gray-900 dark:bg-gray-800 rounded-md p-3 font-mono text-xs text-gray-100 overflow-x-auto max-w-full">
                <button
                  onClick={handleCopy}
                  className="absolute top-1 right-1 bg-gray-700 hover:bg-gray-600 text-white text-xs px-2 py-1 rounded transition-all duration-300"
                >
                  {copied ? (
                    <span className="flex items-center gap-1">
                      <CheckIcon className="h-4 w-4" />
                      Copied!
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <DocumentDuplicateIcon className="h-4 w-4" />
                      Copy
                    </span>
                  )}
                </button>
                <code className="whitespace-pre max-w-full">{codeText}</code>
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <InformationCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Security Note</p>
              <p>
                Your credentials are encrypted and stored securely. They are only used for file operations
                and are never transmitted in plain text.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-4">
          <Button
            onClick={handleTest}
            variant="outline"
            disabled={!isFormValid || testing || loading}
            loading={testing}
          >
            Test Connection
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isFormValid || !testResult?.success || saving || loading}
            loading={saving}
          >
            Save Configuration
          </Button>
        </div>
      </div>
    </Card>
  );
}
