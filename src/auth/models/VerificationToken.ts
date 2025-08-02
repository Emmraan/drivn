import mongoose, { Document, Schema } from 'mongoose';

export interface IVerificationToken extends Document {
  _id: string;
  email: string;
  token: string;
  expires: Date;
  createdAt: Date;
}

const VerificationTokenSchema = new Schema<IVerificationToken>({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  expires: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  },
}, {
  timestamps: true,
});

// Indexes for performance and cleanup
VerificationTokenSchema.index({ email: 1 });
VerificationTokenSchema.index({ token: 1 });
VerificationTokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired tokens

export default mongoose.models.VerificationToken || mongoose.model<IVerificationToken>('VerificationToken', VerificationTokenSchema);
