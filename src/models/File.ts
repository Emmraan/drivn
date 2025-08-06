import mongoose, { Document, Schema, Types } from "mongoose";

export interface IFile extends Document {
  _id: string;
  name: string;
  originalName: string;
  size: number;
  mimeType: string;
  s3Key: string;
  s3Bucket: string;
  bucketType: 'user' | 'drivn';
  userId: Types.ObjectId;
  folderId?: Types.ObjectId;
  path: string;
  isPublic: boolean;
  downloadCount: number;
  lastAccessedAt?: Date;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    [key: string]: string | number | boolean | undefined;
  };
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const FileSchema = new Schema<IFile>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  originalName: {
    type: String,
    required: true,
    trim: true,
  },
  size: {
    type: Number,
    required: true,
    min: 0,
  },
  mimeType: {
    type: String,
    required: true,
  },
  s3Key: {
    type: String,
    required: true,
    unique: true,
  },
  s3Bucket: {
    type: String,
    required: true,
  },
  bucketType: {
    type: String,
    enum: ['user', 'drivn'],
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  folderId: {
    type: Schema.Types.ObjectId,
    ref: 'Folder',
    default: null,
  },
  path: {
    type: String,
    required: true,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  downloadCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  lastAccessedAt: {
    type: Date,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
  tags: [{
    type: String,
    trim: true,
  }],
}, {
  timestamps: true,
});

// Indexes for performance
FileSchema.index({ userId: 1, folderId: 1 });
FileSchema.index({ userId: 1, path: 1 });
FileSchema.index({ userId: 1, name: 1 });
FileSchema.index({ userId: 1, mimeType: 1 });
// Note: s3Key index is already created by unique: true in field definition
FileSchema.index({ createdAt: -1 });

// Virtual for file URL (will be implemented in service layer)
FileSchema.virtual('url').get(function() {
  return `/api/files/${this._id}/download`;
});

// Ensure virtual fields are serialized
FileSchema.set('toJSON', { virtuals: true });

export default mongoose.models.File || mongoose.model<IFile>('File', FileSchema);
