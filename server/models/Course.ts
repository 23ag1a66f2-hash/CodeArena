import mongoose, { Document } from 'mongoose';

export interface ICourse {
  id: number;
  title: string;
  description?: string;
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours?: number;
  prerequisites?: string[];
  learningObjectives?: string[];
  problems?: number[];
  modules?: number[];
  enrolledUsers?: string[];
  isPublic: boolean;
  enableMarkComplete?: boolean;
  createdBy?: string;
  tags?: string[];
  rating?: number;
  enrollmentCount?: number;
  completionRate?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ICourseDocument extends Omit<ICourse, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
  id: number;
}

const courseSchema = new mongoose.Schema<ICourseDocument>({
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
    trim: true,
  },
  difficulty: {
    type: String,
    enum: {
      values: ['beginner', 'intermediate', 'advanced'],
      message: '{VALUE} is not a valid difficulty level'
    },
  },
  estimatedHours: {
    type: Number,
    min: [0, 'Estimated hours cannot be negative'],
  },
  prerequisites: [{
    type: String,
    trim: true,
  }],
  learningObjectives: [{
    type: String,
    trim: true,
  }],
  problems: [{
    type: Number,
  }],
  modules: [{
    type: Number,
  }],
  enrolledUsers: [{
    type: String,
  }],
  isPublic: {
    type: Boolean,
    default: true,
  },
  // Feature flag for QR/link enrollment
  allowDirectEnrollment: {
    type: Boolean,
    default: false,
  },
  enableMarkComplete: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: String,
    required: true,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  rating: {
    type: Number,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot exceed 5'],
  },
  enrollmentCount: {
    type: Number,
    default: 0,
    min: [0, 'Enrollment count cannot be negative'],
  },
  completionRate: {
    type: Number,
    default: 0,
    min: [0, 'Completion rate cannot be negative'],
    max: [100, 'Completion rate cannot exceed 100'],
  },
}, {
  timestamps: true,
});

// Index for efficient queries
courseSchema.index({ id: 1 });
courseSchema.index({ createdBy: 1 });
courseSchema.index({ isPublic: 1 });
courseSchema.index({ category: 1 });
courseSchema.index({ difficulty: 1 });

// Virtual for full name
courseSchema.virtual('fullTitle').get(function() {
  return `${this.title}${this.category ? ` - ${this.category}` : ''}`;
});

// Method to increment enrollment count
courseSchema.methods.incrementEnrollment = async function() {
  this.enrollmentCount = (this.enrollmentCount || 0) + 1;
  return await this.save();
};

// Method to decrement enrollment count
courseSchema.methods.decrementEnrollment = async function() {
  this.enrollmentCount = Math.max(0, (this.enrollmentCount || 0) - 1);
  return await this.save();
};

// Static method to find courses by user enrollment
courseSchema.statics.findByUserEnrollment = function(userId: string) {
  return this.find({ enrolledUsers: userId });
};

// Static method to find public courses
courseSchema.statics.findPublic = function() {
  return this.find({ isPublic: true });
};

export const Course = mongoose.model<ICourseDocument>('Course', courseSchema); 