import type { Express, Response } from 'express';
import { createServer, type Server } from 'http';

import problemsRouter from './routes/problems';
import submissionsRouter from './routes/submissions';
import coursesRouter from './routes/courses';
import modulesRouter from './routes/modules';
import assignmentAnalyticsRoutes from './routes/assignmentAnalytics';
import versionHistoryRoutes from './routes/versionHistory';
import usersRouter from './routes/users';
import contestsRouter from './routes/contests';
import problemSetsRouter from './routes/problemSets';
import adminRouter from './routes/admin';
import assignmentsRouter from './routes/assignments';
import { protect, requireAdmin } from './middleware/auth';
import type { AuthRequest } from './middleware/auth';
import { storage } from './storage';
import { getDb } from './db';
import { ProblemSetEnrollment } from './models/ProblemSetEnrollment';
import { setupMaintenanceRoutes } from './middleware/maintenance';
import { ObjectId } from 'mongodb';

export async function registerRoutes(app: Express): Promise<Server> {
  const server = createServer(app);

  // Setup maintenance API routes
  setupMaintenanceRoutes(app);

  // --- ADMIN ROUTES (GROUPED AND PRIORITIZED) ---
  app.use('/api/admin/problem-sets', problemSetsRouter);
  app.use('/api/admin/assignments', problemSetsRouter); // Alias
  app.use('/api/admin/version-history', versionHistoryRoutes);
  app.use('/api/admin/contests', contestsRouter);
  app.use('/api/admin', adminRouter);

  // --- OTHER API ROUTES ---
  app.use('/api/analytics', assignmentAnalyticsRoutes);
  app.use('/api/problem-sets', problemSetsRouter);
  app.use('/api/problems', problemsRouter);
  app.use('/api/submissions', submissionsRouter);
  app.use('/api/courses', coursesRouter);
  app.use('/api/modules', modulesRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/assignments', assignmentsRouter);
  app.use('/api/contests', contestsRouter);

  // Compatibility route: reset current user's course progress
  app.post('/api/courses/:id/reset-progress', protect as any, (async (req: AuthRequest, res: Response) => {
    try {
      const courseId = parseInt(req.params.id);
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';
      if (!userId) return res.status(401).json({ message: 'Unauthorized' });
      const canAccess = await storage.canUserAccessCourse(courseId, userId, !!isAdmin);
      if (!canAccess) return res.status(403).json({ message: 'Access denied' });
      await storage.resetUserCourseProgress(userId, courseId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error resetting course progress:', error);
      res.status(500).json({ message: 'Failed to reset course progress' });
    }
  }) as any);

  // Alias route: problem sets with enrollment info for current user
  app.get('/api/problem-sets-with-enrollment', protect as any, (async (req: AuthRequest, res: Response) => {
    try {
      const { ProblemSet } = await import('./models/ProblemSet');
      const { ProblemSetEnrollment } = await import('./models/ProblemSetEnrollment');
      const { getDb } = await import('./db');
      const userId = req.user?.id;
      const all = await ProblemSet.find({}).sort({ createdAt: -1 }).lean();

      let userEnrollments = new Set<string>();
      if (userId) {
        // Check both enrollment methods:
        // 1. Mongoose ProblemSetEnrollment collection (fallback method)
        const enrollments = await ProblemSetEnrollment.find({ userId }).lean();
        const enrollmentIds = (enrollments || []).map((e: any) => String(e.problemSetId));
        
        // 2. Check participants array in problemSets collection (primary method)
        const db = getDb();
        console.log(`[DEBUG] Searching for user ${userId} in participants arrays`);
        
        // Try multiple user ID formats
        const problemSetsWithParticipants = await db.collection('problemsets')
          .find({ 
            $or: [
              { participants: userId },
              { participants: new ObjectId(userId) }
            ]
          })
          .project({ id: 1, _id: 1, participants: 1 })
          .toArray();
          
        console.log(`[DEBUG] Found ${problemSetsWithParticipants.length} problem sets with user in participants:`, 
          problemSetsWithParticipants.map(ps => ({ id: ps.id, participants: ps.participants })));
          
        const participantIds = problemSetsWithParticipants.map((ps: any) => String(ps.id || ps._id));
        
        // Combine both enrollment sources
        const allEnrollmentIds = [...enrollmentIds, ...participantIds];
        userEnrollments = new Set(allEnrollmentIds);
        
        console.log(`[DEBUG] User ${userId} enrollments:`, {
          mongooseEnrollments: enrollmentIds,
          participantEnrollments: participantIds,
          combined: Array.from(userEnrollments)
        });
      }

      const mapped = all.map((ps: any) => {
        const totalProblems = ps.problemInstances?.length || ps.problems?.length || ps.problemIds?.length || 0;
        const isEnrolled = userEnrollments.has(String(ps.id)) || userEnrollments.has(String(ps._id));
        
        // Debug logging for each problem set
        console.log(`[DEBUG] Problem set ${ps.id} "${ps.title}":`, {
          psId: ps.id,
          psIdType: typeof ps.id,
          psIdString: String(ps.id),
          isEnrolled,
          userEnrollments: Array.from(userEnrollments),
          hasId: userEnrollments.has(String(ps.id)),
          hasMongoId: userEnrollments.has(String(ps._id))
        });
        
        return {
          ...ps,
          problems: ps.problems || [],
          tags: ps.tags || [],
          totalProblems,
          isEnrolled,
        };
      });
      res.json(mapped);
    } catch (error) {
      console.error('Error fetching problem sets with enrollment:', error);
      res.status(500).json({ message: 'Failed to fetch problem sets' });
    }
  }) as any);

  // Enrollment management aliases used by client UI
  app.delete('/api/problem-set-enrollments/:enrollmentId', protect as any, requireAdmin as any, (async (_req: AuthRequest, res: Response) => {
    try {
      console.log('[DEBUG] DELETE /api/problem-set-enrollments/:enrollmentId called with:', _req.params.enrollmentId);
      const enrollmentId = parseInt(_req.params.enrollmentId);
      if (Number.isNaN(enrollmentId)) return res.status(400).json({ message: 'Invalid enrollment id' });
      
      console.log('[DEBUG] Attempting to delete enrollment with ID:', enrollmentId);
      
      // Use storage layer instead of direct Mongoose calls for better compatibility
      await storage.deleteProblemSetEnrollment(enrollmentId);
      
      res.json({ message: 'Enrollment deleted' });
    } catch (error: any) {
      console.error('[DEBUG] Error deleting enrollment:', error);
      if (error.message && error.message.includes('not found')) {
        return res.status(404).json({ message: 'Enrollment not found' });
      }
      res.status(500).json({ message: 'Failed to delete enrollment' });
    }
  }) as any);

  app.patch('/api/problem-set-enrollments/:enrollmentId', protect as any, requireAdmin as any, (async (_req: AuthRequest, res: Response) => {
    try {
      const enrollmentId = parseInt(_req.params.enrollmentId);
      if (Number.isNaN(enrollmentId)) return res.status(400).json({ message: 'Invalid enrollment id' });
      const update: any = { ..._req.body, updatedAt: new Date() };
      const updated = await ProblemSetEnrollment.findOneAndUpdate({ id: enrollmentId }, { $set: update }, { new: true }).lean();
      if (!updated) return res.status(404).json({ message: 'Enrollment not found' });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update enrollment' });
    }
  }) as any);

  // API-only 404 JSON fallback (prevents HTML responses for unknown API routes)
  app.use('/api', (_req, res) => {
    res.status(404).json({ message: 'Not Found' });
  });

  return server;
}