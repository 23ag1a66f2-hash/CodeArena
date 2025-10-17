import mongoose, { Document } from 'mongoose';

export interface ISubmission {
  id: number;
  problemId: number;
  problemInstanceId?: string; // Track specific problem instance
  problemSetId?: string; // Link to the assignment/problem set
  userId: string;
  code: string;
  language: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'accepted' | 'partial' | 'wrong_answer' | 'error';
  runtime?: number;
  memory?: number;
  score?: string;
  feedback?: string;
  testResults?: any[];
  isTest?: boolean;
  submittedAt: Date;
}

interface ISubmissionDocument extends Omit<ISubmission, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
  id: number;
}

const submissionSchema = new mongoose.Schema<ISubmissionDocument>({
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  problemId: {
    type: Number,
    required: [true, 'Problem ID is required'],
    index: true,
  },
  problemInstanceId: {
    type: String,
    required: false, // Optional for backward compatibility
    index: true,
  },
  problemSetId: {
    type: String,
    required: false, // Optional for backward compatibility
    index: true,
  },
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    index: true,
  },
  code: {
    type: String,
    required: [true, 'Code is required'],
  },
  language: {
    type: String,
    required: [true, 'Language is required'],
    enum: {
      values: ['javascript', 'python', 'java', 'cpp', 'c'],
      message: '{VALUE} is not a supported language'
    },
  },
  status: {
    type: String,
    required: true,
    enum: {
      values: ['pending', 'running', 'completed', 'failed', 'accepted', 'partial', 'wrong_answer', 'error'],
      message: '{VALUE} is not a valid status'
    },
    default: 'pending',
  },
  runtime: {
    type: Number,
    min: [0, 'Runtime cannot be negative'],
  },
  memory: {
    type: Number,
    min: [0, 'Memory usage cannot be negative'],
  },
  score: {
    type: String,
  },
  feedback: {
    type: String,
    trim: true,
  },
  testResults: [{
    type: mongoose.Schema.Types.Mixed,
  }],
  isTest: {
    type: Boolean,
    default: false,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
submissionSchema.index({ id: 1 });
submissionSchema.index({ problemId: 1, userId: 1 });
submissionSchema.index({ problemInstanceId: 1, userId: 1 }); // New index for instance-specific queries
submissionSchema.index({ problemSetId: 1, userId: 1 }); // New index for set-specific queries
submissionSchema.index({ userId: 1, submittedAt: -1 });
submissionSchema.index({ status: 1 });
submissionSchema.index({ submittedAt: -1 });

// Virtual for submission result
submissionSchema.virtual('isSuccessful').get(function() {
  return this.status === 'completed' && this.score === '100%';
});

// Virtual for execution time in seconds
submissionSchema.virtual('executionTimeSeconds').get(function() {
  return this.runtime ? (this.runtime / 1000).toFixed(3) : null;
});

// Method to update submission status
submissionSchema.methods.updateStatus = async function(status: string, feedback?: string) {
  this.status = status;
  if (feedback) this.feedback = feedback;
  return await this.save();
};

// Method to set test results
submissionSchema.methods.setTestResults = async function(testResults: any[]) {
  this.testResults = testResults;
  return await this.save();
};

// Static method to find submissions by user
submissionSchema.statics.findByUser = function(userId: string) {
  return this.find({ userId }).sort({ submittedAt: -1 });
};

// Static method to find submissions by problem
submissionSchema.statics.findByProblem = function(problemId: number) {
  return this.find({ problemId }).sort({ submittedAt: -1 });
};

// Static method to find successful submissions
submissionSchema.statics.findSuccessful = function(userId: string, problemId?: number) {
  const query: any = { userId, status: 'completed', score: '100%' };
  if (problemId) query.problemId = problemId;
  return this.find(query);
};

// Static method to get submission statistics
submissionSchema.statics.getStats = async function(userId?: string) {
  const matchStage = userId ? { userId } : {};
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgRuntime: { $avg: '$runtime' },
        avgMemory: { $avg: '$memory' }
      }
    }
  ]);
  return stats;
};

// Middleware to cleanup enrollment when submissions are deleted
submissionSchema.pre('deleteOne', { document: true, query: false }, async function() {
  try {
    const submission = this;
    await cleanupEnrollmentAfterSubmissionDeletion(submission);
  } catch (error) {
    console.error('Error in deleteOne middleware:', error);
  }
});

submissionSchema.pre('deleteMany', { document: false, query: true }, async function() {
  try {
    const submissions = await this.model.find(this.getQuery());
    for (const submission of submissions) {
      await cleanupEnrollmentAfterSubmissionDeletion(submission);
    }
  } catch (error) {
    console.error('Error in deleteMany middleware:', error);
  }
});

// Helper function to cleanup enrollment after submission deletion
async function cleanupEnrollmentAfterSubmissionDeletion(submission: any) {
  try {
    const { ProblemSetEnrollment } = await import('./ProblemSetEnrollment');
    const { ProblemSet } = await import('./ProblemSet');
    
    // Determine the problemSetId from the submission
    let problemSetId = submission.problemSetId;
    if (!problemSetId && submission.problemInstanceId) {
      const ps = await ProblemSet.findOne({ 'problemInstances._id': submission.problemInstanceId }).lean();
      if (ps) {
        problemSetId = ps.id || ps._id;
      }
    }
    
    if (problemSetId) {
      const enrollment = await ProblemSetEnrollment.findOne({ 
        problemSetId, 
        userId: submission.userId 
      });
      
      if (enrollment) {
        // Decrement total submissions
        enrollment.totalSubmissions = Math.max(0, enrollment.totalSubmissions - 1);
        
        // If the deleted submission was accepted, decrement correct submissions and remove from completed problems
        if (submission.status === 'accepted') {
          enrollment.correctSubmissions = Math.max(0, enrollment.correctSubmissions - 1);
          
          const problemId = submission.problemId;
          enrollment.completedProblems = enrollment.completedProblems.filter(id => id !== problemId);
        }
        
        // Recalculate progress
        const ps = await ProblemSet.findOne({ id: problemSetId }).lean();
        if (ps) {
          const totalProblems = ps.problemInstances?.length || (ps as any).problems?.length || 0;
          const progress = totalProblems > 0 ? Math.min(100, Math.round((enrollment.completedProblems.length / totalProblems) * 100)) : 0;
          enrollment.progress = progress;
        }
        
        // Update timestamp
        (enrollment as any).updatedAt = new Date();
        
        await enrollment.save();
        
        console.log(`[ENROLLMENT] Cleaned up enrollment after submission deletion: user ${submission.userId}, problem set ${problemSetId}, progress=${enrollment.progress}%, completed=${enrollment.completedProblems.length}, totalSubmissions=${enrollment.totalSubmissions}, correctSubmissions=${enrollment.correctSubmissions}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up enrollment after submission deletion:', error);
  }
}

export const Submission = mongoose.model<ISubmissionDocument>('Submission', submissionSchema); 