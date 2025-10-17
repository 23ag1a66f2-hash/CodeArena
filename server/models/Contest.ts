import mongoose, { Document } from 'mongoose';

export interface IContestProblem {
  id: string;
  originalProblemId?: number | string;
  title?: string;
  description?: string;
  difficulty?: string;
  points?: number;
  order?: number;
  timeLimit?: number;
  memoryLimit?: number;
  constraints?: string;
  inputFormat?: string;
  outputFormat?: string;
  maxSubmissions?: number;
  partialScoring?: boolean;
  customTestCases?: any[];
  customExamples?: any[];
  customStarterCode?: any;
  tags?: string[];
  notes?: string;
  examples?: any[];
  testCases?: any[];
  starterCode?: any;
}

export interface IContestAnnouncement {
  id: string;
  message: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high';
  isGlobal?: boolean;
}

export interface IContest {
  id: string;
  title: string;
  description?: string;
  status?: string;
  type?: string;
  visibility?: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number; // contest duration in minutes
  timeZone?: string;
  contestEndMethod?: 'manually_ended' | 'time_expired' | null;
  allowDirectEnrollment?: boolean; // Feature flag for QR/link enrollment
  participants?: string[]; // Array of user IDs enrolled in the contest
  problems: IContestProblem[];
  announcements: IContestAnnouncement[];
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface IContestDocument extends Omit<IContest, 'id'>, Document {
  id: string;
}

const contestProblemSchema = new mongoose.Schema<IContestProblem>({
  id: { type: String, required: true },
  originalProblemId: { type: mongoose.Schema.Types.Mixed },
  title: String,
  description: String,
  difficulty: String,
  points: { type: Number, default: 0 },
  order: Number,
  timeLimit: Number,
  memoryLimit: Number,
  constraints: String,
  inputFormat: String,
  outputFormat: String,
  maxSubmissions: Number,
  partialScoring: { type: Boolean, default: false },
  customTestCases: [mongoose.Schema.Types.Mixed],
  customExamples: [mongoose.Schema.Types.Mixed],
  customStarterCode: mongoose.Schema.Types.Mixed,
  tags: [String],
  notes: String,
  examples: [mongoose.Schema.Types.Mixed],
  testCases: [mongoose.Schema.Types.Mixed],
  starterCode: mongoose.Schema.Types.Mixed,
}, { _id: false });

const contestAnnouncementSchema = new mongoose.Schema<IContestAnnouncement>({
  id: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  isGlobal: { type: Boolean, default: true },
}, { _id: false });

const contestSchema = new mongoose.Schema<IContestDocument>({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: String,
  status: String,
  type: String,
  visibility: String,
  startTime: Date,
  endTime: Date,
  duration: Number, // contest duration in minutes
  timeZone: { type: String, default: 'UTC' },
  contestEndMethod: { type: String, enum: ['manually_ended', 'time_expired', null], default: null },
  // Feature flag for QR/link enrollment
  allowDirectEnrollment: { type: Boolean, default: false },
  participants: [String], // Array of user IDs enrolled in the contest
  problems: { type: [contestProblemSchema], default: [] },
  announcements: { type: [contestAnnouncementSchema], default: [] },
  createdBy: String,
}, { timestamps: true });

contestSchema.index({ visibility: 1, status: 1, type: 1, createdAt: -1 });

export const Contest = mongoose.model<IContestDocument>('Contest', contestSchema); 