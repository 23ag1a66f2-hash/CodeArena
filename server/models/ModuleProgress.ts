import mongoose, { Document } from 'mongoose';

export interface IModuleProgress {
  id: number;
  moduleId: number;
  userId: string;
  courseId: number;
  isCompleted: boolean;
  timeSpent: number;
  completedAt?: Date;
  notes?: string;
  bookmarked: boolean;
}

interface IModuleProgressDocument extends Omit<IModuleProgress, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
  id: number;
}

const moduleProgressSchema = new mongoose.Schema<IModuleProgressDocument>({
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  moduleId: {
    type: Number,
    required: [true, 'Module ID is required'],
    index: true,
  },
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    index: true,
  },
  courseId: {
    type: Number,
    required: [true, 'Course ID is required'],
    index: true,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  timeSpent: {
    type: Number,
    default: 0,
    min: [0, 'Time spent cannot be negative'],
  },
  completedAt: {
    type: Date,
  },
  notes: {
    type: String,
    trim: true,
  },
  bookmarked: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Compound index for unique module progress per user
moduleProgressSchema.index({ moduleId: 1, userId: 1 }, { unique: true });
moduleProgressSchema.index({ courseId: 1, userId: 1 });
moduleProgressSchema.index({ id: 1 });

// Virtual for time spent in minutes
moduleProgressSchema.virtual('timeSpentMinutes').get(function() {
  return Math.round(this.timeSpent / 60);
});

// Method to mark as completed
moduleProgressSchema.methods.markCompleted = async function(timeSpent?: number) {
  this.isCompleted = true;
  this.completedAt = new Date();
  if (timeSpent !== undefined) {
    this.timeSpent = timeSpent;
  }
  return await this.save();
};

// Method to update time spent
moduleProgressSchema.methods.updateTimeSpent = async function(timeSpent: number) {
  this.timeSpent = Math.max(0, timeSpent);
  return await this.save();
};

// Method to toggle bookmark
moduleProgressSchema.methods.toggleBookmark = async function() {
  this.bookmarked = !this.bookmarked;
  return await this.save();
};

// Method to add notes
moduleProgressSchema.methods.addNotes = async function(notes: string) {
  this.notes = notes;
  return await this.save();
};

// Static method to find progress by user and course
moduleProgressSchema.statics.findByUserAndCourse = function(userId: string, courseId: number) {
  return this.find({ userId, courseId }).sort({ moduleId: 1 });
};

// Static method to find completed modules for user
moduleProgressSchema.statics.findCompletedByUser = function(userId: string, courseId?: number) {
  const query: any = { userId, isCompleted: true };
  if (courseId) query.courseId = courseId;
  return this.find(query);
};

// Static method to get course completion percentage
moduleProgressSchema.statics.getCourseCompletion = async function(userId: string, courseId: number) {
  const [completed, total] = await Promise.all([
    this.countDocuments({ userId, courseId, isCompleted: true }),
    this.countDocuments({ userId, courseId })
  ]);
  
  return total > 0 ? Math.round((completed / total) * 100) : 0;
};

// Static method to get user's total time spent on course
moduleProgressSchema.statics.getTotalTimeSpent = async function(userId: string, courseId: number) {
  const result = await this.aggregate([
    { $match: { userId, courseId } },
    { $group: { _id: null, totalTime: { $sum: '$timeSpent' } } }
  ]);
  
  return result.length > 0 ? result[0].totalTime : 0;
};

export const ModuleProgress = mongoose.model<IModuleProgressDocument>('ModuleProgress', moduleProgressSchema); 