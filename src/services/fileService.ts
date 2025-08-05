import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import connectDB from '@/utils/database';
import File, { IFile } from '@/models/File';
import Folder, { IFolder } from '@/models/Folder';
import User from '@/auth/models/User';
import { getS3Client, getS3BucketName, isUsingDrivnS3 } from '@/utils/s3ClientFactory';
import { Types } from 'mongoose';

export interface FileUploadData {
  name: string;
  originalName: string;
  size: number;
  mimeType: string;
  buffer: Buffer;
  folderId?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  bucketType?: 'platform' | 'user';
}

export interface FolderCreateData {
  name: string;
  parentId?: string;
  color?: string;
  description?: string;
}

export class FileService {
  /**
   * Upload a file to S3 and save metadata to database
   */
  static async uploadFile(userId: string, fileData: FileUploadData): Promise<{ success: boolean; file?: IFile; message: string }> {
    try {
      await connectDB();

      // Get S3 client and bucket for user based on bucketType preference
      let s3Client, bucketName, isUsingDrivn;

      if (fileData.bucketType === 'platform') {
        // Force use of platform bucket
        s3Client = await getS3Client(userId, true); // Force DRIVN S3
        bucketName = await getS3BucketName(userId, true);
        isUsingDrivn = true;
      } else if (fileData.bucketType === 'user') {
        // Force use of user's own bucket
        s3Client = await getS3Client(userId, false); // Force user's S3
        bucketName = await getS3BucketName(userId, false);
        isUsingDrivn = false;
      } else {
        // Default behavior - use existing logic
        s3Client = await getS3Client(userId);
        bucketName = await getS3BucketName(userId);
        isUsingDrivn = await isUsingDrivnS3(userId);
      }

      if (!s3Client || !bucketName) {
        return {
          success: false,
          message: 'S3 configuration not found. Please configure your storage settings.',
        };
      }

      // Validate folder if specified
      let folder: IFolder | null = null;
      if (fileData.folderId) {
        folder = await Folder.findOne({ _id: fileData.folderId, userId });
        if (!folder) {
          return {
            success: false,
            message: 'Folder not found.',
          };
        }
      }

      // Generate unique S3 key
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const s3Key = `${userId}/${folder ? folder.path.substring(1) + '/' : ''}${timestamp}-${randomSuffix}-${fileData.name}`;

      // Upload to S3
      const uploadCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: fileData.buffer,
        ContentType: fileData.mimeType,
        Metadata: {
          'original-name': fileData.originalName.replace(/[^\w\-_.]/g, '_'), // Sanitize filename
          'user-id': userId.toString(),
          'uploaded-at': new Date().toISOString(),
        },
      });

      await s3Client.send(uploadCommand);

      // Create file record in database
      const filePath = folder ? `${folder.path}/${fileData.name}` : `/${fileData.name}`;
      
      const file = new File({
        name: fileData.name,
        originalName: fileData.originalName,
        size: fileData.size,
        mimeType: fileData.mimeType,
        s3Key,
        s3Bucket: bucketName,
        bucketType: isUsingDrivn ? 'drivn' : 'user',
        userId: new Types.ObjectId(userId),
        folderId: folder ? new Types.ObjectId(fileData.folderId!) : null,
        path: filePath,
        metadata: fileData.metadata || {},
        tags: fileData.tags || [],
      });

      await file.save();

      // Update user storage usage
      await User.findByIdAndUpdate(userId, {
        $inc: { storageUsed: fileData.size },
      });

      // Update folder file count and size if in folder
      if (folder) {
        await Folder.findByIdAndUpdate(folder._id, {
          $inc: { 
            fileCount: 1,
            totalSize: fileData.size,
          },
        });
      }

      return {
        success: true,
        file,
        message: 'File uploaded successfully.',
      };
    } catch (error) {
      console.error('File upload error:', error);
      return {
        success: false,
        message: 'Failed to upload file. Please try again.',
      };
    }
  }

  /**
   * Create a new folder
   */
  static async createFolder(userId: string, folderData: FolderCreateData): Promise<{ success: boolean; folder?: IFolder; message: string }> {
    try {
      await connectDB();

      // Validate parent folder if specified
      let parentFolder: IFolder | null = null;
      if (folderData.parentId) {
        parentFolder = await Folder.findOne({ _id: folderData.parentId, userId });
        if (!parentFolder) {
          return {
            success: false,
            message: 'Parent folder not found.',
          };
        }
      }

      // Check for duplicate folder name in same parent
      const existingFolder = await Folder.findOne({
        userId,
        parentId: folderData.parentId ? new Types.ObjectId(folderData.parentId) : null,
        name: folderData.name,
      });

      if (existingFolder) {
        return {
          success: false,
          message: 'A folder with this name already exists in the selected location.',
        };
      }

      // Create folder path
      const folderPath = parentFolder ? `${parentFolder.path}/${folderData.name}` : `/${folderData.name}`;

      // Create folder record
      const folder = new Folder({
        name: folderData.name,
        userId: new Types.ObjectId(userId),
        parentId: folderData.parentId ? new Types.ObjectId(folderData.parentId) : null,
        path: folderPath,
        color: folderData.color,
        description: folderData.description,
      });

      await folder.save();

      // Create folder marker in S3
      try {
        const s3Client = await getS3Client(userId);
        const bucketName = await getS3BucketName(userId);

        if (s3Client && bucketName) {
          const folderKey = `${userId}${folderPath}/`;

          const putCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: folderKey,
            Body: '',
            ContentType: 'application/x-directory',
            Metadata: {
              'folder-name': folderData.name,
              'user-id': userId,
              'created-at': new Date().toISOString(),
            },
          });

          await s3Client.send(putCommand);
          console.log(`Created folder marker in S3: ${folderKey}`);
        }
      } catch (error) {
        console.warn('Failed to create folder marker in S3:', error);
        // Don't fail the entire operation if S3 folder creation fails
      }

      // Update parent folder count if applicable
      if (parentFolder) {
        await Folder.findByIdAndUpdate(parentFolder._id, {
          $inc: { folderCount: 1 },
        });
      }

      return {
        success: true,
        folder,
        message: 'Folder created successfully.',
      };
    } catch (error) {
      console.error('Folder creation error:', error);
      return {
        success: false,
        message: 'Failed to create folder. Please try again.',
      };
    }
  }

  /**
   * Get files and folders in a specific folder (or root)
   */
  static async getFolderContents(userId: string, folderId?: string): Promise<{
    files: IFile[];
    folders: IFolder[];
    currentFolder?: IFolder;
    breadcrumbs: Array<{ id: string; name: string; path: string }>;
  }> {
    try {
      await connectDB();

      let currentFolder: IFolder | null = null;
      let breadcrumbs: Array<{ id: string; name: string; path: string }> = [
        { id: 'root', name: 'My Files', path: '/' }
      ];

      if (folderId && folderId !== 'root') {
        currentFolder = await Folder.findOne({ _id: folderId, userId });
        if (currentFolder) {
          // Build breadcrumbs
          const pathParts = currentFolder.path.split('/').filter(Boolean);
          let currentPath = '';
          
          for (const part of pathParts) {
            currentPath += `/${part}`;
            const folder = await Folder.findOne({ userId, path: currentPath });
            if (folder) {
              breadcrumbs.push({
                id: folder._id.toString(),
                name: folder.name,
                path: folder.path,
              });
            }
          }
        }
      }

      // Get folders in current location
      const folders = await Folder.find({
        userId,
        parentId: currentFolder ? currentFolder._id : null,
      }).sort({ name: 1 });

      // Get files in current location
      const files = await File.find({
        userId,
        folderId: currentFolder ? currentFolder._id : null,
      }).sort({ name: 1 });

      return {
        files,
        folders,
        currentFolder: currentFolder || undefined,
        breadcrumbs,
      };
    } catch (error) {
      console.error('Error getting folder contents:', error);
      return {
        files: [],
        folders: [],
        breadcrumbs: [{ id: 'root', name: 'My Files', path: '/' }],
      };
    }
  }

  /**
   * Get recent files for dashboard
   */
  static async getRecentFiles(userId: string, limit: number = 10): Promise<IFile[]> {
    try {
      await connectDB();
      return await File.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('folderId', 'name path');
    } catch (error) {
      console.error('Error getting recent files:', error);
      return [];
    }
  }

  /**
   * Get storage statistics for user
   */
  static async getStorageStats(userId: string): Promise<{
    totalFiles: number;
    totalFolders: number;
    storageUsed: number;
    storageQuota: number;
    bucketType: 'user' | 'drivn' | 'mixed';
    platformStorageUsed?: number;
    userStorageUsed?: number;
    canUseDrivnS3?: boolean;
    hasOwnS3Config?: boolean;
  }> {
    try {
      await connectDB();

      const [fileStats, bucketStats, folderCount, user] = await Promise.all([
        File.aggregate([
          { $match: { userId: new Types.ObjectId(userId) } },
          {
            $group: {
              _id: null,
              totalFiles: { $sum: 1 },
              totalSize: { $sum: '$size' },
              bucketTypes: { $addToSet: '$bucketType' },
            },
          },
        ]),
        File.aggregate([
          { $match: { userId: new Types.ObjectId(userId) } },
          {
            $group: {
              _id: '$bucketType',
              totalSize: { $sum: '$size' },
              fileCount: { $sum: 1 },
            },
          },
        ]),
        Folder.countDocuments({ userId }),
        User.findById(userId),
      ]);

      const stats = fileStats[0] || { totalFiles: 0, totalSize: 0, bucketTypes: [] };

      // Calculate storage by bucket type
      const platformStorage = bucketStats.find(b => b._id === 'drivn');
      const userStorage = bucketStats.find(b => b._id === 'user');

      let bucketType: 'user' | 'drivn' | 'mixed' = 'user';
      if (stats.bucketTypes.length > 1) {
        bucketType = 'mixed';
      } else if (stats.bucketTypes.includes('drivn')) {
        bucketType = 'drivn';
      }

      // Check if user has S3 config
      const hasOwnS3Config = !!(user?.s3Config?.bucket && user?.s3Config?.accessKeyId);

      return {
        totalFiles: stats.totalFiles,
        totalFolders: folderCount,
        storageUsed: stats.totalSize,
        storageQuota: user?.storageQuota || 15 * 1024 * 1024 * 1024, // 15GB default
        bucketType,
        platformStorageUsed: platformStorage?.totalSize || 0,
        userStorageUsed: userStorage?.totalSize || 0,
        canUseDrivnS3: user?.canUseDrivnS3 || false,
        hasOwnS3Config,
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        totalFiles: 0,
        totalFolders: 0,
        storageUsed: 0,
        storageQuota: 15 * 1024 * 1024 * 1024,
        bucketType: 'user',
        platformStorageUsed: 0,
        userStorageUsed: 0,
        canUseDrivnS3: false,
        hasOwnS3Config: false,
      };
    }
  }

  /**
   * Rename a file
   */
  static async renameFile(userId: string, fileId: string, newName: string): Promise<{ success: boolean; message: string }> {
    try {
      await connectDB();

      const file = await File.findOne({ _id: fileId, userId });
      if (!file) {
        return {
          success: false,
          message: 'File not found.',
        };
      }

      // Validate new name
      if (!newName.trim()) {
        return {
          success: false,
          message: 'File name cannot be empty.',
        };
      }

      const trimmedName = newName.trim();
      if (trimmedName === file.name) {
        return {
          success: true,
          message: 'File name unchanged.',
        };
      }

      // Check for duplicate name in same folder
      const existingFile = await File.findOne({
        userId,
        folderId: file.folderId,
        name: trimmedName,
        _id: { $ne: fileId },
      });

      if (existingFile) {
        return {
          success: false,
          message: 'A file with this name already exists in this location.',
        };
      }

      // Get S3 client and bucket
      const s3Client = await getS3Client(userId);
      const bucketName = await getS3BucketName(userId);

      if (!s3Client || !bucketName) {
        return {
          success: false,
          message: 'S3 configuration not found.',
        };
      }

      // Generate new S3 key with new name
      const oldKey = file.s3Key;
      const keyParts = oldKey.split('/');
      keyParts[keyParts.length - 1] = keyParts[keyParts.length - 1].replace(file.name, trimmedName);
      const newKey = keyParts.join('/');

      // Copy object to new key
      const copyCommand = new CopyObjectCommand({
        Bucket: bucketName,
        CopySource: `${bucketName}/${oldKey}`,
        Key: newKey,
        MetadataDirective: 'COPY',
      });

      await s3Client.send(copyCommand);

      // Delete old object
      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: oldKey,
      });

      await s3Client.send(deleteCommand);

      // Update database record
      const folder = file.folderId ? await Folder.findById(file.folderId) : null;
      const newPath = folder ? `${folder.path}/${trimmedName}` : `/${trimmedName}`;

      await File.findByIdAndUpdate(fileId, {
        name: trimmedName,
        s3Key: newKey,
        path: newPath,
      });

      return {
        success: true,
        message: 'File renamed successfully.',
      };
    } catch (error) {
      console.error('File rename error:', error);
      return {
        success: false,
        message: 'Failed to rename file. Please try again.',
      };
    }
  }

  /**
   * Rename a folder
   */
  static async renameFolder(userId: string, folderId: string, newName: string): Promise<{ success: boolean; message: string }> {
    try {
      await connectDB();

      const folder = await Folder.findOne({ _id: folderId, userId });
      if (!folder) {
        return {
          success: false,
          message: 'Folder not found.',
        };
      }

      // Validate new name
      if (!newName.trim()) {
        return {
          success: false,
          message: 'Folder name cannot be empty.',
        };
      }

      const trimmedName = newName.trim();
      if (trimmedName === folder.name) {
        return {
          success: true,
          message: 'Folder name unchanged.',
        };
      }

      // Check for duplicate name in same parent
      const existingFolder = await Folder.findOne({
        userId,
        parentId: folder.parentId,
        name: trimmedName,
        _id: { $ne: folderId },
      });

      if (existingFolder) {
        return {
          success: false,
          message: 'A folder with this name already exists in this location.',
        };
      }

      // Update folder name and path
      const oldPath = folder.path;
      const newPath = folder.parentId
        ? `${folder.path.substring(0, folder.path.lastIndexOf('/'))}/${trimmedName}`
        : `/${trimmedName}`;

      await Folder.findByIdAndUpdate(folderId, {
        name: trimmedName,
        path: newPath,
      });

      // Update all descendant folders' paths
      const descendants = await folder.getDescendants();
      for (const descendant of descendants) {
        const updatedPath = descendant.path.replace(oldPath, newPath);
        await Folder.findByIdAndUpdate(descendant._id, { path: updatedPath });
      }

      // Update all files in this folder and its descendants
      const filesToUpdate = await File.find({
        userId,
        path: { $regex: `^${oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` },
      });

      for (const file of filesToUpdate) {
        const updatedFilePath = file.path.replace(oldPath, newPath);
        await File.findByIdAndUpdate(file._id, { path: updatedFilePath });
      }

      return {
        success: true,
        message: 'Folder renamed successfully.',
      };
    } catch (error) {
      console.error('Folder rename error:', error);
      return {
        success: false,
        message: 'Failed to rename folder. Please try again.',
      };
    }
  }

  /**
   * Delete a file
   */
  static async deleteFile(userId: string, fileId: string): Promise<{ success: boolean; message: string }> {
    try {
      await connectDB();

      const file = await File.findOne({ _id: fileId, userId });
      if (!file) {
        return {
          success: false,
          message: 'File not found.',
        };
      }

      // Get S3 client and bucket
      const s3Client = await getS3Client(userId);
      const bucketName = await getS3BucketName(userId);

      if (!s3Client || !bucketName) {
        return {
          success: false,
          message: 'S3 configuration not found.',
        };
      }

      // Delete from S3
      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: file.s3Key,
      });

      await s3Client.send(deleteCommand);

      // Delete from database
      await File.findByIdAndDelete(fileId);

      // Update user storage usage
      await User.findByIdAndUpdate(userId, {
        $inc: { storageUsed: -file.size },
      });

      // Update folder file count and size if in folder
      if (file.folderId) {
        await Folder.findByIdAndUpdate(file.folderId, {
          $inc: {
            fileCount: -1,
            totalSize: -file.size,
          },
        });
      }

      return {
        success: true,
        message: 'File deleted successfully.',
      };
    } catch (error) {
      console.error('File delete error:', error);
      return {
        success: false,
        message: 'Failed to delete file. Please try again.',
      };
    }
  }

  /**
   * Delete a folder and all its contents
   */
  static async deleteFolder(userId: string, folderId: string): Promise<{ success: boolean; message: string }> {
    try {
      await connectDB();

      const folder = await Folder.findOne({ _id: folderId, userId });
      if (!folder) {
        return {
          success: false,
          message: 'Folder not found.',
        };
      }

      // Get S3 client and bucket
      const s3Client = await getS3Client(userId);
      const bucketName = await getS3BucketName(userId);

      if (!s3Client || !bucketName) {
        return {
          success: false,
          message: 'S3 configuration not found.',
        };
      }

      // Get all descendant folders
      const descendants = await folder.getDescendants();
      const allFolderIds = [folder._id, ...descendants.map(d => d._id)];

      // Get all files in this folder and its descendants
      const filesToDelete = await File.find({
        userId,
        folderId: { $in: allFolderIds },
      });

      let totalSizeDeleted = 0;

      // Delete all files from S3 and database
      for (const file of filesToDelete) {
        try {
          const deleteCommand = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: file.s3Key,
          });
          await s3Client.send(deleteCommand);
          totalSizeDeleted += file.size;
        } catch (error) {
          console.warn(`Failed to delete S3 object ${file.s3Key}:`, error);
        }
      }

      // Delete all files from database
      await File.deleteMany({
        userId,
        folderId: { $in: allFolderIds },
      });

      // Delete all folders from database (descendants first, then parent)
      for (const descendant of descendants.reverse()) {
        await Folder.findByIdAndDelete(descendant._id);
      }
      await Folder.findByIdAndDelete(folderId);

      // Update user storage usage
      if (totalSizeDeleted > 0) {
        await User.findByIdAndUpdate(userId, {
          $inc: { storageUsed: -totalSizeDeleted },
        });
      }

      // Update parent folder counts if applicable
      if (folder.parentId) {
        await Folder.findByIdAndUpdate(folder.parentId, {
          $inc: { folderCount: -1 },
        });
      }

      return {
        success: true,
        message: `Folder and ${filesToDelete.length} file(s) deleted successfully.`,
      };
    } catch (error) {
      console.error('Folder delete error:', error);
      return {
        success: false,
        message: 'Failed to delete folder. Please try again.',
      };
    }
  }

  /**
   * Get download URL for a file
   */
  static async getFileDownloadUrl(userId: string, fileId: string): Promise<{ success: boolean; url?: string; message: string }> {
    try {
      await connectDB();

      const file = await File.findOne({ _id: fileId, userId });
      if (!file) {
        return {
          success: false,
          message: 'File not found.',
        };
      }

      // Get S3 client and bucket
      const s3Client = await getS3Client(userId);
      const bucketName = await getS3BucketName(userId);

      if (!s3Client || !bucketName) {
        return {
          success: false,
          message: 'S3 configuration not found.',
        };
      }

      // Generate signed URL for download (valid for 1 hour)
      const getObjectCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: file.s3Key,
        ResponseContentDisposition: `attachment; filename="${file.originalName}"`,
      });

      const signedUrl = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 3600 });

      // Update download count and last accessed
      await File.findByIdAndUpdate(fileId, {
        $inc: { downloadCount: 1 },
        lastAccessedAt: new Date(),
      });

      return {
        success: true,
        url: signedUrl,
        message: 'Download URL generated successfully.',
      };
    } catch (error) {
      console.error('File download URL error:', error);
      return {
        success: false,
        message: 'Failed to generate download URL. Please try again.',
      };
    }
  }

  /**
   * Get preview URL for a file (inline display)
   */
  static async getFilePreviewUrl(userId: string, fileId: string): Promise<{ success: boolean; url?: string; message: string }> {
    try {
      await connectDB();

      const file = await File.findOne({ _id: fileId, userId });
      if (!file) {
        return {
          success: false,
          message: 'File not found.',
        };
      }

      // Check if file type supports preview
      const previewableTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/pdf',
        'text/plain', 'text/csv', 'application/json', 'application/xml',
      ];

      if (!previewableTypes.includes(file.mimeType)) {
        return {
          success: false,
          message: 'File type not supported for preview.',
        };
      }

      // Get S3 client and bucket
      const s3Client = await getS3Client(userId);
      const bucketName = await getS3BucketName(userId);

      if (!s3Client || !bucketName) {
        return {
          success: false,
          message: 'S3 configuration not found.',
        };
      }

      // Generate signed URL for preview (valid for 1 hour)
      const getObjectCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: file.s3Key,
        ResponseContentType: file.mimeType,
      });

      const signedUrl = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 3600 });

      // Update last accessed
      await File.findByIdAndUpdate(fileId, {
        lastAccessedAt: new Date(),
      });

      return {
        success: true,
        url: signedUrl,
        message: 'Preview URL generated successfully.',
      };
    } catch (error) {
      console.error('File preview URL error:', error);
      return {
        success: false,
        message: 'Failed to generate preview URL. Please try again.',
      };
    }
  }
}
