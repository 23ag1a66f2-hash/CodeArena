import mongoose, { Document } from 'mongoose';

export interface ICourseEnrollment {
  id: number;
  courseId: number;
  userId: mongoose.Types.ObjectId;
  completedModules: number[];
  progress: number;
  enrolledAt: Date;
  lastAccessedAt: Date;
  enrolledBy?: string;
  enrollmentType: 'admin' | 'qr'; // New field to track enrollment method
}

interface ICourseEnrollmentDocument extends Omit<ICourseEnrollment, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
  id: number;
}

const courseEnrollmentSchema = new mongoose.Schema<ICourseEnrollmentDocument>({
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  courseId: {
    type: Number,
    required: [true, 'Course ID is required'],
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  },
  completedModules: [{
    type: Number,
  }],
  progress: {
    type: Number,
    default: 0,
    min: [0, 'Progress cannot be negative'],
    max: [100, 'Progress cannot exceed 100'],
  },
  enrolledAt: {
    type: Date,
    default: Date.now,
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now,
  },
  enrolledBy: {
    type: String,
  },
  enrollmentType: {
    type: String,
    enum: ['admin', 'qr'],
    required: [true, 'Enrollment type is required'],
    default: 'qr', // Default to QR for backward compatibility
  },
}, {
  timestamps: true,
  // Align with raw Mongo collection used elsewhere (storage.ts)
  collection: 'courseEnrollments',
});

// Compound index for unique enrollment
courseEnrollmentSchema.index({ courseId: 1, userId: 1 }, { unique: true });
courseEnrollmentSchema.index({ id: 1 });

// Virtual for completion status
courseEnrollmentSchema.virtual('isCompleted').get(function() {
  return this.progress >= 100;
});

// Method to mark module as completed
courseEnrollmentSchema.methods.completeModule = async function(moduleId: number) {
  if (!this.completedModules.includes(moduleId)) {
    this.completedModules.push(moduleId);
    this.lastAccessedAt = new Date();
    await this.save();
  }
  return this;
};

// Method to update progress
courseEnrollmentSchema.methods.updateProgress = async function(progress: number) {
  this.progress = Math.max(0, Math.min(100, progress));
  this.lastAccessedAt = new Date();
  return await this.save();
};

// Method to update last accessed
courseEnrollmentSchema.methods.updateLastAccessed = async function() {
  this.lastAccessedAt = new Date();
  return await this.save();
};

// Static method to find enrollments by course
courseEnrollmentSchema.statics.findByCourse = function(courseId: number) {
  return this.find({ courseId }).populate('user', 'firstName lastName email');
};

// Static method to find enrollments by user
courseEnrollmentSchema.statics.findByUser = function(userId: string | mongoose.Types.ObjectId) {
  return this.find({ userId });
};

// Static method to check if user is enrolled
courseEnrollmentSchema.statics.isEnrolled = async function(courseId: number, userId: string | mongoose.Types.ObjectId) {
  const enrollment = await this.findOne({ courseId, userId });
  return !!enrollment;
};

// Static method to get enrollment count for a course
courseEnrollmentSchema.statics.getEnrollmentCount = async function(courseId: number) {
  return await this.countDocuments({ courseId });
};

export const CourseEnrollment = mongoose.model<ICourseEnrollmentDocument>('CourseEnrollment', courseEnrollmentSchema); 