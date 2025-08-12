'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpTrayIcon,
  XMarkIcon,
  DocumentIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import ProgressBar, { CircularProgress } from '@/components/ui/ProgressBar';
import { UploadLoadingScreen } from '@/components/ui/LoadingScreens';

interface FileUploadProps {
  isOpen: boolean;
  onClose: () => void;
  folderId?: string;
  onUploadComplete: () => void;
}

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export default function FileUpload({ isOpen, onClose, folderId, onUploadComplete }: FileUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [tags, setTags] = useState('');
  const [hasS3Config, setHasS3Config] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateId = () => Math.random().toString(36).substring(2, 15);

  // Check if user has S3 configuration
  useEffect(() => {
    const checkS3Config = async () => {
      try {
        const response = await fetch('/api/storage/stats');
        const data = await response.json();

        if (data.success && data.stats) {
          setHasS3Config(data.stats.hasOwnS3Config || false);
        }
      } catch (error) {
        console.error('Error checking S3 config:', error);
      }
    };

    if (isOpen) {
      checkS3Config();
    }
  }, [isOpen]);



  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const uploadFiles: UploadFile[] = fileArray.map(file => ({
      file,
      id: generateId(),
      progress: 0,
      status: 'pending' as const,
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
    setShowLoadingScreen(true);

    // Upload files one by one for better progress tracking
    for (const uploadFile of files) {
      try {
        // Update file to uploading status
        setFiles(prev => prev.map(f =>
          f.id === uploadFile.id
            ? { ...f, status: 'uploading' as const, progress: 0 }
            : f
        ));

        const formData = new FormData();
        formData.append('files', uploadFile.file);

        if (folderId) {
          formData.append('folderId', folderId);
        }

        if (tags.trim()) {
          formData.append('tags', tags.trim());
        }



        // Use XMLHttpRequest for progress tracking
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100);
              setFiles(prev => prev.map(f =>
                f.id === uploadFile.id
                  ? { ...f, progress }
                  : f
              ));
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const result = JSON.parse(xhr.responseText);
                if (result.success) {
                  setFiles(prev => prev.map(f =>
                    f.id === uploadFile.id
                      ? { ...f, status: 'success' as const, progress: 100 }
                      : f
                  ));
                  resolve();
                } else {
                  setFiles(prev => prev.map(f =>
                    f.id === uploadFile.id
                      ? { ...f, status: 'error' as const, error: result.message || 'Upload failed' }
                      : f
                  ));
                  reject(new Error(result.message || 'Upload failed'));
                }
              } catch (parseError) {
                setFiles(prev => prev.map(f =>
                  f.id === uploadFile.id
                    ? { ...f, status: 'error' as const, error: 'Invalid response' }
                    : f
                ));
                reject(parseError);
              }
            } else {
              setFiles(prev => prev.map(f =>
                f.id === uploadFile.id
                  ? { ...f, status: 'error' as const, error: `HTTP ${xhr.status}` }
                  : f
              ));
              reject(new Error(`HTTP ${xhr.status}`));
            }
          });

          xhr.addEventListener('error', () => {
            setFiles(prev => prev.map(f =>
              f.id === uploadFile.id
                ? { ...f, status: 'error' as const, error: 'Network error' }
                : f
            ));
            reject(new Error('Network error'));
          });

          xhr.open('POST', '/api/files/upload');
          xhr.send(formData);
        });

      } catch (error) {
        console.error(`Upload error for ${uploadFile.file.name}:`, error);
        // Error already handled in the promise
      }
    }

    setIsUploading(false);

    // Hide loading screen after a short delay to show completion
    setTimeout(() => {
      setShowLoadingScreen(false);
    }, 1000);

    // Check if all files were uploaded successfully
    const allSuccess = files.every(f => f.status === 'success');
    if (allSuccess) {
      // Close modal after a short delay
      setTimeout(() => {
        onUploadComplete();
        onClose();
        setFiles([]);
        setTags('');
      }, 2500);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const canUpload = files.length > 0 && !isUploading && hasS3Config;
  const allSuccess = files.length > 0 && files.every(f => f.status === 'success');

  if (!isOpen) return null;

  // Show loading screen during upload
  if (showLoadingScreen) {
    return <UploadLoadingScreen message="Uploading your files to the cloud..." />;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-md transition-opacity" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 80 }}
          className="relative w-full max-w-3xl  backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 dark:border-gray-700/50 overflow-hidden"
        >
          {/* Glassmorphism background overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-gray-100/20 dark:from-gray-800/20 dark:via-transparent dark:to-gray-900/20" />
          {/* Header */}
          <div className="relative z-10 flex items-center justify-between p-6 border-b border-white/20 dark:border-gray-700/50 backdrop-blur-sm">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Upload Files
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Share your files with beautiful progress tracking
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl hover:bg-white/20 dark:hover:bg-gray-700/50 transition-all duration-200 backdrop-blur-sm"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="relative z-10 p-6 space-y-6">
            {/* Drop Zone */}
            <motion.div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 backdrop-blur-md overflow-hidden ${isDragOver
                  ? 'border-primary-400/60 bg-gradient-to-br from-primary-50/60 to-primary-100/40 dark:from-primary-900/40 dark:to-primary-800/30 scale-105 shadow-lg'
                  : 'border-gray-300/40 dark:border-gray-600/40 hover:border-primary-400/50 dark:hover:border-primary-500/50 bg-gradient-to-br from-white/40 to-gray-50/30 dark:from-gray-800/40 dark:to-gray-900/30 hover:shadow-md'
                }`}
            >
              {/* Animated background gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary-400/10 via-transparent to-secondary-400/10 opacity-0 hover:opacity-100 transition-opacity duration-500" />

              <div className="relative z-10">
                <motion.div
                  animate={isDragOver ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 80 }}
                >
                  <ArrowUpTrayIcon className="mx-auto h-16 w-16 text-primary-500 dark:text-primary-400" />
                </motion.div>

                <div className="mt-6">
                  <p className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {isDragOver ? 'Drop files here!' : 'Upload your files'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Drag and drop files here, or click to browse
                  </p>
                  {!hasS3Config && (
                    <p className="text-xs text-red-500 dark:text-red-400 mb-6">
                      ⚠️ No S3 storage configured. Please configure your S3 settings first.
                    </p>
                  )}

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <span className="flex justify-center items-center">
                      <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                      Choose Files
                    </span>
                  </Button>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </motion.div>

            {/* Tags Input */}
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



            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Files to upload ({files.length})
                </h3>
                {files.map((uploadFile) => (
                  <motion.div
                    key={uploadFile.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm rounded-lg border border-white/20 dark:border-gray-700/30"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center flex-1 min-w-0">
                        <DocumentIcon className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {uploadFile.file.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(uploadFile.file.size)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center ml-3">
                        {uploadFile.status === 'uploading' && (
                          <CircularProgress
                            progress={uploadFile.progress}
                            size={24}
                            strokeWidth={2}
                            glassmorphism
                          />
                        )}
                        {uploadFile.status === 'success' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 80 }}
                          >
                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          </motion.div>
                        )}
                        {uploadFile.status === 'error' && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 80 }}
                          >
                            <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                          </motion.div>
                        )}
                        {uploadFile.status === 'pending' && (
                          <button
                            onClick={() => removeFile(uploadFile.id)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress bar for uploading files */}
                    {uploadFile.status === 'uploading' && (
                      <div className="space-y-1">
                        <ProgressBar
                          progress={uploadFile.progress}
                          size="sm"
                          glassmorphism
                          animated
                        />
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>Uploading...</span>
                          <span>{uploadFile.progress}%</span>
                        </div>
                      </div>
                    )}

                    {/* Error message */}
                    {uploadFile.status === 'error' && uploadFile.error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800"
                      >
                        <p className="text-xs text-red-600 dark:text-red-400">
                          {uploadFile.error}
                        </p>
                      </motion.div>
                    )}

                    {/* Success message */}
                    {uploadFile.status === 'success' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800"
                      >
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Upload complete!
                        </p>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="relative z-10 flex items-center justify-between p-6 border-t border-white/20 dark:border-gray-700/50 backdrop-blur-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {files.length > 0 && (
                <span>
                  {files.filter(f => f.status === 'success').length} of {files.length} files uploaded
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isUploading}
                className="backdrop-blur-sm bg-white/20 dark:bg-gray-800/20 border-white/30 dark:border-gray-700/30"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={uploadFiles}
                disabled={!canUpload}
                loading={isUploading}
                className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {allSuccess ? '✨ Upload Complete!' : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
