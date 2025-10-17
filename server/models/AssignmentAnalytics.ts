import mongoose, { Document } from 'mongoose';

export interface IAssignmentAnalytics {
  id: number;
  assignmentId: number;
  userId: string;
  courseId?: number;
  moduleId?: number;
  
  // Overall assignment performance
  totalScore: number;
  maxScore: number;
  percentageScore: number;
  attemptNumber: number;
  timeSpent: number; // in minutes
  submittedAt: Date;
  gradedAt?: Date;
  
  // Question-level analytics
  questionAnalytics: Array<{
    questionId: string;
    questionType: 'mcq' | 'coding' | 'essay' | 'multiple-choice';
    score: number;
    maxScore: number;
    timeSpent: number; // in minutes
    attempts: number;
    isCorrect: boolean;
    feedback?: string;
    difficultyRating?: number; // 1-5 scale
    learningOutcome?: string;
    conceptTags?: string[];
  }>;
  
  // Learning analytics
  learningOutcomes: Array<{
    outcome: string;
    achieved: boolean;
    confidence: number; // 0-100
    timeToMastery?: number; // in minutes
  }>;
  
  // Engagement metrics
  engagementMetrics: {
    timeOnAssignment: number; // total time spent
    timeOnQuestions: number[]; // time per question
    revisits: number; // number of times user returned to assignment
    lastActivity: Date;
    completionRate: number; // percentage of questions attempted
  };
  
  // Performance trends
  performanceTrends: {
    improvementFromPrevious: number; // percentage improvement
    consistencyScore: number; // 0-100, measures consistency across questions
    timeEfficiency: number; // score/time ratio
    accuracyRate: number; // correct answers / total attempts
  };
  
  // Comparative analytics
  comparativeAnalytics: {
    classAverage: number;
    classRank: number;
    percentile: number;
    performanceCategory: 'excellent' | 'good' | 'average' | 'needs-improvement';
  };
  
  // Metadata
  metadata: {
    deviceType?: string;
    browser?: string;
    ipAddress?: string;
    sessionId?: string;
    userAgent?: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

interface IAssignmentAnalyticsDocument extends Omit<IAssignmentAnalytics, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
  id: number;
}

const assignmentAnalyticsSchema = new mongoose.Schema<IAssignmentAnalyticsDocument>({
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  assignmentId: {
    type: Number,
    required: [true, 'Assignment ID is required'],
    index: true,
  },
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    index: true,
  },
  courseId: {
    type: Number,
    index: true,
  },
  moduleId: {
    type: Number,
    index: true,
  },
  totalScore: {
    type: Number,
    required: true,
    min: [0, 'Score cannot be negative'],
  },
  maxScore: {
    type: Number,
    required: true,
    min: [0, 'Max score cannot be negative'],
  },
  percentageScore: {
    type: Number,
    required: true,
    min: [0, 'Percentage cannot be negative'],
    max: [100, 'Percentage cannot exceed 100'],
  },
  attemptNumber: {
    type: Number,
    required: true,
    min: [1, 'Attempt number must be at least 1'],
  },
  timeSpent: {
    type: Number,
    required: true,
    min: [0, 'Time spent cannot be negative'],
  },
  submittedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  gradedAt: {
    type: Date,
  },
  questionAnalytics: [{
    questionId: {
      type: String,
      required: true,
    },
    questionType: {
      type: String,
      enum: ['mcq', 'coding', 'essay', 'multiple-choice'],
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: [0, 'Score cannot be negative'],
    },
    maxScore: {
      type: Number,
      required: true,
      min: [0, 'Max score cannot be negative'],
    },
    timeSpent: {
      type: Number,
      required: true,
      min: [0, 'Time spent cannot be negative'],
    },
    attempts: {
      type: Number,
      required: true,
      min: [1, 'Attempts must be at least 1'],
    },
    isCorrect: {
      type: Boolean,
      required: true,
    },
    feedback: {
      type: String,
      trim: true,
    },
    difficultyRating: {
      type: Number,
      min: [1, 'Difficulty rating must be at least 1'],
      max: [5, 'Difficulty rating cannot exceed 5'],
    },
    learningOutcome: {
      type: String,
      trim: true,
    },
    conceptTags: [{
      type: String,
      trim: true,
    }],
  }],
  learningOutcomes: [{
    outcome: {
      type: String,
      required: true,
      trim: true,
    },
    achieved: {
      type: Boolean,
      required: true,
    },
    confidence: {
      type: Number,
      required: true,
      min: [0, 'Confidence cannot be negative'],
      max: [100, 'Confidence cannot exceed 100'],
    },
    timeToMastery: {
      type: Number,
      min: [0, 'Time to mastery cannot be negative'],
    },
  }],
  engagementMetrics: {
    timeOnAssignment: {
      type: Number,
      required: true,
      min: [0, 'Time on assignment cannot be negative'],
    },
    timeOnQuestions: [{
      type: Number,
      min: [0, 'Time per question cannot be negative'],
    }],
    revisits: {
      type: Number,
      required: true,
      min: [0, 'Revisits cannot be negative'],
      default: 0,
    },
    lastActivity: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completionRate: {
      type: Number,
      required: true,
      min: [0, 'Completion rate cannot be negative'],
      max: [100, 'Completion rate cannot exceed 100'],
    },
  },
  performanceTrends: {
    improvementFromPrevious: {
      type: Number,
      default: 0,
    },
    consistencyScore: {
      type: Number,
      required: true,
      min: [0, 'Consistency score cannot be negative'],
      max: [100, 'Consistency score cannot exceed 100'],
    },
    timeEfficiency: {
      type: Number,
      required: true,
      min: [0, 'Time efficiency cannot be negative'],
    },
    accuracyRate: {
      type: Number,
      required: true,
      min: [0, 'Accuracy rate cannot be negative'],
      max: [100, 'Accuracy rate cannot exceed 100'],
    },
  },
  comparativeAnalytics: {
    classAverage: {
      type: Number,
      required: true,
      min: [0, 'Class average cannot be negative'],
      max: [100, 'Class average cannot exceed 100'],
    },
    classRank: {
      type: Number,
      required: true,
      min: [1, 'Class rank must be at least 1'],
    },
    percentile: {
      type: Number,
      required: true,
      min: [0, 'Percentile cannot be negative'],
      max: [100, 'Percentile cannot exceed 100'],
    },
    performanceCategory: {
      type: String,
      enum: ['excellent', 'good', 'average', 'needs-improvement'],
      required: true,
    },
  },
  metadata: {
    deviceType: {
      type: String,
      trim: true,
    },
    browser: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    sessionId: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
assignmentAnalyticsSchema.index({ assignmentId: 1, userId: 1 });
assignmentAnalyticsSchema.index({ userId: 1, submittedAt: -1 });
assignmentAnalyticsSchema.index({ courseId: 1, submittedAt: -1 });
assignmentAnalyticsSchema.index({ percentageScore: -1 });
assignmentAnalyticsSchema.index({ 'comparativeAnalytics.performanceCategory': 1 });

// Static methods for analytics queries
assignmentAnalyticsSchema.statics.findByAssignment = function(assignmentId: number) {
  return this.find({ assignmentId }).sort({ submittedAt: -1 });
};

assignmentAnalyticsSchema.statics.findByUser = function(userId: string) {
  return this.find({ userId }).sort({ submittedAt: -1 });
};

assignmentAnalyticsSchema.statics.findByCourse = function(courseId: number) {
  return this.find({ courseId }).sort({ submittedAt: -1 });
};

assignmentAnalyticsSchema.statics.getAssignmentStats = async function(assignmentId: number) {
  const stats = await this.aggregate([
    { $match: { assignmentId } },
    {
      $group: {
        _id: null,
        totalSubmissions: { $sum: 1 },
        averageScore: { $avg: '$percentageScore' },
        averageTimeSpent: { $avg: '$timeSpent' },
        averageAttempts: { $avg: '$attemptNumber' },
        minScore: { $min: '$percentageScore' },
        maxScore: { $max: '$percentageScore' },
        standardDeviation: { $stdDevPop: '$percentageScore' }
      }
    }
  ]);
  
  return stats.length > 0 ? stats[0] : {
    totalSubmissions: 0,
    averageScore: 0,
    averageTimeSpent: 0,
    averageAttempts: 0,
    minScore: 0,
    maxScore: 0,
    standardDeviation: 0
  };
};

assignmentAnalyticsSchema.statics.getUserProgress = async function(userId: string, courseId?: number) {
  const matchStage = courseId ? { userId, courseId } : { userId };
  
  const progress = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$assignmentId',
        bestScore: { $max: '$percentageScore' },
        totalAttempts: { $sum: 1 },
        averageTimeSpent: { $avg: '$timeSpent' },
        lastAttempt: { $max: '$submittedAt' },
        improvement: { $avg: '$performanceTrends.improvementFromPrevious' }
      }
    },
    { $sort: { lastAttempt: -1 } }
  ]);
  
  return progress;
};

assignmentAnalyticsSchema.statics.getLearningOutcomes = async function(userId: string, courseId?: number) {
  const matchStage = courseId ? { userId, courseId } : { userId };
  
  const outcomes = await this.aggregate([
    { $match: matchStage },
    { $unwind: '$learningOutcomes' },
    {
      $group: {
        _id: '$learningOutcomes.outcome',
        totalAttempts: { $sum: 1 },
        achievedCount: { $sum: { $cond: ['$learningOutcomes.achieved', 1, 0] } },
        averageConfidence: { $avg: '$learningOutcomes.confidence' },
        averageTimeToMastery: { $avg: '$learningOutcomes.timeToMastery' }
      }
    }
  ]);
  
  return outcomes.map(outcome => ({
    ...outcome,
    achievementRate: outcome.totalAttempts > 0 ? (outcome.achievedCount / outcome.totalAttempts) * 100 : 0
  }));
};

// Instance methods
assignmentAnalyticsSchema.methods.calculatePerformanceCategory = function() {
  if (this.percentageScore >= 90) return 'excellent';
  if (this.percentageScore >= 80) return 'good';
  if (this.percentageScore >= 70) return 'average';
  return 'needs-improvement';
};

assignmentAnalyticsSchema.methods.updateComparativeAnalytics = async function(classStats: any) {
  this.comparativeAnalytics.classAverage = classStats.averageScore;
  this.comparativeAnalytics.percentile = classStats.percentile;
  this.comparativeAnalytics.performanceCategory = this.calculatePerformanceCategory();
  return await this.save();
};

export const AssignmentAnalytics = mongoose.model<IAssignmentAnalyticsDocument>('AssignmentAnalytics', assignmentAnalyticsSchema); 