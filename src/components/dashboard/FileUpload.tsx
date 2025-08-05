'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpTrayIcon,
  XMarkIcon,
  DocumentIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

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
  const [tags, setTags] = useState('');
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

      if (folderId) {
        formData.append('folderId', folderId);
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
        
        // Close modal after a short delay
        setTimeout(() => {
          onUploadComplete();
          onClose();
          setFiles([]);
          setTags('');
        }, 1500);
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
  const hasErrors = files.some(f => f.status === 'error');
  const allSuccess = files.length > 0 && files.every(f => f.status === 'success');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl shadow-xl border border-white/20 dark:border-gray-700/50"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Upload Files
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all backdrop-blur-sm ${
                isDragOver
                  ? 'border-primary-400 bg-primary-50/50 dark:bg-primary-900/30 scale-105'
                  : 'border-gray-300/50 dark:border-gray-600/50 hover:border-primary-400 dark:hover:border-primary-500 bg-white/30 dark:bg-gray-800/30'
              }`}
            >
              <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  Drop files here or click to browse
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Maximum file size: 100MB per file
                </p>
              </div>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

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
                  <div
                    key={uploadFile.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <DocumentIcon className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
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
                    
                    <div className="flex items-center ml-3">
                      {uploadFile.status === 'uploading' && (
                        <LoadingSpinner size="sm" />
                      )}
                      {uploadFile.status === 'success' && (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      )}
                      {uploadFile.status === 'error' && (
                        <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
                      )}
                      {uploadFile.status === 'pending' && (
                        <button
                          onClick={() => removeFile(uploadFile.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={onClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={uploadFiles}
              disabled={!canUpload}
              loading={isUploading}
            >
              {allSuccess ? 'Upload Complete!' : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
