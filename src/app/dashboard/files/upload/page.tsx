'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowUpTrayIcon,
  XMarkIcon,
  DocumentIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowLeftIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [tags, setTags] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateId = () => Math.random().toString(36).substring(2, 15);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const uploadFiles: UploadFile[] = fileArray.map(file => ({
      file,
      id: generateId(),
      progress: 0,
      status: 'pending',
    }));

    setFiles(prev => [...prev, ...uploadFiles]);
  }, []);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      addFiles(selectedFiles);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      
      files.forEach(({ file }) => {
        formData.append('files', file);
      });

      if (selectedFolder) {
        formData.append('folderId', selectedFolder);
      }

      if (tags.trim()) {
        formData.append('tags', tags.trim());
      }

      // Update all files to uploading status
      setFiles(prev => prev.map(f => ({ ...f, status: 'uploading' as const })));

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        // Mark all as success
        setFiles(prev => prev.map(f => ({ ...f, status: 'success' as const, progress: 100 })));
        
        // Redirect to files page after a short delay
        setTimeout(() => {
          router.push('/dashboard/files');
        }, 2000);
      } else {
        // Handle partial success or complete failure
        setFiles(prev => prev.map(f => ({ 
          ...f, 
          status: 'error' as const, 
          error: result.message || 'Upload failed' 
        })));
      }
    } catch (error) {
      console.error('Upload error:', error);
      setFiles(prev => prev.map(f => ({ 
        ...f, 
        status: 'error' as const, 
        error: 'Network error' 
      })));
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const canUpload = files.length > 0 && !isUploading;
  const allSuccess = files.length > 0 && files.every(f => f.status === 'success');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
          >
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Upload Files
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Upload files to your storage
            </p>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <Card className="p-8">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            isDragOver
              ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500'
          }`}
        >
          <ArrowUpTrayIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <div>
            <p className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              Drop files here or click to browse
            </p>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Maximum file size: 100MB per file
            </p>
            <Button
              variant="primary"
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<ArrowUpTrayIcon className="h-5 w-5" />}
            >
              Choose Files
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </Card>

      {/* Upload Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Upload Options
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Destination Folder (optional)
              </label>
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Root folder</option>
                {/* TODO: Load actual folders from API */}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags (optional)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Enter tags separated by commas"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Upload Progress
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Files selected:</span>
              <span className="font-medium text-gray-900 dark:text-white">{files.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Total size:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatFileSize(files.reduce((sum, f) => sum + f.file.size, 0))}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <span className={`font-medium ${
                allSuccess ? 'text-green-600' : 
                isUploading ? 'text-blue-600' : 
                'text-gray-900 dark:text-white'
              }`}>
                {allSuccess ? 'Complete' : isUploading ? 'Uploading...' : 'Ready'}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Files to upload ({files.length})
            </h3>
            <Button
              variant="primary"
              onClick={uploadFiles}
              disabled={!canUpload}
              loading={isUploading}
              leftIcon={<ArrowUpTrayIcon className="h-4 w-4" />}
            >
              {allSuccess ? 'Upload Complete!' : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {files.map((uploadFile) => (
              <motion.div
                key={uploadFile.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center flex-1 min-w-0">
                  <DocumentIcon className="h-6 w-6 text-gray-400 mr-3 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {uploadFile.file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(uploadFile.file.size)}
                    </p>
                    {uploadFile.status === 'error' && uploadFile.error && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {uploadFile.error}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center ml-4">
                  {uploadFile.status === 'uploading' && (
                    <LoadingSpinner size="sm" />
                  )}
                  {uploadFile.status === 'success' && (
                    <CheckCircleIcon className="h-6 w-6 text-green-500" />
                  )}
                  {uploadFile.status === 'error' && (
                    <ExclamationCircleIcon className="h-6 w-6 text-red-500" />
                  )}
                  {uploadFile.status === 'pending' && (
                    <button
                      onClick={() => removeFile(uploadFile.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {allSuccess && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8"
        >
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Upload Complete!
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            All files have been uploaded successfully. Redirecting to files page...
          </p>
        </motion.div>
      )}
    </div>
  );
}
