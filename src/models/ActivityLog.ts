import mongoose, { Document, Schema, Types, Model } from 'mongoose';

export interface IActivityLog extends Document {
  _id: string;
  userId: Types.ObjectId;
  action: 'upload' | 'download' | 'delete' | 'create_folder' | 'delete_folder' | 'rename';
  fileName: string;
  filePath?: string;
  fileSize?: number;
  mimeType?: string;
  s3Key?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface IActivityLogModel extends Model<IActivityLog> {
  logActivity(
    userId: string,
    action: string,
    fileName: string,
    options?: {
      filePath?: string;
      fileSize?: number;
      mimeType?: string;
      s3Key?: string;
      metadata?: Record<string, unknown>;
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<IActivityLog | null>;

  getUserStats(
    userId: string,
    timeRange?: '7d' | '30d' | '90d'
  ): Promise<Record<string, { count: number; totalSize: number }>>;

  getRecentActivity(
    userId: string,
    limit?: number
  ): Promise<IActivityLog[]>;
}

const ActivityLogSchema = new Schema<IActivityLog>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  action: {
    type: String,
    enum: ['upload', 'download', 'delete', 'create_folder', 'delete_folder', 'rename'],
    required: true,
    index: true,
  },
  fileName: {
    type: String,
    required: true,
    trim: true,
  },
  filePath: {
    type: String,
    trim: true,
  },
  fileSize: {
    type: Number,
    min: 0,
  },
  mimeType: {
    type: String,
    trim: true,
  },
  s3Key: {
    type: String,
    trim: true,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  ipAddress: {
    type: String,
    trim: true,
  },
  userAgent: {
    type: String,
    trim: true,
  },
}, {
  timestamps: false, // We use our own timestamp field
});

// Indexes for performance
ActivityLogSchema.index({ userId: 1, timestamp: -1 });
ActivityLogSchema.index({ userId: 1, action: 1, timestamp: -1 });
ActivityLogSchema.index({ timestamp: -1 }); // For cleanup operations

// TTL index to automatically delete old logs after 1 year
ActivityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Static method to log activity
ActivityLogSchema.statics.logActivity = async function(
  userId: string,
  action: string,
  fileName: string,
  options: {
    filePath?: string;
    fileSize?: number;
    mimeType?: string;
    s3Key?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  } = {}
) {
  try {
    const log = new this({
      userId: new Types.ObjectId(userId),
      action,
      fileName,
      ...options,
    });
    await log.save();
    return log;
  } catch (error) {
    console.error('Failed to log activity:', error);
    return null;
  }
};

// Static method to get user activity stats
ActivityLogSchema.statics.getUserStats = async function(
  userId: string,
  timeRange: '7d' | '30d' | '90d' = '30d'
) {
  const now = new Date();
  let startDate: Date;
  
  switch (timeRange) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
  }

  const stats = await this.aggregate([
    {
      $match: {
        userId: new Types.ObjectId(userId),
        timestamp: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        totalSize: { $sum: '$fileSize' }
      }
    }
  ]);

  return stats.reduce((acc: Record<string, { count: number; totalSize: number }>, stat: { _id: string; count: number; totalSize: number }) => {
    acc[stat._id] = {
      count: stat.count,
      totalSize: stat.totalSize || 0
    };
    return acc;
  }, {});
};

// Static method to get recent activity
ActivityLogSchema.statics.getRecentActivity = async function(
  userId: string,
  limit: number = 10
) {
  return this.find({ userId: new Types.ObjectId(userId) })
    .sort({ timestamp: -1 })
    .limit(limit)
    .select('action fileName timestamp fileSize mimeType');
};

export default mongoose.models.ActivityLog || mongoose.model<IActivityLog, IActivityLogModel>('ActivityLog', ActivityLogSchema);
