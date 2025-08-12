import mongoose, { Document, Schema, Types, Model } from 'mongoose';

export interface IFileMetadata extends Document {
  _id: string;
  userId: Types.ObjectId;
  s3Key: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  lastModified: Date;
  tags?: string[];
  searchableContent?: string;
  isIndexed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFileMetadataModel extends Model<IFileMetadata> {
  syncFromS3Object(
    userId: string,
    s3Object: {
      Key: string;
      Size: number;
      LastModified: Date;
      ContentType?: string;
    }
  ): Promise<IFileMetadata>;

  searchFiles(
    userId: string,
    query: string,
    options?: {
      mimeType?: string;
      limit?: number;
      skip?: number;
    }
  ): Promise<IFileMetadata[]>;

  getStorageStats(userId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    avgSize: number;
  }>;

  getFileTypeStats(userId: string): Promise<Array<{ _id: string; count: number; size: number }>>;
}

const FileMetadataSchema = new Schema<IFileMetadata>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  s3Key: {
    type: String,
    required: true,
    trim: true,
  },
  fileName: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  filePath: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  fileSize: {
    type: Number,
    required: true,
    min: 0,
  },
  mimeType: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  lastModified: {
    type: Date,
    required: true,
    index: true,
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50,
  }],
  searchableContent: {
    type: String,
    trim: true,
  },
  isIndexed: {
    type: Boolean,
    default: false,
    index: true,
  },
}, {
  timestamps: true,
});

// Indexes for search and performance
FileMetadataSchema.index({ userId: 1, fileName: 'text', searchableContent: 'text' });
FileMetadataSchema.index({ userId: 1, mimeType: 1 });
FileMetadataSchema.index({ userId: 1, lastModified: -1 });
FileMetadataSchema.index({ userId: 1, fileSize: -1 });
FileMetadataSchema.index({ s3Key: 1 }, { unique: true });

// Virtual for file extension
FileMetadataSchema.virtual('extension').get(function() {
  const lastDot = this.fileName.lastIndexOf('.');
  return lastDot > 0 ? this.fileName.substring(lastDot + 1).toLowerCase() : '';
});

// Virtual for file category
FileMetadataSchema.virtual('category').get(function() {
  const mimeType = this.mimeType.toLowerCase();
  
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf')) return 'document';
  if (mimeType.includes('text/') || mimeType.includes('application/json')) return 'text';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return 'archive';
  
  return 'other';
});

// Static method to sync with S3 object
FileMetadataSchema.statics.syncFromS3Object = async function(
  userId: string,
  s3Object: {
    Key: string;
    Size: number;
    LastModified: Date;
    ContentType?: string;
  }
) {
  const fileName = s3Object.Key.split('/').pop() || s3Object.Key;
  const filePath = '/' + s3Object.Key.split('/').slice(1).join('/');
  
  const metadata = {
    userId: new Types.ObjectId(userId),
    s3Key: s3Object.Key,
    fileName,
    filePath,
    fileSize: s3Object.Size,
    mimeType: s3Object.ContentType || 'application/octet-stream',
    lastModified: s3Object.LastModified,
    isIndexed: false,
  };

  return this.findOneAndUpdate(
    { s3Key: s3Object.Key },
    metadata,
    { upsert: true, new: true }
  );
};

// Static method for search
FileMetadataSchema.statics.searchFiles = async function(
  userId: string,
  query: string,
  options: {
    mimeType?: string;
    limit?: number;
    skip?: number;
  } = {}
) {
  const { mimeType, limit = 20, skip = 0 } = options;
  
  const searchConditions: Record<string, unknown> = {
    userId: new Types.ObjectId(userId),
  };

  if (query) {
    searchConditions.$or = [
      { fileName: { $regex: query, $options: 'i' } },
      { searchableContent: { $regex: query, $options: 'i' } },
      { tags: { $in: [new RegExp(query, 'i')] } },
    ];
  }

  if (mimeType) {
    searchConditions.mimeType = { $regex: mimeType, $options: 'i' };
  }

  return this.find(searchConditions)
    .sort({ lastModified: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get storage stats
FileMetadataSchema.statics.getStorageStats = async function(userId: string) {
  const stats = await this.aggregate([
    { $match: { userId: new Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalFiles: { $sum: 1 },
        totalSize: { $sum: '$fileSize' },
        avgSize: { $avg: '$fileSize' },
      }
    }
  ]);

  return stats[0] || { totalFiles: 0, totalSize: 0, avgSize: 0 };
};

// Static method to get file type distribution
FileMetadataSchema.statics.getFileTypeStats = async function(userId: string) {
  return this.aggregate([
    { $match: { userId: new Types.ObjectId(userId) } },
    {
      $group: {
        _id: {
          $cond: [
            { $regexMatch: { input: '$mimeType', regex: /^image\// } },
            'Images',
            {
              $cond: [
                { $regexMatch: { input: '$mimeType', regex: /^video\// } },
                'Videos',
                {
                  $cond: [
                    { $regexMatch: { input: '$mimeType', regex: /^audio\// } },
                    'Audio',
                    {
                      $cond: [
                        { $regexMatch: { input: '$mimeType', regex: /pdf/ } },
                        'Documents',
                        'Other'
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        count: { $sum: 1 },
        size: { $sum: '$fileSize' }
      }
    }
  ]);
};

export default mongoose.models.FileMetadata || mongoose.model<IFileMetadata, IFileMetadataModel>('FileMetadata', FileMetadataSchema);
