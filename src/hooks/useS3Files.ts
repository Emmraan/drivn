import { useState, useCallback, useEffect } from 'react';

export interface S3FileItem {
  key: string;
  name: string;
  size: number;
  lastModified: Date;
  mimeType?: string;
  isFolder: boolean;
  path: string;
  metadata?: Record<string, string>;
}

export interface S3ListResult {
  items: S3FileItem[];
  folders: S3FileItem[];
  hasMore: boolean;
  nextToken?: string;
  totalCount?: number;
}

export interface UseS3FilesOptions {
  autoLoad?: boolean;
  maxKeys?: number;
  includeMetadata?: boolean;
}

export function useS3Files(initialPath: string = '', options: UseS3FilesOptions = {}) {
  const [files, setFiles] = useState<S3FileItem[]>([]);
  const [folders, setFolders] = useState<S3FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextToken, setNextToken] = useState<string | undefined>();

  const { autoLoad = true, maxKeys = 50, includeMetadata = false } = options;

  const loadFiles = useCallback(async (path: string = currentPath, reset: boolean = true, forceRefresh: boolean = false) => {
    console.log('🔄 loadFiles called:', { path, reset, forceRefresh, currentPath });

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        path,
        maxKeys: maxKeys.toString(),
        includeMetadata: includeMetadata.toString(),
      });

      // Add cache busting parameter for force refresh
      if (forceRefresh) {
        params.append('_t', Date.now().toString());
        params.append('noCache', 'true');
      }

      if (!reset && nextToken) {
        params.append('continuationToken', nextToken);
      }

      console.log('📡 Fetching S3 files with params:', params.toString());
      const response = await fetch(`/api/s3-files?${params}`);
      const result = await response.json();

      console.log('📥 S3 files response:', { success: result.success, itemCount: result.data?.items?.length, folderCount: result.data?.folders?.length });

      if (result.success) {
        if (reset) {
          console.log('🔄 Resetting files and folders state');
          setFiles(result.data.items || []);
          setFolders(result.data.folders || []);
          setNextToken(undefined); // Reset pagination token
        } else {
          console.log('➕ Appending to existing files and folders');
          setFiles(prev => [...prev, ...(result.data.items || [])]);
          setFolders(prev => [...prev, ...(result.data.folders || [])]);
        }
        setHasMore(result.data.hasMore || false);
        if (result.data.nextToken) {
          setNextToken(result.data.nextToken);
        }
      } else {
        console.error('❌ Failed to load files:', result.message);
        setError(result.message || 'Failed to load files');
      }
    } catch (err) {
      console.error('❌ Error loading files:', err);
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [currentPath, maxKeys, includeMetadata, nextToken]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      console.log('📄 Loading more items for path:', currentPath);
      loadFiles(currentPath, false, false); // Don't force refresh for pagination
    }
  }, [hasMore, loading, loadFiles, currentPath]);

  const navigateToPath = useCallback((newPath: string) => {
    console.log('🧭 Navigating to path:', { from: currentPath, to: newPath });
    setCurrentPath(newPath);
    setNextToken(undefined);
    loadFiles(newPath, true, true); // Force refresh when navigating
  }, [loadFiles, currentPath]);

  const refresh = useCallback(() => {
    console.log('🔄 Manual refresh triggered for path:', currentPath);
    setNextToken(undefined);
    loadFiles(currentPath, true, true); // Force refresh
  }, [loadFiles, currentPath]);

  const uploadFiles = useCallback(async (filesToUpload: File[], uploadPath?: string) => {
    console.log('📤 Starting file upload:', { fileCount: filesToUpload.length, uploadPath, currentPath });

    const formData = new FormData();
    filesToUpload.forEach(file => formData.append('files', file));
    if (uploadPath !== undefined) {
      formData.append('path', uploadPath);
    } else {
      formData.append('path', currentPath);
    }

    try {
      const response = await fetch('/api/s3-files', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      console.log('📤 Upload result:', result);

      if (result.success) {
        console.log('✅ Upload successful, refreshing UI...');
        // Force refresh from S3 to get real-time data
        await loadFiles(currentPath, true, true);
        return { success: true, data: result.data };
      } else {
        console.error('❌ Upload failed:', result.message);
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }, [currentPath, loadFiles]);

  const deleteFile = useCallback(async (filePath: string) => {
    console.log('🗑️ Deleting file:', filePath);

    try {
      const response = await fetch(`/api/s3-files/${encodeURIComponent(filePath)}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      console.log('🗑️ Delete result:', result);

      if (result.success) {
        console.log('✅ Delete successful, refreshing UI...');
        // Force refresh from S3 to get real-time data
        await loadFiles(currentPath, true, true);
        return { success: true };
      } else {
        console.error('❌ Delete failed:', result.message);
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('❌ Delete error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Delete failed'
      };
    }
  }, [currentPath, loadFiles]);

  const renameFile = useCallback(async (filePath: string, newName: string) => {
    console.log('✏️ Renaming file:', { filePath, newName });

    try {
      const response = await fetch(`/api/s3-files/${encodeURIComponent(filePath)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName }),
      });

      const result = await response.json();
      console.log('✏️ Rename result:', result);

      if (result.success) {
        console.log('✅ Rename successful, refreshing UI...');
        // Force refresh from S3 to get real-time data
        await loadFiles(currentPath, true, true);
        return { success: true, data: result.data };
      } else {
        console.error('❌ Rename failed:', result.message);
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('❌ Rename error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Rename failed'
      };
    }
  }, [currentPath, loadFiles]);

  const createFolder = useCallback(async (folderName: string, parentPath?: string) => {
    console.log('📁 Creating folder:', { folderName, parentPath, currentPath });

    try {
      const response = await fetch('/api/s3-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: folderName,
          parentPath: parentPath !== undefined ? parentPath : currentPath
        }),
      });

      const result = await response.json();
      console.log('📁 Create folder result:', result);

      if (result.success) {
        console.log('✅ Folder creation successful, refreshing UI...');
        // Force refresh from S3 to get real-time data
        const targetPath = parentPath !== undefined ? parentPath : currentPath;
        if (targetPath === currentPath) {
          await loadFiles(currentPath, true, true);
        }
        return { success: true, data: result.data };
      } else {
        console.error('❌ Create folder failed:', result.message);
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('❌ Create folder error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Create folder failed'
      };
    }
  }, [currentPath, loadFiles]);

  const deleteFolder = useCallback(async (folderPath: string) => {
    console.log('🗑️📁 Deleting folder:', folderPath);

    try {
      const response = await fetch(`/api/s3-folders/${encodeURIComponent(folderPath)}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      console.log('🗑️📁 Delete folder result:', result);

      if (result.success) {
        console.log('✅ Folder deletion successful, refreshing UI...');
        // Force refresh from S3 to get real-time data
        await loadFiles(currentPath, true, true);
        return { success: true, stats: result.stats };
      } else {
        console.error('❌ Delete folder failed:', result.message);
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('❌ Delete folder error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Delete folder failed'
      };
    }
  }, [currentPath, loadFiles]);

  const renameFolder = useCallback(async (folderPath: string, newName: string) => {
    console.log('✏️📁 Renaming folder:', { folderPath, newName });

    try {
      const response = await fetch(`/api/s3-folders/${encodeURIComponent(folderPath)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName }),
      });

      const result = await response.json();
      console.log('✏️📁 Rename folder result:', result);

      if (result.success) {
        console.log('✅ Folder rename successful, refreshing UI...');
        // Force refresh from S3 to get real-time data
        await loadFiles(currentPath, true, true);
        return { success: true, data: result.data, stats: result.stats };
      } else {
        console.error('❌ Folder rename failed:', result.message);
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('❌ Folder rename error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Rename folder failed'
      };
    }
  }, [currentPath, loadFiles]);

  const getDownloadUrl = useCallback(async (filePath: string) => {
    try {
      const response = await fetch(`/api/s3-files/download/${encodeURIComponent(filePath)}`);
      const result = await response.json();
      
      if (result.success) {
        return { success: true, url: result.url };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to get download URL' 
      };
    }
  }, []);

  // Auto-load on mount and path changes
  useEffect(() => {
    if (autoLoad) {
      console.log('🚀 Auto-loading files for path:', currentPath);
      const loadData = async () => {
        await loadFiles(currentPath, true, true); // Force refresh on mount/path change
      };
      loadData();
    }
  }, [autoLoad, currentPath, loadFiles]);

  return {
    files,
    folders,
    currentPath,
    loading,
    error,
    hasMore,
    loadFiles,
    loadMore,
    navigateToPath,
    refresh,
    uploadFiles,
    deleteFile,
    renameFile,
    createFolder,
    deleteFolder,
    renameFolder,
    getDownloadUrl,
  };
}
