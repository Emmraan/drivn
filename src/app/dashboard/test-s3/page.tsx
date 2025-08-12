'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  PlayIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function TestS3Page() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<{
    success: boolean;
    message: string;
    logs?: string[];
  } | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    setResults(null);

    try {
      const response = await fetch('/api/test-s3-direct');
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults({
        success: false,
        message: error instanceof Error ? error.message : 'Test failed',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = () => {
    if (isRunning) {
      return <ClockIcon className="h-6 w-6 text-blue-500 animate-spin" />;
    }
    if (results?.success) {
      return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
    }
    if (results && !results.success) {
      return <ExclamationCircleIcon className="h-6 w-6 text-red-500" />;
    }
    return null;
  };

  const getStatusText = () => {
    if (isRunning) return 'Running tests...';
    if (results?.success) return 'All tests passed!';
    if (results && !results.success) return 'Tests failed';
    return 'Ready to run tests';
  };

  const getStatusColor = () => {
    if (isRunning) return 'text-blue-600';
    if (results?.success) return 'text-green-600';
    if (results && !results.success) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          S3 Direct Integration Tests
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Test the S3-direct file management functionality
        </p>
      </div>

      {/* Test Runner */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Integration Test Suite
              </h3>
              <p className={`text-sm ${getStatusColor()}`}>
                {getStatusText()}
              </p>
            </div>
          </div>
          
          <Button
            variant="primary"
            onClick={runTests}
            disabled={isRunning}
            leftIcon={<PlayIcon className="h-4 w-4" />}
          >
            {isRunning ? 'Running...' : 'Run Tests'}
          </Button>
        </div>

        {/* Test Description */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
            Tests Include:
          </h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• File listing and pagination</li>
            <li>• File upload functionality</li>
            <li>• File search capabilities</li>
            <li>• Download URL generation</li>
            <li>• Storage statistics calculation</li>
            <li>• File deletion</li>
            <li>• Cache functionality</li>
          </ul>
        </div>

        {/* Results */}
        {results && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-lg p-4 ${
              results.success
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-start space-x-3">
              {results.success ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
              ) : (
                <ExclamationCircleIcon className="h-5 w-5 text-red-500 mt-0.5" />
              )}
              <div className="flex-1">
                <h4 className={`font-medium ${
                  results.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                }`}>
                  {results.success ? 'Tests Completed Successfully' : 'Tests Failed'}
                </h4>
                <p className={`text-sm mt-1 ${
                  results.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                }`}>
                  {results.message}
                </p>
                
                {/* Test Logs */}
                {results.logs && results.logs.length > 0 && (
                  <div className="mt-4">
                    <h5 className={`text-sm font-medium mb-2 ${
                      results.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                    }`}>
                      Test Output:
                    </h5>
                    <div className="bg-white dark:bg-gray-900 rounded border p-3 max-h-60 overflow-y-auto">
                      <pre className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                        {results.logs.join('\n')}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </Card>

      {/* Test Environment Notice */}
      <Card className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
        <div className="flex items-start space-x-3">
          <ExclamationCircleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
              Test Environment Notice
            </h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              These tests will create and delete files in your S3 bucket. Make sure you&apos;re using a test environment
              or a dedicated test bucket. The tests will clean up after themselves, but it&apos;s recommended to run
              them in a safe environment.
            </p>
          </div>
        </div>
      </Card>

      {/* Quick Links */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Links
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/dashboard/files-s3"
            className="block p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <h4 className="font-medium text-gray-900 dark:text-white">S3 File Manager</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Test the new S3-direct file management interface
            </p>
          </a>
          
          <a
            href="/dashboard/analytics-s3"
            className="block p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <h4 className="font-medium text-gray-900 dark:text-white">S3 Analytics</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              View storage analytics calculated from S3
            </p>
          </a>
        </div>
      </Card>
    </div>
  );
}
