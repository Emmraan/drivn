import mongoose, { Document, Schema } from "mongoose";

export interface IResetToken extends Document {
  _id: string;
  email: string;
  token: string;
  expires: Date;
  createdAt: Date;
}

const ResetTokenSchema = new Schema<IResetToken>(
  {
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
      default: () => new Date(Date.now() + 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
  }
);

ResetTokenSchema.index({ email: 1 });
ResetTokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.ResetToken ||
  mongoose.model<IResetToken>("ResetToken", ResetTokenSchema);
