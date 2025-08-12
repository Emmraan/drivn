import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  _id: string;
  email: string;
  password?: string;
  name: string;
  image?: string;
  emailVerified?: Date;
  provider: "credentials" | "google";
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
  s3Config?: {
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
    bucketName?: string;
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
    required: function (this: IUser) {
      return this.provider === "credentials";
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
    enum: ["credentials", "google"],
    default: "credentials",
  },
  googleId: {
    type: String,
    sparse: true,
  },
  // S3 integration fields
  s3Config: {
    accessKeyId: String,
    secretAccessKey: String,
    region: String,
    bucketName: String,
    endpoint: String,
  },
}, {
  timestamps: true,
});

UserSchema.index({ provider: 1 });

export default mongoose.models.User ||
  mongoose.model<IUser>("User", UserSchema);
