'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  XMarkIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';

interface S3CreateFolderProps {
  isOpen: boolean;
  onClose: () => void;
  parentPath: string;
  onFolderCreated: () => void;
}

export default function S3CreateFolder({ isOpen, onClose, parentPath, onFolderCreated }: S3CreateFolderProps) {
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Folder name is required');
      return;
    }

    // Validate folder name
    const trimmedName = name.trim();
    if (trimmedName.length > 255) {
      setError('Folder name must be less than 255 characters');
      return;
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(trimmedName)) {
      setError('Folder name contains invalid characters');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const response = await fetch('/api/s3-folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          parentPath: parentPath || '',
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Reset form and close modal
        setName('');
        onFolderCreated();
        onClose();
      } else {
        setError(result.message || 'Failed to create folder');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setName('');
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="backdrop-blur-md rounded-lg shadow-xl w-full max-w-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Create New Folder
          </h2>
          <button
            onClick={handleClose}
            disabled={isCreating}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Location Info */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center">
              <FolderIcon className="h-5 w-5 text-primary-500 mr-2" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Creating in: {parentPath || 'root'}
              </span>
            </div>
          </div>

          {/* Folder Name Input */}
          <div>
            <label htmlFor="folderName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Folder Name
            </label>
            <input
              id="folderName"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="Enter folder name"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={isCreating}
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>

          {/* Guidelines */}
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>• Folder names cannot contain: &lt; &gt; : &quot; / \ | ? *</p>
            <p>• Maximum length: 255 characters</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
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
              leftIcon={<FolderIcon className="h-4 w-4" />}
            >
              {isCreating ? 'Creating...' : 'Create Folder'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
