'use client';

import React, { useState, useCallback } from 'react';
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
  EllipsisVerticalIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import { FileItemSkeleton } from '@/components/ui/SkeletonLoader';
import ContextMenu, { ContextMenuItem } from '@/components/ui/ContextMenu';
import RenameModal from '@/components/ui/RenameModal';
import { useS3Files } from '@/hooks/useS3Files';
import { useS3Search } from '@/hooks/useS3Search';
import S3FileUpload from '@/components/dashboard/S3FileUpload';
import S3CreateFolder from '@/components/dashboard/S3CreateFolder';

interface Breadcrumb {
  name: string;
  path: string;
}

interface FileItem {
  key: string;
  name: string;
  path: string;
  size: number;
  lastModified: Date;
  mimeType?: string;
  isFolder: boolean;
}

interface FolderItem {
  key: string;
  name: string;
  path: string;
  isFolder: boolean;
}

export default function S3FilesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameItem, setRenameItem] = useState<{ key: string; name: string; type: 'file' | 'folder' } | null>(null);

  const {
    files,
    folders,
    currentPath,
    loading,
    error,
    hasMore,
    navigateToPath,
    refresh,
    deleteFile,
    renameFile,
    deleteFolder,
    renameFolder,
    getDownloadUrl,
    loadMore,
  } = useS3Files('', { autoLoad: true, maxKeys: 50 });

  const {
    results: searchResults,
    loading: searchLoading,
    search,
    clearResults,
  } = useS3Search({ debounceMs: 300, maxKeys: 50 });

  const breadcrumbs: Breadcrumb[] = [
    { name: 'My Files', path: '' },
    ...currentPath.split('/').filter(Boolean).map((segment, index, array) => ({
      name: segment,
      path: array.slice(0, index + 1).join('/'),
    })),
  ];

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      search(query.trim());
    } else {
      clearResults();
    }
  }, [search, clearResults]);

  const handleUploadComplete = useCallback(() => {
    console.log('📤✅ Upload completed, refreshing UI...');
    refresh();
    setShowUploadModal(false);
  }, [refresh]);

  const handleFolderCreated = useCallback(() => {
    console.log('📁✅ Folder created, refreshing UI...');
    refresh();
    setShowCreateFolderModal(false);
  }, [refresh]);

  const handleRenameFile = useCallback((file: FileItem) => {
    setRenameItem({ key: file.key, name: file.name, type: 'file' });
    setShowRenameModal(true);
  }, []);

  const handleRenameFolder = useCallback((folder: FolderItem) => {
    setRenameItem({ key: folder.path, name: folder.name, type: 'folder' });
    setShowRenameModal(true);
  }, []);

  const handleRenameSubmit = useCallback(async (newName: string) => {
    if (!renameItem) return;

    console.log('✏️ Starting rename operation:', { type: renameItem.type, key: renameItem.key, newName });

    try {
      let result;

      if (renameItem.type === 'file') {
        result = await renameFile(renameItem.key, newName);
      } else if (renameItem.type === 'folder') {
        result = await renameFolder(renameItem.key, newName);
      } else {
        console.error('❌ Unknown rename type:', renameItem.type);
        return;
      }

      if (result.success) {
        console.log('✅ Rename operation successful');
        setShowRenameModal(false);
        setRenameItem(null);
      } else {
        console.error('❌ Rename operation failed:', result.message);
        // You could show an error toast here
        alert(`Rename failed: ${result.message}`);
      }
    } catch (error) {
      console.error('❌ Rename operation error:', error);
      alert(`Rename failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [renameItem, renameFile, renameFolder]);

  const handleDeleteFile = useCallback(async (file: FileItem) => {
    if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
      const result = await deleteFile(file.key);
      if (!result.success) {
        alert(`Failed to delete file: ${result.message}`);
      }
    }
  }, [deleteFile]);

  const handleDeleteFolder = useCallback(async (folder: FolderItem) => {
    if (confirm(`Are you sure you want to delete the folder "${folder.name}" and all its contents?`)) {
      const result = await deleteFolder(folder.path);
      if (!result.success) {
        alert(`Failed to delete folder: ${result.message}`);
      }
    }
  }, [deleteFolder]);

  const handleDownload = useCallback(async (file: FileItem) => {
    const result = await getDownloadUrl(file.key);
    if (result.success && result.url) {
      window.open(result.url, '_blank');
    }
  }, [getDownloadUrl]);

  const getFileContextMenuItems = useCallback((file: FileItem): ContextMenuItem[] => [
    {
      id: `download-${file.key}`,
      label: 'Download',
      icon: ArrowDownTrayIcon,
      onClick: () => handleDownload(file),
    },
    {
      id: `rename-${file.key}`,
      label: 'Rename',
      icon: PencilIcon,
      onClick: () => handleRenameFile(file),
    },
    {
      id: `delete-${file.key}`,
      label: 'Delete',
      icon: TrashIcon,
      onClick: () => handleDeleteFile(file),
      variant: 'danger',
    },
  ], [handleDownload, handleRenameFile, handleDeleteFile]);

  const getFolderContextMenuItems = useCallback((folder: FolderItem): ContextMenuItem[] => [
    {
      id: `open-${folder.key}`,
      label: 'Open',
      icon: EyeIcon,
      onClick: () => navigateToPath(folder.path),
    },
    {
      id: `rename-${folder.key}`,
      label: 'Rename',
      icon: PencilIcon,
      onClick: () => handleRenameFolder(folder),
    },
    {
      id: `delete-${folder.key}`,
      label: 'Delete',
      icon: TrashIcon,
      onClick: () => handleDeleteFolder(folder),
      variant: 'danger',
    },
  ], [navigateToPath, handleRenameFolder, handleDeleteFolder]);

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return '📄';
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('text')) return '📝';
    return '📄';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const displayItems = searchQuery.trim() ? searchResults : files;
  const displayFolders = searchQuery.trim() ? [] : folders;
  const isLoading = searchQuery.trim() ? searchLoading : loading;

  // Debug logging for UI state
  console.log('🖥️ UI State:', {
    currentPath,
    filesCount: files.length,
    foldersCount: folders.length,
    displayItemsCount: displayItems.length,
    displayFoldersCount: displayFolders.length,
    isLoading,
    searchQuery: searchQuery.trim(),
  });

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            S3 Files (Direct)
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your files directly from S3 storage
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            leftIcon={<ArrowPathIcon className="h-4 w-4" />}
            disabled={isLoading}
            className="text-gray-600 dark:text-gray-400"
          >
            {isLoading ? 'Loading...' : 'Refresh'}
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
      {!searchQuery.trim() && (
        <nav className="mt-8 flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            {breadcrumbs.map((crumb, index) => (
              <li key={crumb.path} className="flex items-center">
                {index > 0 && <span className="mx-2 text-gray-400">/</span>}
                <button
                  onClick={() => navigateToPath(crumb.path)}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {crumb.name}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Search and View Controls */}
      <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            leftIcon={<ViewColumnsIcon className="h-4 w-4" />}
          >
            Grid
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            leftIcon={<Bars3Icon className="h-4 w-4" />}
          >
            List
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (displayItems.length === 0 && displayFolders.length === 0) && (
        <div className={viewMode === 'grid' ? 'mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4' : 'space-y-2'}>
          {Array.from({ length: 12 }).map((_, i) => (
            <FileItemSkeleton key={i} viewMode={viewMode} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && displayItems.length === 0 && displayFolders.length === 0 && !error && (
        <div className="mt-8 text-center py-12">
          <FolderIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchQuery.trim() ? 'No files found' : 'No files yet'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {searchQuery.trim() 
              ? `No files match "${searchQuery}"`
              : 'Upload your first file to get started'
            }
          </p>
          {!searchQuery.trim() && (
            <Button
              variant="primary"
              onClick={() => setShowUploadModal(true)}
              leftIcon={<ArrowUpTrayIcon className="h-4 w-4" />}
            >
              Upload Files
            </Button>
          )}
        </div>
      )}

      {/* Files and Folders Grid/List */}
      {(displayItems.length > 0 || displayFolders.length > 0) && (
        <div className={viewMode === 'grid' ? 'mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4' : 'mt-8 space-y-2'}>
          {/* Folders */}
          {displayFolders.map((folder) => (
            <ContextMenu key={folder.key} items={getFolderContextMenuItems(folder)} itemType="folder">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`group cursor-pointer ${
                  viewMode === 'grid'
                    ? 'p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors'
                    : 'flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
                }`}
                onClick={() => navigateToPath(folder.path)}
              >
                <div className={viewMode === 'grid' ? 'text-center relative' : 'flex items-center flex-1'}>
                  <FolderIcon
                    className={`${viewMode === 'grid' ? 'mx-auto mb-2 h-8 w-8' : 'mr-3 h-6 w-6'} text-primary-500`}
                  />
                  <div className={viewMode === 'list' ? 'flex-1' : ''}>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {folder.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Folder
                    </p>
                  </div>
                  <button
                    onClick={(e) => e.stopPropagation()}
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
          {displayItems.map((file) => (
            <ContextMenu key={file.key} items={getFileContextMenuItems(file)} enableLeftClick={true} itemType="file">
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
                    </p>
                    {searchQuery.trim() && file.path && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                        {file.path}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => e.stopPropagation()}
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

      {/* Load More Button */}
      {hasMore && !isLoading && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isLoading}
          >
            Load More
          </Button>
        </div>
      )}

      {/* Modals */}
      <S3FileUpload
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        currentPath={currentPath}
        onUploadComplete={handleUploadComplete}
      />

      <S3CreateFolder
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        parentPath={currentPath}
        onFolderCreated={handleFolderCreated}
      />

      <RenameModal
        isOpen={showRenameModal}
        onClose={() => {
          setShowRenameModal(false);
          setRenameItem(null);
        }}
        currentName={renameItem?.name || ''}
        onConfirm={handleRenameSubmit}
        title={`Rename ${renameItem?.type || 'item'}`}
        type={renameItem?.type || 'file'}
      />
    </div>
  );
}
