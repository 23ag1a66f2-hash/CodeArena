import { Router, Request, Response, RequestHandler } from 'express';
import { storage } from "../storage.js";
import { protect } from "../middleware/auth.js";
import { requireAdmin } from '../middleware/auth.js';
import { listUsers, updateUserRole } from '../controllers/adminController.js';

interface AuthUser {
  id: string;
  role: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
}

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

const router = Router();

router.get("/me/stats", protect as unknown as RequestHandler, (async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const stats = await storage.getUserSubmissionStats(userId);
    res.json(stats);
  } catch (error) {
    console.error("Error getting user stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}) as unknown as RequestHandler);

// Expose enrollments under users to satisfy client calls
router.get('/me/enrollments', protect as unknown as RequestHandler, (async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const enrollments = await storage.getCourseEnrollments(undefined as any, userId);
    res.json(enrollments);
  } catch (error) {
    console.error('Error getting user enrollments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}) as unknown as RequestHandler);

// User courses endpoint
router.get('/me/courses', protect as unknown as RequestHandler, (async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Import and call the getUserCourses controller function
    const { getUserCourses } = await import('../controllers/coursesController');
    const mockReq = { user: { id: userId, role: req.user?.role || 'user' } } as any;
    const mockRes = {
      json: (data: any) => res.json(data),
      status: (code: number) => ({ json: (data: any) => res.status(code).json(data) })
    } as any;
    
    await getUserCourses(mockReq, mockRes);
  } catch (error) {
    console.error('Error getting user courses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}) as unknown as RequestHandler);

// Problem set enrollments for current user (used by QR/link flow)
router.get('/me/problem-set-enrollments', protect as unknown as RequestHandler, (async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { getDb } = await import('../db');
    const db = getDb();
    const rows = await db.collection('problemsetenrollments').find({ userId }).sort({ enrolledAt: -1 }).toArray();
    res.json(rows);
  } catch (error) {
    console.error('Error getting problem set enrollments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}) as unknown as RequestHandler);

// Admin user endpoints
router.get('/', protect as any, requireAdmin as any, listUsers as any);
router.patch('/:id/role', protect as any, requireAdmin as any, updateUserRole as any);

export default router; 