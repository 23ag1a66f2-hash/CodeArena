import mongoose, { Document } from 'mongoose';

export interface IContestSubmission {
  id: string;
  contestId: string;
  problemId: string;
  userId: string;
  code: string;
  language: string;
  status: string;
  points?: number;
  runtime?: number;
  memory?: number;
  submissionTime: Date;
  penalty: number;
  isContestSubmission: boolean;
}

interface IContestSubmissionDocument extends Omit<IContestSubmission, 'id'>, Document {
  id: string;
}

const contestSubmissionSchema = new mongoose.Schema<IContestSubmissionDocument>({
  id: { type: String, required: true, unique: true, index: true },
  contestId: { type: String, required: true, index: true },
  problemId: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  code: { type: String, required: true },
  language: { type: String, required: true },
  status: { type: String, required: true },
  points: { type: Number, default: 0 },
  runtime: { type: Number },
  memory: { type: Number },
  submissionTime: { type: Date, default: Date.now },
  penalty: { type: Number, default: 0 },
  isContestSubmission: { type: Boolean, default: true },
}, { timestamps: true });

contestSubmissionSchema.index({ contestId: 1, userId: 1, submissionTime: -1 });

export const ContestSubmission = mongoose.model<IContestSubmissionDocument>('ContestSubmission', contestSubmissionSchema); 