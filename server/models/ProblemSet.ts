import mongoose, { Document, Schema } from 'mongoose';

export interface IProblemInstance {
  _id?: mongoose.Types.ObjectId;
  id?: string; // Add id to interface for consistency
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
  selectedProblemId?: number; // Add missing properties
  originalProblemId?: number; // Add missing properties
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
  allowDirectEnrollment?: boolean; // Add missing property
  createdAt: Date;
  updatedAt: Date;
}

// FIX: Extend IProblemSet and an Omitted Document type to resolve the 'id' conflict.
interface IProblemSetDocument extends IProblemSet, Omit<Document, 'id'> {
  // Methods can be defined here if needed
  removeProblem(problemId: number): Promise<this>;
  addProblem(instance: IProblemInstance): Promise<this>;
  updateProblemInstance(id: string, updates: Partial<IProblemInstance>): Promise<this>;
  removeProblemInstance(id: string): Promise<this>;
  reorderProblems(newOrder: number[]): Promise<this>;
}

// Define the problem instance schema separately for clarity
const problemInstanceSchema = new Schema<IProblemInstance>({
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
  customTestCases: [mongoose.Schema.Types.Mixed],
  customExamples: [mongoose.Schema.Types.Mixed],
  customStarterCode: mongoose.Schema.Types.Mixed,
  timeLimit: Number,
  memoryLimit: Number,
  hints: [String],
  constraints: String,
  inputFormat: String,
  outputFormat: String,
  notes: String,
  order: {
    type: Number,
    required: true,
  },
  isCustomized: {
    type: Boolean,
    default: false,
  },
  lastModified: {
    type: Date,
    default: Date.now,
  },
  modifiedBy: String,
});


const problemSetSchema = new mongoose.Schema<IProblemSetDocument>({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  difficulty: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    trim: true,
  },
  tags: [String],
  problemIds: [String],
  problemInstances: [problemInstanceSchema], // Use the defined sub-schema
  isPublic: {
    type: Boolean,
    default: false,
  },
  estimatedTime: Number,
  totalProblems: {
    type: Number,
    default: 0,
  },
  createdBy: {
    type: String,
    required: true,
  },
  participants: [String],
  allowDirectEnrollment: { // Add the missing schema property
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Index for efficient queries
problemSetSchema.index({ id: 1 });
problemSetSchema.index({ createdBy: 1 });
problemSetSchema.index({ isPublic: 1 });
problemSetSchema.index({ category: 1 });
problemSetSchema.index({ difficulty: 1 });

// Method to add a problem to the problem set
problemSetSchema.methods.addProblem = async function(instance: IProblemInstance) {
  this.problemInstances.push(instance);
  this.totalProblems = this.problemInstances.length;
  return await this.save();
};

// Method to remove a problem from the problem set
problemSetSchema.methods.removeProblem = async function(problemId: number) {
  this.problemInstances = this.problemInstances.filter((p: IProblemInstance) => p.problemId !== problemId);
  this.totalProblems = this.problemInstances.length;
  return await this.save();
};

// Method to update a problem instance within the problem set
problemSetSchema.methods.updateProblemInstance = async function(id: string, updates: Partial<IProblemInstance>) {
  const instance = this.problemInstances.find((p: IProblemInstance) => p._id?.toString() === id);
  if (instance) {
    Object.assign(instance, updates, { lastModified: new Date() });
    return await this.save();
  }
  throw new Error('Problem instance not found');
};

// Method to remove a problem instance from the problem set
problemSetSchema.methods.removeProblemInstance = async function(id: string) {
  const idStr = id.toString();
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
  
  this.problemInstances = reorderedInstances as IProblemInstance[];
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

// Calculate average difficulty
problemSetSchema.virtual('averageDifficulty').get(function(this: IProblemSetDocument) {
  if (!this.problemInstances || this.problemInstances.length === 0) {
    return 'N/A';
  }
  const difficultyMap: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
  const totalDifficulty = this.problemInstances
    .map((p: any) => difficultyMap[p.difficulty] || 0) // Add explicit type
    .reduce((acc: number, diff: number) => acc + diff, 0); // Add explicit types
  
  const avg = totalDifficulty / this.problemInstances.length;
  
  if (avg <= 1.5) return 'Easy';
  if (avg <= 2.5) return 'Medium';
  return 'Hard';
});

export const ProblemSet = mongoose.model<IProblemSetDocument>('ProblemSet', problemSetSchema);
