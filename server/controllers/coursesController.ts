import { Request, Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { storage } from '../storage.js';
import { connectToMongoDB } from '../db.js';
import mongoose from 'mongoose';
import { insertCourseSchema } from '../shared-schema.js';
import { Course } from '../models/Course.js';
import { CourseModule } from '../models/CourseModule.js';
import { CourseEnrollment } from '../models/CourseEnrollment.js';
import { User } from '../models/User.js';
import QRCode from 'qrcode';
import { z } from 'zod';

export async function listCourses(req: AuthRequest, res: Response) {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    let courses: any[] = [];
    if (isAdmin) {
      courses = await Course.find({}).lean();
    } else {
      // Return public courses or those the user is enrolled in
      const enrolled = await CourseEnrollment.find({ userId }).lean();
      const enrolledIds = new Set(enrolled.map((e: any) => e.courseId));
      const all = await Course.find({}).lean();
      courses = all.filter((c: any) => c.isPublic || enrolledIds.has(c.id));
    }

    // Enrich with lightweight counts for modules and enrollments
    const courseIds = courses.map((c: any) => c.id);
    if (courseIds.length > 0) {
      // Use Mongoose counts (no raw DB access)
      const [modulesByCourse, enrollmentsByCourse] = await Promise.all([
        (async () => {
          const rows = await CourseModule.aggregate([
            { $match: { courseId: { $in: courseIds } } },
            { $group: { _id: '$courseId', count: { $sum: 1 } } },
          ]);
          return new Map(rows.map((r: any) => [r._id, r.count]));
        })(),
        (async () => {
          const rows = await CourseEnrollment.aggregate([
            { $match: { courseId: { $in: courseIds } } },
            { $group: { _id: '$courseId', count: { $sum: 1 } } },
          ]);
          return new Map(rows.map((r: any) => [r._id, r.count]));
        })(),
      ]);

      courses = courses.map((c: any) => ({
        ...c,
        moduleCount: modulesByCourse.get(c.id) || 0,
        enrollmentCount: enrollmentsByCourse.get(c.id) || 0,
      }));
    }

    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ message: 'Failed to fetch courses' });
  }
}

export async function createCourse(req: AuthRequest, res: Response) {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ message: 'User ID not found' });
    }
    const validatedData = insertCourseSchema.parse({
      ...req.body,
      createdBy: userId,
    });
    // Generate a numeric, monotonic id
    const last = await Course.findOne({}, {}, { sort: { id: -1 } }).lean();
    const nextId = (last?.id || 0) + 1;

    // Persist only course document here; modules are handled separately elsewhere
    const { modules, ...courseOnly } = validatedData as any;
    const course = await Course.create({
      id: nextId,
      ...courseOnly,
      createdBy: userId,
    } as any);
    // If modules were provided, persist them as separate documents
    if (Array.isArray(modules) && modules.length > 0) {
      // Generate unique ids for modules and attach courseId
      const lastModule = await CourseModule.findOne({}, {}, { sort: { id: -1 } }).lean();
      let nextModuleId = (lastModule?.id || 0) + 1;
      const moduleDocs = modules.map((m: any, index: number) => ({
        id: nextModuleId++,
        courseId: nextId,
        title: String(m.title),
        description: String(m.description || ''),
        order: typeof m.order === 'number' && m.order >= 1 ? m.order : index + 1,
        textContent: m.textContent || '',
        videoUrl: m.videoUrl || '',
        codeExample: m.codeExample || '',
        language: m.language || 'javascript',
        expectedOutput: m.expectedOutput || '',
        duration: m.duration || undefined,
      }));
      await CourseModule.insertMany(moduleDocs);
    }
    res.status(201).json(course);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: (error as any).errors });
    }
    if ((error as any)?.name === 'ValidationError') {
      const messages = Object.values((error as any).errors || {}).map((e: any) => e.message);
      return res.status(400).json({ message: 'Invalid data', errors: messages });
    }
    console.error('Error creating course:', error);
    res.status(500).json({ message: 'Failed to create course' });
  }
}

export async function getCourse(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const course = await Course.findOne({ id }).lean();
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    const [modules, enrollments] = await Promise.all([
      CourseModule.find({ courseId: id }).sort({ order: 1 }).lean(),
      CourseEnrollment.find({ courseId: id }).lean(),
    ]);
    res.json({
      ...course,
      modules,
      enrolledUsers: enrollments.map((e: any) => e.userId),
      enrollmentCount: enrollments.length,
      moduleCount: modules.length,
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ message: 'Failed to fetch course' });
  }
}

export async function getCourseModules(req: AuthRequest, res: Response) {
  try {
    const courseId = parseInt(req.params.id);
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    const canAccess = await storage.canUserAccessCourse(courseId, userId, isAdmin);
    if (!canAccess) {
      return res.status(403).json({ message: 'Access denied: You must be enrolled' });
    }
    
    // Use the same Mongoose approach as getCourse for consistency
    const modules = await CourseModule.find({ courseId }).sort({ order: 1 }).lean();
    res.json(modules);
  } catch (error) {
    console.error('Error fetching course modules:', error);
    res.status(500).json({ message: 'Failed to fetch course modules' });
  }
}

export async function updateCourse(req: AuthRequest, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user.id;
    const existingCourse = await Course.findOne({ id }).lean();
    if (!existingCourse) {
      return res.status(404).json({ message: 'Course not found' });
    }
    const updateData = { ...req.body, updatedBy: userId, updatedAt: new Date() } as any;
    const result = await Course.findOneAndUpdate({ id }, { $set: updateData }, { new: true }).lean();
    if (!result) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.json(result);
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ message: 'Failed to update course' });
  }
}

export async function deleteCourse(req: AuthRequest, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const course = await Course.findOne({ id }).lean();
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    await Promise.all([
      CourseModule.deleteMany({ courseId: id }),
      CourseEnrollment.deleteMany({ courseId: id }),
      (await import('../models/ModuleProgress')).ModuleProgress.deleteMany({ courseId: id }),
    ]);
    const result = await Course.deleteOne({ id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ message: 'Failed to delete course' });
  }
}

export async function enrollInCourse(req: AuthRequest, res: Response) {
  try {
    const courseId = parseInt(req.params.id);
    const { userId } = req.body;
    const requesterId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    let targetUserId: string;
    if (isAdmin && userId && userId !== 'self') {
      targetUserId = userId;
    } else {
      targetUserId = requesterId;
    }

    const course = await storage.getCourse(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const isEnrolled = await storage.isUserEnrolledInCourse(courseId, targetUserId);
    if (isEnrolled) {
      // Make endpoint idempotent: return existing enrollment instead of 409 (Mongoose-only)
      const userObjectId = mongoose.Types.ObjectId.isValid(targetUserId)
        ? new mongoose.Types.ObjectId(targetUserId)
        : (targetUserId as any);
      const existing: any = await CourseEnrollment.findOne({ courseId, userId: userObjectId }).lean();
      if (existing) {
        return res.status(200).json({ ...existing, userId: String(existing.userId), _id: String(existing._id) });
      }
      // Fallback: proceed to create if not found due to race
    }

    const enrollment = await storage.enrollUserInCourse(targetUserId, courseId, isAdmin ? requesterId : undefined);
    res.status(201).json(enrollment);
  } catch (error) {
    console.error('[DEBUG] Error enrolling user in course:', error);
    if ((error as any).message && (error as any).message.includes('already enrolled')) {
      return res.status(409).json({ message: 'User is already enrolled in this course' });
    }
    res.status(500).json({ message: 'Failed to enroll user in course' });
  }
}

export async function deleteEnrollment(req: AuthRequest, res: Response) {
  try {
    const courseId = parseInt(req.params.id);
    const userId = req.params.userId;
    const result = await storage.removeUserFromCourse(courseId, userId);
    if (!result) return res.status(404).json({ message: 'Enrollment not found' });
    res.json({ message: 'Student removed from course successfully' });
  } catch (error) {
    console.error('Error removing student from course:', error);
    res.status(500).json({ message: 'Failed to remove student from course' });
  }
}

export async function getEnrollments(req: AuthRequest, res: Response) {
  try {
    const courseId = parseInt(req.params.id);
    // Use raw collection to align with storage insert (ObjectId fields)
    // Use mongoose model only
    const rows = await CourseEnrollment.find({ courseId }).sort({ enrolledAt: -1 }).lean();
    const userIds = rows.map((e: any) => e.userId);
    const users = await User.find({ _id: { $in: userIds as any } }).select('firstName lastName email').lean();
    const byId = new Map(users.map((u: any) => [String(u._id), u]));
    const mapped = rows.map((e: any) => ({
      ...e,
      userId: String(e.userId),
      _id: String(e._id),
      user: {
        firstName: byId.get(String(e.userId))?.firstName || '',
        lastName: byId.get(String(e.userId))?.lastName || '',
        email: byId.get(String(e.userId))?.email || '',
      }
    }));
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching course enrollments:', error);
    res.status(500).json({ message: 'Failed to fetch course enrollments' });
  }
}

export async function getCourseQrCode(req: AuthRequest, res: Response) {
  try {
    const courseId = parseInt(req.params.id);
    if (isNaN(courseId)) return res.status(400).json({ message: 'Invalid course ID' });

    const course = await storage.getCourse(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const frontendUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
    const enrollmentUrl = `${frontendUrl}/enroll/${courseId}`;

    const qrCodeDataUrl = await (await import('qrcode')).default.toDataURL(enrollmentUrl);

    res.json({ qrCode: qrCodeDataUrl, enrollmentUrl, courseId, courseTitle: (course as any).title });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ message: 'Failed to generate QR code' });
  }
}

export async function getCourseProgress(req: AuthRequest, res: Response) {
  try {
    const userId = req.user.id;
    if (!userId) return res.status(401).json({ message: 'User ID not found' });
    const courseId = parseInt(req.params.id);
    
    // Get user's enrollment for this course
    const { CourseEnrollment } = await import('../models/CourseEnrollment');
    const enrollment = await CourseEnrollment.findOne({ userId, courseId }).lean();
    
    // Get course modules
    const { CourseModule } = await import('../models/CourseModule');
    const courseModules = await CourseModule.find({ courseId }).lean();
    
    // Get user's module progress
    const moduleProgress = await storage.getUserCourseProgress(userId, courseId);
    
    // Calculate completed modules
    const completedModules = moduleProgress
      .filter(p => p.isCompleted)
      .map(p => p.moduleId);
    
    // Calculate progress percentage
    const totalModules = courseModules.length;
    const completedCount = completedModules.length;
    const progress = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;
    
    // Return the structure the client expects
    const result = {
      enrollment: enrollment ? {
        id: enrollment.id,
        courseId: enrollment.courseId,
        userId: enrollment.userId,
        completedModules: completedModules,
        progress: progress
      } : {
        id: 0,
        courseId: courseId,
        userId: userId,
        completedModules: completedModules,
        progress: progress
      },
      completedModules: courseModules.filter(m => completedModules.includes(m.id)),
      totalModules: totalModules
    };
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching course progress:', error);
    res.status(500).json({ message: 'Failed to fetch course progress' });
  }
}

export async function getUserEnrollments(req: AuthRequest, res: Response) {
  try {
    const userId = req.user.id;
    if (!userId) return res.status(401).json({ message: 'User ID not found' });
    const enrollments = await CourseEnrollment.find({ userId }).lean();
    res.json(enrollments);
  } catch (error) {
    console.error('Error fetching user enrollments:', error);
    res.status(500).json({ message: 'Failed to fetch user enrollments' });
  }
}

export async function getUserCourses(req: AuthRequest, res: Response) {
  try {
    const userId = req.user.id;
    if (!userId) return res.status(401).json({ message: 'User ID not found' });
    
    // Get user's course enrollments
    const enrollments = await CourseEnrollment.find({ userId }).lean();
    const enrolledCourseIds = enrollments.map(e => e.courseId);
    
    // Only get courses that the user is enrolled in AND are public
    // Admin can see all courses, regular users only see enrolled + public courses
    const isAdmin = req.user.role === 'admin';
    let courses;
    if (isAdmin) {
      courses = await Course.find({}).lean();
    } else {
      courses = await Course.find({
        $and: [
          { isPublic: true },  // Course must be public
          { id: { $in: enrolledCourseIds } }  // User must be enrolled
        ]
      }).lean();
    }
    
    // Get course modules for progress calculation
    const courseIds = courses.map(c => c.id);
    const modules = await CourseModule.find({ courseId: { $in: courseIds } }).lean();
    const modulesByCourse = new Map();
    modules.forEach(m => {
      if (!modulesByCourse.has(m.courseId)) {
        modulesByCourse.set(m.courseId, []);
      }
      modulesByCourse.get(m.courseId).push(m);
    });
    
    // Get participant counts for each course
    const enrollmentsByCourse = await CourseEnrollment.aggregate([
      { $match: { courseId: { $in: courseIds } } },
      { $group: { _id: '$courseId', count: { $sum: 1 } } }
    ]).exec();
    
    const participantCounts = new Map();
    enrollmentsByCourse.forEach((item: any) => {
      participantCounts.set(item._id, item.count);
    });
    
    // Calculate progress for each course
    const coursesWithProgress = courses.map(course => {
      const courseModules = modulesByCourse.get(course.id) || [];
      const totalModules = courseModules.length;
      const participantCount = participantCounts.get(course.id) || 0;
      
      // Find user's enrollment for this course
      const enrollment = enrollments.find(e => e.courseId === course.id);
      const completedModules = enrollment?.completedModules || [];
      const completedCount = completedModules.length;
      
      // Calculate progress percentage
      const progress = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;
      
      return {
        ...course,
        moduleCount: totalModules,
        enrollmentCount: participantCount,
        userProgress: {
          progress,
          completedModules: completedCount,
          totalModules,
          isEnrolled: !!enrollment
        },
        isEnrolled: !!enrollment
      };
    });
    
    // Sort: enrolled courses first, then by progress, then by creation date
    coursesWithProgress.sort((a, b) => {
      if (a.isEnrolled && !b.isEnrolled) return -1;
      if (!a.isEnrolled && b.isEnrolled) return 1;
      if (a.isEnrolled && b.isEnrolled) {
        return b.userProgress.progress - a.userProgress.progress;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    res.json(coursesWithProgress);
  } catch (error) {
    console.error('Error fetching user courses:', error);
    res.status(500).json({ message: 'Failed to fetch user courses' });
  }
} 