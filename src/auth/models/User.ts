import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  email: string;
  password?: string;
  name: string;
  image?: string;
  emailVerified?: Date;
  provider: 'credentials' | 'google';
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
  storageQuota?: number;
  storageUsed?: number;
  s3Config?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
    bucket?: string;
    endpoint?: string;
  };
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: function(this: IUser) {
      return this.provider === 'credentials';
    },
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  image: {
    type: String,
  },
  emailVerified: {
    type: Date,
  },
  provider: {
    type: String,
    enum: ['credentials', 'google'],
    default: 'credentials',
  },
  googleId: {
    type: String,
    sparse: true,
  },
  // Future S3 integration fields
  storageQuota: {
    type: Number,
    default: 5 * 1024 * 1024 * 1024, // 5GB default
  },
  storageUsed: {
    type: Number,
    default: 0,
  },
  s3Config: {
    accessKeyId: String,
    secretAccessKey: String,
    region: String,
    bucket: String,
    endpoint: String,
  },
}, {
  timestamps: true,
});

UserSchema.index({ provider: 1 });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
