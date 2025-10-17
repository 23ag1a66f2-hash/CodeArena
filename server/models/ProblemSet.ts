import mongoose, { Document } from 'mongoose';

export interface IProblemInstance {
  _id?: mongoose.Types.ObjectId;
  problemId: number;
  title?: string;
  description?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  customTestCases?: any[];
  customExamples?: any[];
  customStarterCode?: any;
  timeLimit?: number;
  memoryLimit?: number;
  hints?: string[];
  constraints?: string;
  inputFormat?: string;
  outputFormat?: string;
  notes?: string;
  order: number;
  isCustomized: boolean;
  lastModified: Date;
  modifiedBy?: string;
}

export interface IProblemSet {
  id: string;
  title: string;
  description?: string;
  difficulty: string;
  category?: string;
  tags?: string[];
  problemIds: string[];
  problemInstances?: IProblemInstance[];
  isPublic: boolean;
  estimatedTime?: number;
  totalProblems: number;
  createdBy: string;
  participants?: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface IProblemSetDocument extends Omit<IProblemSet, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
  id: string;
}

const problemInstanceSchema = new mongoose.Schema({
 
  problemId: {
    type: Number,
    required: true,
  },
  title: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
  },
  customTestCases: [{
    type: mongoose.Schema.Types.Mixed,
  }],
  customExamples: [{
    type: mongoose.Schema.Types.Mixed,
  }],
  customStarterCode: {
    type: mongoose.Schema.Types.Mixed,
  },
  timeLimit: {
    type: Number,
    min: [100, 'Time limit must be at least 100ms'],
  },
  memoryLimit: {
    type: Number,
    min: [16, 'Memory limit must be at least 16MB'],
  },
  hints: [{
    type: String,
    trim: true,
  }],
  constraints: {
    type: String,
    trim: true,
  },
  inputFormat: {
    type: String,
    trim: true,
  },
  outputFormat: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  order: {
    type: Number,
    required: true,
    min: [1, 'Order must be at least 1'],
  },
  isCustomized: {
    type: Boolean,
    default: false,
  },
  lastModified: {
    type: Date,
    default: Date.now,
  },
  modifiedBy: {
    type: String,
  },
});

const problemSetSchema = new mongoose.Schema<IProblemSetDocument>({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: [true, 'Problem set title is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  difficulty: {
    type: String,
    required: [true, 'Problem set difficulty is required'],
    trim: true,
  },
  category: {
    type: String,
    trim: true,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  problemIds: [{
    type: String,
    required: true,
  }],
  problemInstances: [problemInstanceSchema],
  isPublic: {
    type: Boolean,
    default: true,
  },
  // Feature flag: allow direct enrollment via QR/link
  allowDirectEnrollment: {
    type: Boolean,
    default: false,
  },
  estimatedTime: {
    type: Number,
    min: [1, 'Estimated time must be at least 1 minute'],
  },
  totalProblems: {
    type: Number,
    default: 0,
    min: [0, 'Total problems cannot be negative'],
  },
  createdBy: {
    type: String,
    required: true,
  },
  participants: [{
    type: String,
    index: true,
    default: undefined,
  }],
}, {
  timestamps: true,
});

// Indexes for efficient queries
// problemSetSchema.index({ id: 1 });
problemSetSchema.index({ createdBy: 1 });
problemSetSchema.index({ isPublic: 1 });
problemSetSchema.index({ difficulty: 1 });
problemSetSchema.index({ category: 1 });

// Virtual for problem set complexity
problemSetSchema.virtual('complexity').get(function() {
  if (!this.problemInstances || this.problemInstances.length === 0) {
    return this.difficulty;
  }
  
  const difficulties = this.problemInstances.map(p => p.difficulty).filter(Boolean);
  if (difficulties.length === 0) return this.difficulty;
  
  const difficultyCounts = difficulties.reduce((acc, diff) => {
    if (diff) {
      acc[diff] = (acc[diff] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  
  const maxCount = Math.max(...Object.values(difficultyCounts));
  const dominantDifficulty = Object.keys(difficultyCounts).find(diff => 
    difficultyCounts[diff as keyof typeof difficultyCounts] === maxCount
  );
  
  return dominantDifficulty || this.difficulty;
});

// Method to add problem instance
problemSetSchema.methods.addProblemInstance = async function(problemInstance: IProblemInstance) {
  this.problemInstances.push(problemInstance);
  this.totalProblems = this.problemInstances.length;
  return await this.save();
};

// Method to remove problem instance by problemId
problemSetSchema.methods.removeProblemInstance = async function(problemId: number) {
  this.problemInstances = this.problemInstances.filter((p: IProblemInstance) => p.problemId !== problemId);
  this.totalProblems = this.problemInstances.length;
  return await this.save();
};

// Method to remove problem instance by subdocument _id
problemSetSchema.methods.removeProblemInstanceBySubId = async function(instanceId: string | mongoose.Types.ObjectId) {
  const idStr = instanceId.toString();
  this.problemInstances = this.problemInstances.filter((p: IProblemInstance) => p._id?.toString() !== idStr);
  this.totalProblems = this.problemInstances.length;
  return await this.save();
};

// Method to reorder problem instances
problemSetSchema.methods.reorderProblems = async function(newOrder: number[]) {
  const reorderedInstances = newOrder.map((problemId, index) => {
    const instance = this.problemInstances.find((p: IProblemInstance) => p.problemId === problemId);
    if (instance) {
      instance.order = index + 1;
      return instance;
    }
    return null;
  }).filter(Boolean);
  
  this.problemInstances = reorderedInstances;
  return await this.save();
};

// Static method to find problem sets by difficulty
problemSetSchema.statics.findByDifficulty = function(difficulty: string) {
  return this.find({ difficulty, isPublic: true });
};

// Static method to find problem sets by category
problemSetSchema.statics.findByCategory = function(category: string) {
  return this.find({ category, isPublic: true });
};

// Static method to get problem set statistics
problemSetSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$difficulty',
        count: { $sum: 1 },
        avgProblems: { $avg: '$totalProblems' },
        publicCount: {
          $sum: { $cond: ['$isPublic', 1, 0] }
        }
      }
    }
  ]);
  return stats;
};

export const ProblemSet = mongoose.model<IProblemSetDocument>('ProblemSet', problemSetSchema); 