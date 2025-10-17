import { Router } from 'express';
import { protect, requireAdmin } from '../middleware/auth';
import {
  listCourses,
  createCourse,
  getCourse,
  getCourseModules,
  updateCourse,
  deleteCourse,
  enrollInCourse,
  deleteEnrollment,
  getEnrollments,
  getCourseQrCode,
  getCourseProgress,
  getUserEnrollments,
  getUserCourses,
} from '../controllers/coursesController';
import { createModule } from '../controllers/modulesController';

const router = Router();

// User-specific routes (must come before /:id routes)
router.get('/me/enrollments', protect as any, getUserEnrollments as any);
router.get('/me/courses', protect as any, getUserCourses as any);

// General course routes
router.get('/', protect as any, listCourses as any);
router.post('/', protect as any, requireAdmin as any, createCourse as any);
router.get('/:id', getCourse as any);
router.get('/:id/modules', protect as any, getCourseModules as any);
// Create a new module for a course (expected by client)
router.post('/:id/modules', protect as any, requireAdmin as any, createModule as any);
router.put('/:id', protect as any, requireAdmin as any, updateCourse as any);
router.delete('/:id', protect as any, requireAdmin as any, deleteCourse as any);
router.post('/:id/enroll', protect as any, enrollInCourse as any);
router.delete('/:id/enrollments/:userId', protect as any, requireAdmin as any, deleteEnrollment as any);
router.get('/:id/enrollments', protect as any, requireAdmin as any, getEnrollments as any);
router.get('/:id/qr-code', protect as any, requireAdmin as any, getCourseQrCode as any);
router.get('/:id/progress', protect as any, getCourseProgress as any);

// Module completion route
router.post('/:courseId/modules/:moduleId/complete', protect as any, async (req: any, res: any) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const moduleId = parseInt(req.params.moduleId);
    const userId = req.user.id;
    const { timeSpent, notes } = req.body;
    
    console.log(`[DEBUG] Module completion request - User: ${userId}, Course: ${courseId}, Module: ${moduleId}`);
    
    // Check if user can access this course
    const isAdmin = req.user.role === 'admin';
    const { storage } = await import('../storage');
    const canAccess = await storage.canUserAccessCourse(courseId, userId, isAdmin);
    if (!canAccess) {
      return res.status(403).json({ message: "Access denied: You must be enrolled in this course to complete modules" });
    }
    
    // Use storage layer method which has the correct progress calculation
    await storage.markModuleComplete(userId, moduleId, courseId, timeSpent, notes);
    
    res.json({ success: true, message: 'Module marked as complete' });
  } catch (error) {
    console.error('Error marking module as complete:', error);
    res.status(500).json({ message: 'Failed to mark module as complete' });
  }
});

export default router; 