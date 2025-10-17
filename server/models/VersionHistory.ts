import mongoose, { Document, Schema } from 'mongoose';

export type VersionEntityType =
  | 'problem'
  | 'problemSet'
  | 'course'
  | 'courseModule'
  | 'user'
  | 'contest'
  | 'enrollment'
  | 'announcement'
  | 'other';

export interface IVersionHistory {
  action: string;
  description?: string;
  entityType: VersionEntityType;
  entityId?: string;
  metadata?: Record<string, any>;
  adminId: mongoose.Types.ObjectId;
  adminName?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface IVersionHistoryDocument extends IVersionHistory, Document {
  _id: mongoose.Types.ObjectId;
}

const VersionHistorySchema = new Schema<IVersionHistoryDocument>(
  {
    action: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    entityType: {
      type: String,
      enum: ['problem', 'problemSet', 'course', 'courseModule', 'user', 'contest', 'enrollment', 'announcement', 'other'],
      required: true,
    },
    entityId: { type: String },
    metadata: { type: Schema.Types.Mixed },
    adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    adminName: { type: String },
  },
  { timestamps: true }
);

VersionHistorySchema.index({ createdAt: -1 });
VersionHistorySchema.index({ entityType: 1, createdAt: -1 });
VersionHistorySchema.index({ adminId: 1, createdAt: -1 });

export const VersionHistory = mongoose.model<IVersionHistoryDocument>('VersionHistory', VersionHistorySchema); 