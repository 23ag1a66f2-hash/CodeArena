import mongoose, { Document } from 'mongoose';

export interface IContestQuestion {
  id: string;
  contestId: string;
  userId: string;
  problemId?: string;
  question: string;
  answer?: string;
  answeredBy?: string;
  answeredAt?: Date;
  timestamp: Date;
  status: 'pending' | 'answered';
  isPublic: boolean;
}

interface IContestQuestionDocument extends Omit<IContestQuestion, 'id'>, Document {
  id: string;
}

const contestQuestionSchema = new mongoose.Schema<IContestQuestionDocument>({
  id: { type: String, required: true, unique: true, index: true },
  contestId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  problemId: { type: String },
  question: { type: String, required: true },
  answer: { type: String },
  answeredBy: { type: String },
  answeredAt: { type: Date },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'answered'], default: 'pending' },
  isPublic: { type: Boolean, default: false },
}, { timestamps: true });

contestQuestionSchema.index({ contestId: 1, timestamp: -1 });

export const ContestQuestion = mongoose.model<IContestQuestionDocument>('ContestQuestion', contestQuestionSchema); 