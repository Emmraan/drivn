"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  DocumentIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/SkeletonLoader";
import Image from "next/image";
import { logger } from "@/utils/logger";

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    _id: string;
    name: string;
    mimeType: string;
    size: number;
  } | null;
}

export default function FilePreviewModal({
  isOpen,
  onClose,
  file,
}: FilePreviewModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/files/${file._id}/preview`);
      const data = await response.json();

      if (data.success) {
        setPreviewUrl(data.url);
      } else {
        setError(data.message || "Failed to load preview");
      }
    } catch (error) {
      logger.error("Error loading preview:", error);
      setError("Failed to load preview");
    } finally {
      setLoading(false);
    }
  }, [file]);

  useEffect(() => {
    if (isOpen && file) {
      loadPreview();
    } else {
      setPreviewUrl(null);
      setError(null);
    }
  }, [isOpen, file, loadPreview]);

  const handleDownload = async () => {
    if (!file) return;

    try {
      const response = await fetch(`/api/files/${file._id}/download`);
      const data = await response.json();

      if (data.success && data.url) {
        const link = document.createElement("a");
        link.href = data.url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      logger.error("Error downloading file:", error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const isPreviewable = (mimeType: string) => {
    return (
      mimeType.startsWith("image/") ||
      mimeType === "application/pdf" ||
      mimeType.startsWith("text/") ||
      mimeType === "application/json"
    );
  };

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-md transition-opacity"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-4xl rounded-xl shadow-xl backdrop-blur-md bg-opacity-95 dark:bg-opacity-95"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <DocumentIcon className="h-6 w-6 text-gray-500" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {file.name}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatFileSize(file.size)} • {file.mimeType}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
              >
                Download
              </Button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="h-96 space-y-4 p-4">
                {/* Preview skeleton */}
                <div className="space-y-2">
                  <Skeleton variant="text" width="40%" height="1.5rem" />
                  <Skeleton variant="text" width="60%" />
                </div>
                <Skeleton
                  variant="rounded"
                  height="20rem"
                  className="animate-pulse"
                />
                <div className="flex justify-center space-x-4">
                  <Skeleton variant="rounded" width="6rem" height="2.5rem" />
                  <Skeleton variant="rounded" width="8rem" height="2.5rem" />
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <ExclamationTriangleIcon className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Preview Not Available
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
                <Button
                  variant="primary"
                  onClick={handleDownload}
                  leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
                >
                  Download File
                </Button>
              </div>
            ) : !isPreviewable(file.mimeType) ? (
              <div className="flex flex-col items-center justify-center h-96 text-center">
                <DocumentIcon className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Preview Not Supported
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  This file type cannot be previewed in the browser.
                </p>
                <Button
                  variant="primary"
                  onClick={handleDownload}
                  leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
                >
                  Download File
                </Button>
              </div>
            ) : previewUrl ? (
              <div className="max-h-96 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700">
                {file.mimeType.startsWith("image/") ? (
                  <Image
                    src={previewUrl}
                    alt={file.name}
                    className="w-full h-auto max-h-96 object-contain"
                  />
                ) : file.mimeType === "application/pdf" ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-96"
                    title={file.name}
                  />
                ) : file.mimeType.startsWith("text/") ||
                  file.mimeType === "application/json" ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-96"
                    title={file.name}
                  />
                ) : (
                  <div className="flex items-center justify-center h-96">
                    <p className="text-gray-500 dark:text-gray-400">
                      Unable to preview this file type
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
