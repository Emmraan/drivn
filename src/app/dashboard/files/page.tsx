'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FolderIcon,
  PlusIcon,
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  ViewColumnsIcon,
  Bars3Icon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  DocumentDuplicateIcon,
  EllipsisVerticalIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import { FileItemSkeleton } from '@/components/ui/SkeletonLoader';
import FileUpload from '@/components/dashboard/FileUpload';
import CreateFolder from '@/components/dashboard/CreateFolder';
import ContextMenu, { ContextMenuItem } from '@/components/ui/ContextMenu';
import FilePreviewModal from '@/components/dashboard/FilePreviewModal';
import RenameModal from '@/components/ui/RenameModal';
import { useSync } from '@/hooks/useSync';
import DeleteModal from '@/components/ui/DeleteModal';

interface FileItem {
  _id: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
  path: string;
  bucketType: 'user' | 'drivn';
}

interface FolderItem {
  _id: string;
  name: string;
  fileCount: number;
  folderCount: number;
  totalSize: number;
  createdAt: string;
  path: string;
  color?: string;
}

interface Breadcrumb {
  id: string;
  name: string;
  path: string;
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameItem, setRenameItem] = useState<{ id: string; name: string; type: 'file' | 'folder' } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState<{ id: string; name: string; type: 'file' | 'folder' } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Use sync hook for real-time synchronization
  const { syncStatus, isLoading: isSyncing, performSync, startPeriodicSync, stopPeriodicSync } = useSync();

  const loadFolderContents = useCallback(async (folderId: string) => {
    try {
      setLoading(true);

      // First perform full sync to ensure consistency
      try {
        const syncResult = await performSync('full');
        if (syncResult.success) {
          console.log('Sync completed successfully:', syncResult.message);
        }
      } catch (syncError) {
        console.warn('Full sync failed, continuing with folder load:', syncError);
      }

      const response = await fetch(`/api/folders?parentId=${folderId === 'root' ? '' : folderId}`);
      const data = await response.json();

      if (data.success) {
        setFiles(data.data.files);
        setFolders(data.data.folders);
        setBreadcrumbs(data.data.breadcrumbs);
      }
    } catch (error) {
      console.error('Error loading folder contents:', error);
    } finally {
      setLoading(false);
    }
  }, [performSync]);

  useEffect(() => {
    loadFolderContents(currentFolderId);
  }, [currentFolderId, loadFolderContents]);

  // Auto-start periodic sync on component mount
  useEffect(() => {
    if (!syncStatus.isActive) {
      startPeriodicSync();
    }
  }, [syncStatus.isActive, startPeriodicSync]);

  const navigateToFolder = (folderId: string) => {
    setCurrentFolderId(folderId);
  };

  const handleUploadComplete = () => {
    loadFolderContents(currentFolderId);
  };

  const handleFolderCreated = () => {
    loadFolderContents(currentFolderId);
  };

  const handleRenameFile = (file: FileItem) => {
    setRenameItem({ id: file._id, name: file.name, type: 'file' });
    setShowRenameModal(true);
  };

  const handleDeleteFile = (file: FileItem) => {
    setDeleteItem({ id: file._id, name: file.name, type: 'file' });
    setShowDeleteModal(true);
  };

  const confirmRename = async (newName: string) => {
    if (!renameItem) return;

    try {
      const endpoint = renameItem.type === 'file' ? `/api/files/${renameItem.id}` : `/api/folders/${renameItem.id}`;
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });

      if (response.ok) {
        loadFolderContents(currentFolderId);
      }
    } catch (error) {
      console.error('Error renaming:', error);
    }
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;

    try {
      setDeleteLoading(true);
      const endpoint = deleteItem.type === 'file' ? `/api/files/${deleteItem.id}` : `/api/folders/${deleteItem.id}`;
      const response = await fetch(endpoint, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadFolderContents(currentFolderId);
        setShowDeleteModal(false);
        setDeleteItem(null);
      }
    } catch (error) {
      console.error('Error deleting:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDownloadFile = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}/download`);
      const data = await response.json();

      if (data.success && data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handlePreviewFile = (file: FileItem) => {
    setPreviewFile(file);
    setShowPreviewModal(true);
  };

  const handleRenameFolder = (folder: FolderItem) => {
    setRenameItem({ id: folder._id, name: folder.name, type: 'folder' });
    setShowRenameModal(true);
  };

  const handleDeleteFolder = (folder: FolderItem) => {
    setDeleteItem({ id: folder._id, name: folder.name, type: 'folder' });
    setShowDeleteModal(true);
  };

  const getFileContextMenuItems = (file: FileItem): ContextMenuItem[] => [
    {
      id: 'preview',
      label: 'Preview',
      icon: <EyeIcon className="h-4 w-4" />,
      onClick: () => handlePreviewFile(file),
    },
    {
      id: 'download',
      label: 'Download',
      icon: <ArrowDownTrayIcon className="h-4 w-4" />,
      onClick: () => handleDownloadFile(file._id),
    },
    {
      id: 'rename',
      label: 'Rename',
      icon: <PencilIcon className="h-4 w-4" />,
      onClick: () => handleRenameFile(file),
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <TrashIcon className="h-4 w-4" />,
      onClick: () => handleDeleteFile(file),
      destructive: true,
      separator: true,
    },
  ];

  const getFolderContextMenuItems = (folder: FolderItem): ContextMenuItem[] => [
    {
      id: 'open',
      label: 'Open',
      icon: <FolderIcon className="h-4 w-4" />,
      onClick: () => navigateToFolder(folder._id),
    },
    {
      id: 'rename',
      label: 'Rename',
      icon: <PencilIcon className="h-4 w-4" />,
      onClick: () => handleRenameFolder(folder),
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <TrashIcon className="h-4 w-4" />,
      onClick: () => handleDeleteFolder(folder),
      destructive: true,
      separator: true,
    },
  ];

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📽️';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return '🗜️';
    return '📄';
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
          </div>
          <div className="flex space-x-2">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
          </div>
        </div>

        {/* Content skeleton */}
        <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6' : 'grid-cols-1'}`}>
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <FileItemSkeleton viewMode={viewMode} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Files</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your files and folders
            {syncStatus.isActive && (
              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Auto-sync enabled
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => performSync('full')}
            leftIcon={<ArrowPathIcon className="h-4 w-4" />}
            disabled={isSyncing}
            className="text-gray-600 dark:text-gray-400"
          >
            {isSyncing ? 'Syncing...' : 'Sync'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateFolderModal(true)}
            leftIcon={<PlusIcon className="h-4 w-4" />}
          >
            New Folder
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowUploadModal(true)}
            leftIcon={<ArrowUpTrayIcon className="h-4 w-4" />}
          >
            Upload Files
          </Button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.id}>
            <button
              onClick={() => navigateToFolder(crumb.id)}
              className={`hover:text-primary-600 transition-colors ${
                index === breadcrumbs.length - 1
                  ? 'text-gray-900 dark:text-white font-medium'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {crumb.name}
            </button>
            {index < breadcrumbs.length - 1 && (
              <span className="text-gray-400">/</span>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Search and View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search files and folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <ViewColumnsIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      {filteredFolders.length === 0 && filteredFiles.length === 0 ? (
        <div className="text-center py-12">
          <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            {searchQuery ? 'No results found' : 'No files or folders'}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchQuery 
              ? 'Try adjusting your search terms'
              : 'Get started by uploading files or creating folders'
            }
          </p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4' : 'space-y-2'}>
          {/* Folders */}
          {filteredFolders.map((folder) => (
            <ContextMenu key={folder._id} items={getFolderContextMenuItems(folder)} itemType="folder">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group cursor-pointer ${
                  viewMode === 'grid'
                    ? 'p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors'
                    : 'flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                }`}
                onClick={() => navigateToFolder(folder._id)}
              >
                <div className={viewMode === 'grid' ? 'text-center relative' : 'flex items-center flex-1'}>
                  <FolderIcon
                    className={`${viewMode === 'grid' ? 'mx-auto mb-2 h-8 w-8' : 'mr-3 h-6 w-6'} text-primary-500`}
                    style={{ color: folder.color || undefined }}
                  />
                  <div className={viewMode === 'list' ? 'flex-1' : ''}>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {folder.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {folder.fileCount} files, {folder.folderCount} folders
                    </p>
                  </div>
                  {/* Three-dot menu button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Context menu will be triggered by right-click, but this provides visual cue
                    }}
                    className={`${
                      viewMode === 'grid'
                        ? 'absolute top-2 right-2'
                        : 'ml-2'
                    } p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-all opacity-80 hover:opacity-100`}
                  >
                    <EllipsisVerticalIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </motion.div>
            </ContextMenu>
          ))}

          {/* Files */}
          {filteredFiles.map((file) => (
            <ContextMenu key={file._id} items={getFileContextMenuItems(file)} enableLeftClick={true} itemType="file">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group ${
                  viewMode === 'grid'
                    ? 'p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors'
                    : 'flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                }`}
              >
                <div className={viewMode === 'grid' ? 'text-center relative' : 'flex items-center flex-1'}>
                  <div className={`${viewMode === 'grid' ? 'mx-auto mb-2' : 'mr-3'} text-2xl`}>
                    {getFileIcon(file.mimeType)}
                  </div>
                  <div className={viewMode === 'list' ? 'flex-1' : ''}>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.size)}
                      {file.bucketType === 'drivn' && (
                        <span className="ml-1 px-1.5 py-0.5 bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 rounded text-xs">
                          DRIVN
                        </span>
                      )}
                    </p>
                  </div>
                  {/* Three-dot menu button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Context menu will be triggered by right-click, but this provides visual cue
                    }}
                    className={`${
                      viewMode === 'grid'
                        ? 'absolute top-2 right-2'
                        : 'ml-2'
                    } p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-all opacity-80 hover:opacity-100`}
                  >
                    <EllipsisVerticalIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </motion.div>
            </ContextMenu>
          ))}
        </div>
      )}

      {/* Modals */}
      <FileUpload
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        folderId={currentFolderId === 'root' ? undefined : currentFolderId}
        onUploadComplete={handleUploadComplete}
      />

      <CreateFolder
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        parentId={currentFolderId === 'root' ? undefined : currentFolderId}
        onFolderCreated={handleFolderCreated}
      />

      <FilePreviewModal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setPreviewFile(null);
        }}
        file={previewFile}
      />

      <RenameModal
        isOpen={showRenameModal}
        onClose={() => {
          setShowRenameModal(false);
          setRenameItem(null);
        }}
        onConfirm={confirmRename}
        currentName={renameItem?.name || ''}
        title={`Rename ${renameItem?.type === 'file' ? 'File' : 'Folder'}`}
        type={renameItem?.type || 'file'}
      />

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteItem(null);
        }}
        onConfirm={confirmDelete}
        title={`Delete ${deleteItem?.type === 'file' ? 'File' : 'Folder'}`}
        message={`Are you sure you want to delete this ${deleteItem?.type}?`}
        itemName={deleteItem?.name || ''}
        type={deleteItem?.type || 'file'}
        loading={deleteLoading}
      />
    </div>
  );
}

