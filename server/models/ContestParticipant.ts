import mongoose, { Document } from 'mongoose';

export interface IContestParticipant {
  id: string;
  contestId: string;
  userId: string; // store as string to match req.user.id
  registrationTime: Date;
  totalScore: number;
  totalPenalty: number;
  submissions: string[]; // submission ids
  problemsAttempted: string[];
  problemsSolved: string[];
  isDisqualified: boolean;
  rank?: number;
  contestEndMethod?: 'manually_ended' | 'time_expired' | null;
  enrollmentType: 'admin' | 'qr'; // New field to track enrollment method
}

interface IContestParticipantDocument extends Omit<IContestParticipant, 'id'>, Document {
  id: string;
}

const contestParticipantSchema = new mongoose.Schema<IContestParticipantDocument>({
  id: { type: String, required: true, unique: true, index: true },
  contestId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  registrationTime: { type: Date, default: Date.now },
  totalScore: { type: Number, default: 0 },
  totalPenalty: { type: Number, default: 0 },
  submissions: { type: [String], default: [] },
  problemsAttempted: { type: [String], default: [] },
  problemsSolved: { type: [String], default: [] },
  isDisqualified: { type: Boolean, default: false },
  rank: { type: Number },
  contestEndMethod: { type: String, enum: ['manually_ended', 'time_expired', null], default: null },
  enrollmentType: { 
    type: String, 
    enum: ['admin', 'qr'], 
    required: [true, 'Enrollment type is required'],
    default: 'qr' // Default to QR for backward compatibility
  },
}, { timestamps: true });

contestParticipantSchema.index({ contestId: 1, userId: 1 }, { unique: true });

export const ContestParticipant = mongoose.model<IContestParticipantDocument>('ContestParticipant', contestParticipantSchema); 