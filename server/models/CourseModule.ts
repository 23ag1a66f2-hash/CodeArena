import mongoose, { Document } from 'mongoose';

export interface ICourseModule {
  id: number;
  courseId: number;
  title: string;
  description: string;
  order: number;
  textContent?: string;
  videoUrl?: string;
  codeExample?: string;
  language?: string;
  expectedOutput?: string;
  duration?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ICourseModuleDocument extends Omit<ICourseModule, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
  id: number;
}

const courseModuleSchema = new mongoose.Schema<ICourseModuleDocument>({
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
  title: {
    type: String,
    required: [true, 'Module title is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Module description is required'],
    trim: true,
  },
  order: {
    type: Number,
    required: [true, 'Module order is required'],
    min: [1, 'Order must be at least 1'],
  },
  textContent: {
    type: String,
    trim: true,
  },
  videoUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(v: string) {
        if (!v) return true; // Allow empty
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Video URL must be a valid HTTP/HTTPS URL'
    }
  },
  codeExample: {
    type: String,
    trim: true,
  },
  language: {
    type: String,
    trim: true,
    default: 'javascript',
  },
  expectedOutput: {
    type: String,
    trim: true,
  },
  duration: {
    type: Number,
    min: [0, 'Duration cannot be negative'],
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
courseModuleSchema.index({ courseId: 1, order: 1 });
courseModuleSchema.index({ id: 1 });

// Virtual for module duration in minutes
courseModuleSchema.virtual('durationMinutes').get(function() {
  return this.duration ? Math.round(this.duration / 60) : null;
});

// Method to get next module
courseModuleSchema.methods.getNextModule = async function() {
  return await mongoose.model('CourseModule').findOne({
    courseId: this.courseId,
    order: { $gt: this.order }
  }).sort({ order: 1 });
};

// Method to get previous module
courseModuleSchema.methods.getPreviousModule = async function() {
  return await mongoose.model('CourseModule').findOne({
    courseId: this.courseId,
    order: { $lt: this.order }
  }).sort({ order: -1 });
};

// Static method to find modules by course
courseModuleSchema.statics.findByCourse = function(courseId: number) {
  return this.find({ courseId }).sort({ order: 1 });
};

// Static method to get next order number for a course
courseModuleSchema.statics.getNextOrder = async function(courseId: number) {
  const lastModule = await this.findOne({ courseId }).sort({ order: -1 });
  return lastModule ? lastModule.order + 1 : 1;
};

export const CourseModule = mongoose.model<ICourseModuleDocument>('CourseModule', courseModuleSchema); 