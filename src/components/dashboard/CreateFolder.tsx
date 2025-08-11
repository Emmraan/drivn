'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  XMarkIcon,
  FolderIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import { FolderCreationLoadingScreen } from '@/components/ui/LoadingScreens';

interface CreateFolderProps {
  isOpen: boolean;
  onClose: () => void;
  parentId?: string;
  onFolderCreated: () => void;
}

const FOLDER_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
];

export default function CreateFolder({ isOpen, onClose, parentId, onFolderCreated }: CreateFolderProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [error, setError] = useState('');
  const [selectedBucket, setSelectedBucket] = useState<'platform' | 'user'>('platform');
  const [userBucketAccess, setUserBucketAccess] = useState<{
    canUseDrivnS3: boolean;
    hasOwnS3Config: boolean;
  }>({ canUseDrivnS3: false, hasOwnS3Config: false });

  // Fetch user's bucket access information
  useEffect(() => {
    const fetchBucketAccess = async () => {
      try {
        const response = await fetch('/api/storage/stats');
        const data = await response.json();

        if (data.success && data.stats) {
          setUserBucketAccess({
            canUseDrivnS3: data.stats.canUseDrivnS3 || false,
            hasOwnS3Config: data.stats.hasOwnS3Config || false,
          });

          // Set default bucket selection
          if (data.stats.canUseDrivnS3) {
            setSelectedBucket('platform');
          } else if (data.stats.hasOwnS3Config) {
            setSelectedBucket('user');
          }
        }
      } catch (error) {
        console.error('Error fetching bucket access:', error);
      }
    };

    if (isOpen) {
      fetchBucketAccess();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Folder name is required');
      return;
    }

    setIsCreating(true);
    setShowLoadingScreen(true);
    setError('');

    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          parentId: parentId || null,
          color: selectedColor,
          description: description.trim() || undefined,
          ...(userBucketAccess.canUseDrivnS3 && userBucketAccess.hasOwnS3Config && {
            bucketType: selectedBucket
          }),
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Hide loading screen after a short delay to show completion
        setTimeout(() => {
          setShowLoadingScreen(false);
          onFolderCreated();
          onClose();
          // Reset form
          setName('');
          setDescription('');
          setSelectedColor(FOLDER_COLORS[0]);
        }, 1500);
      } else {
        setShowLoadingScreen(false);
        setError(result.message || 'Failed to create folder');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      setShowLoadingScreen(false);
      setError('Network error. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      onClose();
      setName('');
      setDescription('');
      setSelectedColor(FOLDER_COLORS[0]);
      setError('');
    }
  };

  if (!isOpen) return null;

  // Show loading screen during folder creation
  if (showLoadingScreen) {
    return <FolderCreationLoadingScreen message="Creating your new folder..." />;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-md transition-opacity" onClick={handleClose} />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md backdrop-blur-md rounded-xl shadow-xl border border-white/20 dark:border-gray-700/50"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Create New Folder
            </h2>
            <button
              onClick={handleClose}
              disabled={isCreating}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Folder Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Folder Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter folder name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={isCreating}
                maxLength={255}
              />
            </div>

            {/* Folder Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Folder Color
              </label>
              <div className="flex items-center gap-3">
                <FolderIcon 
                  className="h-8 w-8 transition-colors" 
                  style={{ color: selectedColor }}
                />
                <div className="grid grid-cols-5 gap-2">
                  {FOLDER_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        selectedColor === color
                          ? 'border-gray-900 dark:border-white scale-110'
                          : 'border-gray-300 dark:border-gray-600 hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      disabled={isCreating}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter folder description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                disabled={isCreating}
                maxLength={500}
              />
            </div>

            {/* Bucket Selection - only show if user has access to both */}
            {userBucketAccess.canUseDrivnS3 && userBucketAccess.hasOwnS3Config && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Storage Location
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedBucket('platform')}
                    disabled={isCreating}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedBucket === 'platform'
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600'
                    } ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-center mb-2">
                      <CloudArrowUpIcon className={`h-5 w-5 ${
                        selectedBucket === 'platform'
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-gray-400'
                      }`} />
                    </div>
                    <div className="text-center">
                      <p className={`text-sm font-medium ${
                        selectedBucket === 'platform'
                          ? 'text-primary-900 dark:text-primary-100'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        Platform Storage
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        DRIVN managed
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedBucket('user')}
                    disabled={isCreating}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedBucket === 'user'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                    } ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-center mb-2">
                      <CloudArrowUpIcon className={`h-5 w-5 ${
                        selectedBucket === 'user'
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-400'
                      }`} />
                    </div>
                    <div className="text-center">
                      <p className={`text-sm font-medium ${
                        selectedBucket === 'user'
                          ? 'text-blue-900 dark:text-blue-100'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        Personal S3
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Your bucket
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose} 
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!name.trim() || isCreating}
                loading={isCreating}
              >
                Create Folder
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
