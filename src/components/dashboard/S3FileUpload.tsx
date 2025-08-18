'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpTrayIcon,
  XMarkIcon,
  DocumentIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import ProgressBar from '@/components/ui/ProgressBar';

interface S3FileUploadProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  onUploadComplete: () => void;
}

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export default function S3FileUpload({ isOpen, onClose, currentPath, onUploadComplete }: S3FileUploadProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const newFiles: UploadFile[] = Array.from(files).map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      progress: 0,
      status: 'pending',
    }));

    setUploadFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const removeFile = useCallback((id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const uploadAllFiles = useCallback(async () => {
    if (uploadFiles.length === 0) return;

    setIsUploading(true);
    setUploadFiles(prev => prev.map(f => ({ ...f, status: 'uploading' as const })));

    const uploadPromises = uploadFiles.map(async (uploadFile) => {
      try {
        const presignedUrlResponse = await fetch('/api/s3-files/presigned-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: uploadFile.file.name,
            fileType: uploadFile.file.type,
            fileSize: uploadFile.file.size,
            path: currentPath,
          }),
        });

        if (!presignedUrlResponse.ok) {
          const errorData = await presignedUrlResponse.json();
          throw new Error(errorData.message || 'Failed to get pre-signed URL');
        }

        const { data } = await presignedUrlResponse.json();
        const { url } = data;

        const uploadResponse = await fetch(url, {
          method: 'PUT',
          body: uploadFile.file,
          headers: { 'Content-Type': uploadFile.file.type },
        });

        if (!uploadResponse.ok) {
          throw new Error('S3 upload failed');
        }

        setUploadFiles(prev => prev.map(f =>
          f.id === uploadFile.id ? { ...f, status: 'success' as const, progress: 100 } : f
        ));
      } catch (error) {
        console.error('Upload error:', error);
        setUploadFiles(prev => prev.map(f =>
          f.id === uploadFile.id
            ? { ...f, status: 'error' as const, error: error instanceof Error ? error.message : 'Upload failed' }
            : f
        ));
      }
    });

    await Promise.all(uploadPromises);

    setIsUploading(false);

    const allFinished = uploadFiles.every(f => f.status === 'success' || f.status === 'error');
    if (allFinished) {
      setTimeout(() => {
        onUploadComplete();
        onClose();
        setUploadFiles([]);
      }, 1500);
    }
  }, [uploadFiles, currentPath, onUploadComplete, onClose]);

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'error':
        return <ExclamationCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <DocumentIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="backdrop-blur-md rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            Upload Files to S3 Bucket
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {/* Upload Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragOver
              ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500'
              }`}
          >
            <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div>
              <p className="text-lg font-medium text-white mb-2">
                Drop files here or click to browse
              </p>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Upload to: {currentPath ? `/${currentPath.replace(/^\/+/, '')}` : '/root'}
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700"
              >
                <span className='flex items-center'>
                  <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                  Choose Files
                </span>
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
          </div>

          {/* File List */}
          {uploadFiles.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Files to Upload ({uploadFiles.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {uploadFiles.map((uploadFile) => (
                  <div
                    key={uploadFile.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      {getStatusIcon(uploadFile.status)}
                      <div className="ml-3 flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {uploadFile.file.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(uploadFile.file.size)}
                        </p>
                        {uploadFile.error && (
                          <p className="text-xs text-red-500 mt-1">{uploadFile.error}</p>
                        )}
                      </div>
                    </div>

                    {uploadFile.status === 'uploading' && (
                      <div className="ml-3 w-20">
                        <ProgressBar progress={uploadFile.progress} size="sm" />
                      </div>
                    )}

                    {uploadFile.status === 'pending' && (
                      <button
                        onClick={() => removeFile(uploadFile.id)}
                        className="ml-3 text-gray-400 hover:text-red-500"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="ghost" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={uploadAllFiles}
            disabled={uploadFiles.length === 0 || isUploading}
            loading={isUploading}
          >
            {isUploading ? 'Uploading...' : `Upload ${uploadFiles.length} File${uploadFiles.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
