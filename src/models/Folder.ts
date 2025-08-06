import mongoose, { Document, Schema, Types } from "mongoose";

export interface IFolder extends Document {
  _id: string;
  name: string;
  userId: Types.ObjectId;
  parentId?: Types.ObjectId;
  path: string;
  isPublic: boolean;
  color?: string;
  description?: string;
  fileCount: number;
  folderCount: number;
  totalSize: number;
  createdAt: Date;
  updatedAt: Date;
  updatePath(): Promise<void>;
  getDescendants(): Promise<IFolder[]>;
}

const FolderSchema = new Schema<IFolder>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'Folder',
    default: null,
    index: true,
  },
  path: {
    type: String,
    required: true,
    index: true,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  color: {
    type: String,
    match: /^#[0-9A-F]{6}$/i, // Hex color validation
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  fileCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  folderCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalSize: {
    type: Number,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
});

// Indexes for performance
FolderSchema.index({ userId: 1, parentId: 1 });
FolderSchema.index({ userId: 1, path: 1 });
FolderSchema.index({ userId: 1, name: 1 });
FolderSchema.index({ createdAt: -1 });

// Compound unique index to prevent duplicate folder names in same parent
FolderSchema.index({ userId: 1, parentId: 1, name: 1 }, { unique: true });

// Pre-save middleware to update path
FolderSchema.pre('save', async function(next) {
  if (this.isModified('name') || this.isModified('parentId')) {
    await this.updatePath();
  }
  next();
});

// Method to update folder path
FolderSchema.methods.updatePath = async function() {
  if (!this.parentId) {
    this.path = `/${this.name}`;
  } else {
    const parent = await mongoose.model('Folder').findById(this.parentId);
    if (parent) {
      this.path = `${parent.path}/${this.name}`;
    } else {
      this.path = `/${this.name}`;
    }
  }
};

// Method to get all descendant folders
FolderSchema.methods.getDescendants = async function() {
  const descendants = [];
  const queue = [this._id];
  
  while (queue.length > 0) {
    const currentId = queue.shift();
    const children = await mongoose.model('Folder').find({ parentId: currentId });
    
    for (const child of children) {
      descendants.push(child);
      queue.push(child._id);
    }
  }
  
  return descendants;
};

// Static method to rebuild path for all folders (maintenance)
FolderSchema.statics.rebuildPaths = async function(userId?: string) {
  const query = userId ? { userId } : {};
  const folders = await this.find(query).sort({ path: 1 });

  for (const folder of folders) {
    await folder.updatePath();
    await folder.save();
  }
};

export default mongoose.models.Folder || mongoose.model<IFolder>('Folder', FolderSchema);
