import mongoose, { Document } from 'mongoose';

export interface IProblemSetEnrollment {
  id: number;
  problemSetId: string; // store ProblemSet.id string
  userId: mongoose.Types.ObjectId;
  enrolledAt: Date;
  progress: number;
  completedProblems: number[];
  totalSubmissions: number;
  correctSubmissions: number;
  enrollmentType: 'admin' | 'qr'; // New field to track enrollment method
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

interface IProblemSetEnrollmentDocument extends Omit<IProblemSetEnrollment, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
  id: number;
}

const problemSetEnrollmentSchema = new mongoose.Schema<IProblemSetEnrollmentDocument>({
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  problemSetId: {
    type: String,
    required: [true, 'Problem set ID is required'],
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  },
  enrolledAt: {
    type: Date,
    default: Date.now,
  },
  progress: {
    type: Number,
    default: 0,
    min: [0, 'Progress cannot be negative'],
    max: [100, 'Progress cannot exceed 100'],
  },
  completedProblems: [{
    type: Number,
  }],
  totalSubmissions: {
    type: Number,
    default: 0,
    min: [0, 'Total submissions cannot be negative'],
  },
  correctSubmissions: {
    type: Number,
    default: 0,
    min: [0, 'Correct submissions cannot be negative'],
  },
  enrollmentType: {
    type: String,
    enum: ['admin', 'qr'],
    required: [true, 'Enrollment type is required'],
    default: 'qr', // Default to QR for backward compatibility
  },
  user: {
    firstName: String,
    lastName: String,
    email: String,
  },
}, {
  timestamps: true,
});

// Compound index for unique enrollment
problemSetEnrollmentSchema.index({ problemSetId: 1, userId: 1 }, { unique: true });
problemSetEnrollmentSchema.index({ id: 1 });

// Virtual for completion status
problemSetEnrollmentSchema.virtual('isCompleted').get(function() {
  return this.progress >= 100;
});

// Virtual for success rate
problemSetEnrollmentSchema.virtual('successRate').get(function() {
  return this.totalSubmissions > 0 ? (this.correctSubmissions / this.totalSubmissions) * 100 : 0;
});

// Method to mark problem as completed
problemSetEnrollmentSchema.methods.completeProblem = async function(problemId: number) {
  if (!this.completedProblems.includes(problemId)) {
    this.completedProblems.push(problemId);
    await this.save();
  }
  return this;
};

// Method to update progress
problemSetEnrollmentSchema.methods.updateProgress = async function(progress: number) {
  this.progress = Math.max(0, Math.min(100, progress));
  return await this.save();
};

// Method to increment submissions
problemSetEnrollmentSchema.methods.incrementSubmissions = async function(isCorrect: boolean = false) {
  this.totalSubmissions += 1;
  if (isCorrect) {
    this.correctSubmissions += 1;
  }
  return await this.save();
};

// Method to update user info
problemSetEnrollmentSchema.methods.updateUserInfo = async function(userInfo: { firstName?: string; lastName?: string; email?: string }) {
  this.user = { ...this.user, ...userInfo };
  return await this.save();
};

// Static method to find enrollments by problem set
problemSetEnrollmentSchema.statics.findByProblemSet = function(problemSetId: string) {
  return this.find({ problemSetId }).populate('user', 'firstName lastName email');
};

// Static method to find enrollments by user
problemSetEnrollmentSchema.statics.findByUser = function(userId: string | mongoose.Types.ObjectId) {
  return this.find({ userId });
};

// Static method to check if user is enrolled
problemSetEnrollmentSchema.statics.isEnrolled = async function(problemSetId: string, userId: string | mongoose.Types.ObjectId) {
  const enrollment = await this.findOne({ problemSetId, userId });
  return !!enrollment;
};

// Static method to get enrollment count for a problem set
problemSetEnrollmentSchema.statics.getEnrollmentCount = async function(problemSetId: string) {
  return await this.countDocuments({ problemSetId });
};

// Static method to get completion statistics
problemSetEnrollmentSchema.statics.getCompletionStats = async function(problemSetId: string) {
  const stats = await this.aggregate([
    { $match: { problemSetId } },
    {
      $group: {
        _id: null,
        totalEnrollments: { $sum: 1 },
        completedEnrollments: { $sum: { $cond: [{ $gte: ['$progress', 100] }, 1, 0] } },
        avgProgress: { $avg: '$progress' },
        avgSubmissions: { $avg: '$totalSubmissions' },
        avgCorrectSubmissions: { $avg: '$correctSubmissions' }
      }
    }
  ]);
  
  return stats.length > 0 ? stats[0] : {
    totalEnrollments: 0,
    completedEnrollments: 0,
    avgProgress: 0,
    avgSubmissions: 0,
    avgCorrectSubmissions: 0
  };
};

export const ProblemSetEnrollment = mongoose.model<IProblemSetEnrollmentDocument>('ProblemSetEnrollment', problemSetEnrollmentSchema); 