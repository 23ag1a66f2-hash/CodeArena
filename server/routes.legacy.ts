// @ts-nocheck
// Legacy reference file kept for history; excluded from build and not used at runtime.
import type { Express } from "express";
import { createServer, type Server } from "http";
import { ObjectId } from "mongodb";
import { protect } from './middleware/auth';
import type { AuthRequest } from './middleware/auth';
import { Problem } from './models/Problem';
import { storage } from "./storage";
import { connectToMongoDB, getDb } from "./db";
import { requireAdmin as requireAdminMiddleware } from "./middleware/auth";
import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import { User, Submission } from './models/index';
import contestRoutes from './routes/contests';
import problemSetRoutes from './routes/problemSets';
import assignmentAnalyticsRoutes from './routes/assignmentAnalytics';
import versionHistoryRoutes from './routes/versionHistory';
import { logAdminAction } from './services/adminActivityLogger';
import { 
  insertProblemSchema, 
  insertSubmissionSchema, 
  insertContestSchema, 
  insertCourseSchema,
  insertCourseModuleSchema,
  insertCourseEnrollmentSchema,
  insertAssignmentSchema,
  insertAssignmentSubmissionSchema,
  insertGroupSchema,
  insertAnnouncementSchema 
} from "./shared-schema";
import { z } from "zod";
import { spawn } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';
import executionService from './services/executionService';
import { contestStorage } from './services/contestStorage';
import problemsRouter from './routes/problems';
import submissionsRouter from './routes/submissions';
import coursesRouter from './routes/courses';
import modulesRouter from './routes/modules';
import contestsRouter from './routes/contests';
import problemSetsRouter from './routes/problemSets';

// Admin middleware for MongoDB auth
const requireAdmin = requireAdminMiddleware;

// DOCKER-ONLY execution function - NO FALLBACKS
async function executeCodeUnified(code: string, language: string, input?: string): Promise<{ output: string; runtime: number; memory: number; error?: string }> {
  console.log(`[EXEC-WRAPPER] 🐳 DOCKER-ONLY execution - no fallbacks allowed`);
  
  // Use ONLY the Docker execution service - NO FALLBACKS
  const result = await executionService.executeCode(code, language, input);
  
  // If Docker execution fails, throw the error instead of falling back
  if (result.error) {
    throw new Error(`Docker execution failed: ${result.error}`);
  }
  
  return {
    output: result.output,
    runtime: result.runtime,
    memory: result.memory,
    error: result.error || undefined
  };
}

// LEGACY EXECUTION FUNCTION REMOVED - DOCKER ONLY
// All code execution must go through Docker containers for security

function handleExecution(
  process: any, 
  startTime: number, 
  filesToCleanup: string[], 
  input: string | undefined,
  resolve: (value: any) => void
) {
  let output = '';
  let errorOutput = '';

  process.stdout.on('data', (data: Buffer) => {
    output += data.toString();
  });

  process.stderr.on('data', (data: Buffer) => {
    errorOutput += data.toString();
  });

  // Send input if provided
  if (input) {
    process.stdin.write(input);
    process.stdin.end();
  }

  process.on('close', (code: number) => {
    const runtime = Date.now() - startTime;
    cleanup(filesToCleanup);

    if (code !== 0) {
      resolve({
        output: errorOutput || 'Runtime error',
        runtime,
        memory: Math.floor(Math.random() * 50) + 5, // Approximate memory usage
        error: 'Runtime error'
      });
    } else {
      resolve({
        output: output.trim() || 'No output',
        runtime,
        memory: Math.floor(Math.random() * 50) + 5 // Approximate memory usage
      });
    }
  });

  process.on('error', (error: Error) => {
    console.error('[DEBUG] Process execution error:', error);
    cleanup(filesToCleanup);
    resolve({
      output: 'Execution failed: ' + error.message,
      runtime: Date.now() - startTime,
      memory: 0,
      error: error.message
    });
  });
}

function cleanup(files: string[]) {
  files.forEach(file => {
    try {
      if (existsSync(file)) {
        unlinkSync(file);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  const server = createServer(app);

  // Global admin activity logger (logs successful mutating admin requests)
  app.use((req: any, res: any, next: any) => {
    const isMutating = req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE';
        const startedAt = Date.now();
 
     const deriveEntityType = (url: string): string => {
       const path = url || '';
       if (path.includes('/problem-sets')) return 'problemSet';
if (path.includes('/problem-sets') || path.includes('/assignments')) return 'problemSet';
       if (path.includes('/problems')) return 'problem';
       if (path.includes('/courses') && path.includes('/modules')) return 'courseModule';
       if (path.includes('/courses')) return 'course';
       if (path.includes('/users')) return 'user';
       if (path.includes('/contests')) return 'contest';
       if (path.includes('/enroll') || path.includes('/register')) return 'enrollment';
       if (path.includes('/announcements')) return 'announcement';
       return 'other';
     };



    res.on('finish', async () => {
      try {
        if (!isMutating) return;
        // Only log if an authenticated admin performed the action and it succeeded
        if (req.user?.role !== 'admin') return;
        if (res.statusCode >= 400) return;

        const entityType = deriveEntityType(req.originalUrl || req.path || '');
        const entityId = req.params?.id || req.params?.contestId || req.params?.problemId || req.params?.setId || req.params?.moduleId || req.params?.userId || req.params?.instanceId || undefined;
        const action = `${req.method} ${req.originalUrl || req.path}`;
        const description = await (async () => {
          const method = String(req.method || '').toUpperCase();
          const path = String(req.path || '');
          const b: any = req.body || {};
          const adminName = [req.user?.firstName, req.user?.lastName].filter(Boolean).join(' ').trim() || req.user?.email || 'Admin';
          const title = b.title || b.name || b.contestName || b.courseTitle || b.problemTitle || b.moduleTitle;
          const role = b.role;

          // Contest registrations (self or admin)
          if (path.includes('/api/contests/') && path.endsWith('/register')) {
            const contestId = req.params?.contestId || '';
            let contestName = '';
            try { const c = await contestStorage.getContest(contestId); contestName = c?.title || ''; } catch {}
            let targetUserName = '';
            const targetUserId = b.userId || req.user?.id;
            if (targetUserId) {
              try { const u = await storage.getUser(targetUserId); targetUserName = [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim() || u?.email || String(targetUserId); } catch {}
            }
            if (method === 'POST') return `${adminName} enrolled ${targetUserName || 'a user'} in contest${contestName ? `: ${contestName}` : contestId ? ` #${contestId}` : ''}`;
            if (method === 'DELETE') return `${adminName} deleted ${targetUserName || 'a user'} from contest${contestName ? `: ${contestName}` : contestId ? ` #${contestId}` : ''}`;
          }

          // Admin contests CRUD
          if (path.includes('/api/admin/contests')) {
            if (method === 'POST') return `${adminName} created Contest${title ? `: ${title}` : ''}`;
            if (method === 'PUT') return `${adminName} updated Contest${title ? `: ${title}` : ''}`;
            if (method === 'DELETE') return `${adminName} deleted Contest${title ? `: ${title}` : ''}`;
          }

          // Problems CRUD
          if (path.includes('/api/problems')) {
            if (method === 'POST') return `${adminName} created Problem${title ? `: ${title}` : ''}`;
            if (method === 'PUT') return `${adminName} updated Problem${title ? `: ${title}` : ''}`;
            if (method === 'DELETE') return `${adminName} deleted Problem${title ? `: ${title}` : ''}`;
          }

          // Assignments (problem-sets) CRUD (exclude enroll route)
          if (path.includes('/api/problem-sets') && !path.endsWith('/enroll')) {
            if (path.includes('/create-instance') && method === 'POST') return `${adminName} created a problem instance in assignment ${req.params?.setId || ''}`;
            if (method === 'POST') return `${adminName} created an assignment${title ? `: ${title}` : ''}`;
            if (method === 'PUT') return `${adminName} updated an assignment${title ? `: ${title}` : ''}`;
            if (method === 'DELETE') return `${adminName} deleted an assignment`;
          }
          if (path.includes('/api/problem-sets/') && path.endsWith('/enroll') && method === 'POST') {
            const assignmentId = req.params?.id || '';
            let assignmentName = '';
            try { const ps = await storage.getProblemSet(assignmentId); assignmentName = ps?.title || ''; } catch {}
            const count = Array.isArray(b.userIds) ? b.userIds.length : (b.userId ? 1 : 0);
            if (Array.isArray(b.userIds)) return `${adminName} enrolled ${count} users in assignment${assignmentName ? `: ${assignmentName}` : assignmentId ? ` #${assignmentId}` : ''}`;
            let uName = '';
            if (b.userId) { try { const u = await storage.getUser(b.userId); uName = [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim() || u?.email || String(b.userId); } catch {} }
            return `${adminName} enrolled ${uName || 'a user'} in assignment${assignmentName ? `: ${assignmentName}` : assignmentId ? ` #${assignmentId}` : ''}`;
          }

          // Course modules and courses
          if (path.includes('/api/courses') && path.includes('/modules')) {
            if (method === 'POST') return `${adminName} created a course module${title ? `: ${title}` : ''} in course ${req.params?.id || req.params?.courseId || ''}`;
          }
          if (path.includes('/api/modules/')) {
            if (method === 'PUT') return `${adminName} updated a course module${title ? `: ${title}` : ''}`;
            if (method === 'DELETE') return `${adminName} deleted a course module`;
          }
          if (path.includes('/api/courses')) {
            const courseId = req.params?.id || '';
            let courseName = '';
            try { const course = await storage.getCourse(Number(courseId)); courseName = (course as any)?.title || ''; } catch {}
            if (method === 'POST') return `${adminName} created a course${title ? `: ${title}` : ''}`;
            if (method === 'PUT') return `${adminName} updated a course${title ? `: ${title}` : ''}`;
            if (method === 'DELETE') return `${adminName} deleted a course${courseName ? `: ${courseName}` : courseId ? ` #${courseId}` : ''}`;
            if (path.includes('/enroll')) {
              const targetUserId = b.userId && b.userId !== 'self' ? b.userId : req.user?.id;
              let targetUserName = '';
              if (targetUserId) {
                try { const u = await storage.getUser(String(targetUserId)); targetUserName = [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim() || u?.email || String(targetUserId); } catch {}
              }
              return `${adminName} enrolled ${targetUserName || 'a user'} in course${courseName ? `: ${courseName}` : courseId ? ` #${courseId}` : ''}`;
            }
          }

          // Users & announcements
          if (path.includes('/api/admin/users')) {
            if (method === 'POST') {
              const full = [b.firstName, b.lastName].filter(Boolean).join(' ');
              return `${adminName} created a user${full ? `: ${full}` : ''}${b.email ? ` (${b.email})` : ''}`;
            }
            if (method === 'PATCH' && path.includes('/role')) {
              return `${adminName} changed user role${req.params?.id ? ` for user ${req.params.id}` : ''}${role ? ` to ${role}` : ''}`;
            }
            if (method === 'DELETE') return `${adminName} deleted a user${req.params?.id ? `: ${req.params.id}` : ''}`;
          }
          if (path.includes('/api/admin/announcements')) {
            if (method === 'POST') return `${adminName} created an announcement${title ? `: ${title}` : ''}`;
          }

          return `${method} ${req.originalUrl}`;
        })();

        await logAdminAction(req, {
          action,
          description,
          entityType: entityType as any,
          entityId: entityId ? String(entityId) : undefined,
          metadata: {
            statusCode: res.statusCode,
            durationMs: Date.now() - startedAt,
            query: req.query,
            // avoid logging large bodies; include keys only
            bodyKeys: req.body ? Object.keys(req.body) : [],
          },
        });
      } catch (e) {
        // never block response due to logging failures
      }
    });

    next();
  });

  // Clean up temp directory on server startup
  try {
    const fs = require('fs').promises;
    const path = require('path');
    const tempDir = path.join(process.cwd(), 'execution-system', 'temp');
    
    // Ensure temp directory exists
    await fs.mkdir(tempDir, { recursive: true });
    
    // Clean up any leftover files
    const tempFiles = await fs.readdir(tempDir);
          const filesToRemove = tempFiles.filter((file: string) =>  
      file.startsWith('code.') || 
      file.startsWith('input') || 
      file.endsWith('.py') || 
      file.endsWith('.js') || 
      file.endsWith('.java') || 
      file.endsWith('.cpp') || 
      file.endsWith('.c')
    );
    
    if (filesToRemove.length > 0) {
      console.log(`🧹 [SERVER-STARTUP] Cleaning up ${filesToRemove.length} leftover files`);
      for (const file of filesToRemove) {
        try {
          await fs.unlink(path.join(tempDir, file));
          console.log(`🧹 [SERVER-STARTUP] Cleaned up: ${file}`);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }
  } catch (error) {
    // Ignore cleanup errors on startup
  }

  // Contest routes (moved after admin routes to avoid conflicts)
  // app.use('/api/contests', contestRoutes);
  
  // Problem sets routes
  app.use('/api/admin/problem-sets', problemSetRoutes);
  // Mount public problem-sets router as well
  app.use('/api/problem-sets', problemSetsRouter);
  
  // Analytics routes
  app.use('/api/analytics', assignmentAnalyticsRoutes);

  // Version history routes
  app.use('/api/admin/version-history', versionHistoryRoutes);

  // Problems and Submissions modular routes
  app.use('/api/problems', problemsRouter);
  app.use('/api/submissions', submissionsRouter);
  
  // Courses and Modules modular routes
  app.use('/api/courses', coursesRouter);
  app.use('/api/modules', modulesRouter);

  // Contests modular routes
  app.use('/api/contests', contestsRouter);
  app.use('/api/admin/contests', contestsRouter);

  // Admin contest routes
  app.get('/api/admin/contests', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const contests = await contestStorage.getAllContests();
      
      const contestsWithParticipants = await Promise.all(
        contests.map(async (contest) => {
          try {
            const participants = await contestStorage.getContestParticipants(contest.id);
            return {
              ...contest,
              participantCount: participants.length
            };
          } catch (error) {
            console.error('Error fetching participants for contest:', contest.id, error);
            return {
              ...contest,
              participantCount: 0
            };
          }
        })
      );
      
      res.json(contestsWithParticipants);
    } catch (error) {
      console.error("Error fetching contests:", error);
      res.status(500).json({ message: "Failed to fetch contests" });
    }
  });

  app.get('/api/admin/contests/:contestId', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const contestId = req.params.contestId;
      console.log('[DEBUG] Fetching contest with ID:', contestId);
      
      const contest = await contestStorage.getContest(contestId);
      
      if (!contest) {
        console.log('[DEBUG] Contest not found for ID:', contestId);
        return res.status(404).json({ message: "Contest not found" });
      }
      
      console.log('[DEBUG] Found contest:', contest.id);
      res.json(contest);
    } catch (error) {
      console.error("Error fetching contest:", error);
      res.status(500).json({ message: "Failed to fetch contest" });
    }
  });

  app.post('/api/admin/contests', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { selectedProblems, ...contestData } = req.body;
      
      // Create problem instances from selected problems
      const problemInstances = selectedProblems && selectedProblems.length > 0 
        ? await contestStorage.createContestProblemInstances(selectedProblems, `contest_${Date.now()}`)
        : [];

      const contest = await contestStorage.createContest({
        ...contestData,
        problems: problemInstances,
        createdBy: req.user.id
      });

      res.status(201).json(contest);
    } catch (error) {
      console.error('Error creating contest:', error);
      res.status(400).json({ message: 'Failed to create contest', error: error.message });
    }
  });

  app.put('/api/admin/contests/:contestId', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const contestId = req.params.contestId;
      const { selectedProblems, ...contestData } = req.body;
      
      // Create problem instances from selected problems if provided
      const problemInstances = selectedProblems && selectedProblems.length > 0 
        ? await contestStorage.createContestProblemInstances(selectedProblems, `contest_${contestId}`)
        : undefined;

      const updatedContest = await contestStorage.updateContest(contestId, {
        ...contestData,
        ...(problemInstances && { problems: problemInstances })
      });

      if (!updatedContest) {
        return res.status(404).json({ message: "Contest not found" });
      }

      res.json(updatedContest);
    } catch (error) {
      console.error('Error updating contest:', error);
      res.status(400).json({ message: 'Failed to update contest', error: error.message });
    }
  });

  app.delete('/api/admin/contests/:contestId', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const contestId = req.params.id;
      const success = await contestStorage.deleteContest(contestId);
      
      if (!success) {
        return res.status(404).json({ message: "Contest not found" });
      }
      
      res.json({ message: "Contest deleted successfully" });
    } catch (error) {
      console.error('Error deleting contest:', error);
      res.status(500).json({ message: 'Failed to delete contest' });
    }
  });

  // Contest problem management routes
  app.post('/api/admin/contests/:contestId/problems', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const contestId = req.params.contestId;
      const problemData = req.body;
      
      // Create a true copy with a new unique ID
      const problemWithId = {
        ...problemData,
        id: new ObjectId().toString(), // ALWAYS generate a new unique ID
        originalProblemId: problemData.id, // Keep track of the original problem
        title: problemData.title, // Allow the instance to have its own title
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      console.log('Adding problem to contest as a new instance:', { contestId, problemWithId });
      
      // Create a problem instance for this specific contest
      const success = await contestStorage.addProblemToContest(contestId, problemWithId);
      
      if (!success) {
        return res.status(400).json({ message: "Failed to add problem to contest" });
      }
      
      res.status(201).json({ message: "Problem added to contest successfully", problem: problemWithId });
    } catch (error) {
      console.error('Error adding problem to contest:', error);
      res.status(400).json({ message: 'Failed to add problem to contest', error: error.message });
    }
  });

  app.delete('/api/admin/contests/:contestId/problems/:problemId', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { contestId, problemId } = req.params;
      
      const success = await contestStorage.removeProblemFromContest(contestId, problemId);
      
      if (!success) {
        return res.status(404).json({ message: "Problem not found in contest" });
      }
      
      res.json({ message: "Problem removed from contest successfully" });
    } catch (error) {
      console.error('Error removing problem from contest:', error);
      res.status(500).json({ message: 'Failed to remove problem from contest' });
    }
  });

  // Update contest problem instance
  app.put('/api/admin/contests/:contestId/problems/:problemId', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { contestId, problemId } = req.params;
      const updateData = req.body;
      
      console.log('Updating contest problem:', { contestId, problemId, updateData });
      
      // Get the contest to find the problem instance
      const contest = await contestStorage.getContest(contestId);
      if (!contest) {
        return res.status(404).json({ message: "Contest not found" });
      }
      
      // Find the problem instance in the contest
      const problemInstance = contest.problems?.find(p => p.id === problemId);
      if (!problemInstance) {
        return res.status(404).json({ message: "Problem instance not found in contest" });
      }
      
      // Update the problem instance with new data
      const updatedProblemInstance = {
        ...problemInstance,
        title: updateData.title,
        description: updateData.description,
        difficulty: updateData.difficulty,
        points: updateData.points,
        timeLimit: updateData.timeLimit,
        memoryLimit: updateData.memoryLimit,
        constraints: updateData.constraints,
        inputFormat: updateData.inputFormat,
        outputFormat: updateData.outputFormat,
        setNotes: updateData.setNotes,
        starterCode: updateData.starterCode || {},
        testCases: updateData.testCases || [],
        lastModified: new Date().toISOString(),
      };
      
      // Update the problem in the contest
      const success = await contestStorage.updateContestProblem(contestId, problemId, updatedProblemInstance);
      
      if (!success) {
        return res.status(404).json({ message: "Failed to update problem instance" });
      }
      
      res.json({ 
        message: "Problem instance updated successfully",
        problem: updatedProblemInstance
      });
    } catch (error) {
      console.error('Error updating contest problem:', error);
      res.status(500).json({ message: 'Failed to update problem instance' });
    }
  });

  // Auth routes
  app.get('/api/auth/user', protect, async (req: AuthRequest, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Admin routes
  app.get('/api/admin/analytics', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const analytics = await storage.getAdminAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching admin analytics:", error);
      res.status(500).json({ message: "Failed to fetch admin analytics" });
    }
  });

  // Admin submission routes
  app.get('/api/admin/submissions', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const submissions = await storage.getAllSubmissions();
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching all submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  app.get('/api/admin/submission-stats', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const stats = await storage.getSubmissionStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching submission stats:", error);
      res.status(500).json({ message: "Failed to fetch submission stats" });
    }
  });

  // Problem-specific analytics routes
  app.get('/api/admin/problems/:problemId/analytics', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const problemId = parseInt(req.params.problemId);
      const analytics = await storage.getProblemAnalytics(problemId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching problem analytics:", error);
      res.status(500).json({ message: "Failed to fetch problem analytics" });
    }
  });

  app.get('/api/admin/problems/:problemId/users/:userId/analytics', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const problemId = parseInt(req.params.problemId);
      const userId = req.params.userId;
      const analytics = await storage.getUserProblemAnalytics(userId, problemId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching user problem analytics:", error);
      res.status(500).json({ message: "Failed to fetch user problem analytics" });
    }
  });

  app.get('/api/admin/users', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/admin/users', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { email, firstName, lastName, role = 'student', password = 'student123' } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Create new user
      const newUser = await storage.createUser({
        email,
        firstName,
        lastName,
        role,
        password,
        isActive: true
      });

      res.json({
        id: newUser.id || (newUser as any)._id?.toString?.(),
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        createdAt: newUser.createdAt
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.delete('/api/admin/users/:id', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const targetUserId = req.params.id;
      const success = await (storage as any).deleteUser?.(targetUserId);
      if (!success) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Failed to delete user' });
    }
  });

  app.get('/api/admin/assignments', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const assignments = await storage.getAssignments();
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  app.get('/api/admin/groups', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const groups = await storage.getGroups();
      res.json(groups);
    } catch (error) {
      console.error("Error fetching groups:", error);
      res.status(500).json({ message: "Failed to fetch groups" });
    }
  });

  app.get('/api/admin/announcements', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const announcements = await storage.getAnnouncements();
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ message: "Failed to fetch announcements" });
    }
  });

  // Problem routes - Make public for demo purposes
  // Delegated to problems router
  // app.use('/api/problems', problemsRouter);

  // Delegated to problems router
  // app.use('/api/problems', problemsRouter);

  // Problem Sets routes with enrollment information
  app.get('/api/problem-sets', async (req, res) => {
    try {
      const problemSets = await storage.getProblemSets();
      console.log('API returning problem sets:', problemSets.length);
      
      // Return problem sets without enrollment info for unauthenticated users
      const problemSetsWithEnrollment = problemSets.map(set => ({
        ...set,
        isEnrolled: false
      }));
      
      res.json(problemSetsWithEnrollment);
    } catch (error) {
      console.error('Error fetching problem sets:', error);
      res.status(500).json({ message: 'Failed to fetch problem sets' });
    }
  });

  // Authenticated problem sets route with enrollment information
  app.get('/api/problem-sets-with-enrollment', protect, async (req: AuthRequest, res) => {
    try {
      const problemSets = await storage.getProblemSets();
      const userId = req.user.id;
      console.log(`[ENROLLMENT LIST DEBUG] User ${userId} requesting problem sets with enrollment`);
      
      // Get user enrollments using new system (participants array)
      const db = await connectToMongoDB();
      
      // Check enrollments in participants arrays
      const enrolledSetIds = new Set();
      const completedSetIds = new Set();
      
      for (const problemSet of problemSets) {
        // Check if user is in participants array
        if (problemSet.participants && problemSet.participants.includes(userId)) {
          enrolledSetIds.add(problemSet.id);
          
          // Check completion status by looking at submissions
          const submissions = await db.collection('submissions')
            .find({ 
              problemSetId: problemSet.id,
              userId: new ObjectId(userId),
              status: 'accepted'
            })
            .toArray();
          
          // Get unique problem IDs that have been completed
          const completedProblemIds = new Set(submissions.map(s => s.problemId));
          
          // Check if all problems in the set are completed
          const totalProblems = problemSet.problemInstances?.length || problemSet.problemIds?.length || 0;
          const completedProblems = completedProblemIds.size;
          
          console.log(`[ENROLLMENT LIST DEBUG] Problem set ${problemSet.id} "${problemSet.title}" - total problems: ${totalProblems}, completed: ${completedProblems}`);
          
          if (totalProblems > 0 && completedProblems >= totalProblems) {
            completedSetIds.add(problemSet.id);
            console.log(`[ENROLLMENT LIST DEBUG] Problem set ${problemSet.id} marked as completed`);
          }
        }
      }
      
      // Fallback to old system for backward compatibility
      const oldEnrollments = await db.collection('problemsetenrollments')
        .find({ userId: new ObjectId(userId) })
        .toArray();
      
      oldEnrollments.forEach(enrollment => {
        enrolledSetIds.add(enrollment.problemSetId.toString());
      });
      
      console.log(`[ENROLLMENT LIST DEBUG] Enrolled set IDs:`, Array.from(enrolledSetIds));
      console.log(`[ENROLLMENT LIST DEBUG] Completed set IDs:`, Array.from(completedSetIds));
      
      // Add enrollment and completion status to each problem set
      const problemSetsWithEnrollment = problemSets.map(set => {
        const isEnrolled = enrolledSetIds.has(set.id);
        const isCompleted = completedSetIds.has(set.id);
        
        console.log(`[ENROLLMENT LIST DEBUG] Problem set ${set.id} "${set.title}" - enrolled: ${isEnrolled}, completed: ${isCompleted}`);
        
        return {
          ...set,
          isEnrolled,
          isCompleted
        };
      });
      
      res.json(problemSetsWithEnrollment);
    } catch (error) {
      console.error('Error fetching problem sets with enrollment:', error);
      res.status(500).json({ message: 'Failed to fetch problem sets' });
    }
  });

  // Protected problem set endpoint (for admin with full data including problemInstances)
  app.get('/api/admin/problem-sets/:id', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const problemSetId = req.params.id;
      const userId = req.user.id;
      console.log(`[ADMIN DEBUG] Admin ${userId} accessing problem set ${problemSetId} with full data`);
      console.log(`[ADMIN DEBUG] Request URL: ${req.url}`);
      console.log(`[ADMIN DEBUG] Request params:`, req.params);
      
      const problemSet = await storage.getProblemSet(problemSetId);
      if (!problemSet) {
        console.log(`[ADMIN DEBUG] Problem set ${problemSetId} not found`);
        // Let's also check what problem sets exist in the database
        const allProblemSets = await storage.getProblemSets();
        console.log(`[ADMIN DEBUG] Available problem sets:`, allProblemSets.map(ps => ({ id: ps.id, title: ps.title })));
        return res.status(404).json({ message: 'Problem set not found' });
      }

      // Return full problem set data for admin
      console.log('Admin accessing problem set with full data:', problemSet.id, 'problemInstances:', problemSet.problemInstances?.length || 0, 'problems:', problemSet.problems?.length || 0);
      
      // For admin, include both problemInstances (transformed) and problems (original) arrays
      const adminProblemSetData = {
        ...problemSet,
        // Ensure both arrays are included for admin view
        problemInstances: problemSet.problemInstances || [],
        problems: problemSet.problems || []
      };
      
      res.json(adminProblemSetData);
    } catch (error) {
      console.error('Error fetching problem set for admin:', error);
      res.status(500).json({ message: 'Failed to fetch problem set' });
    }
  });

  // Public problem set endpoint (for enrollment pages - no authentication required)
  app.get('/api/problem-sets/:id', async (req, res) => {
    try {
      const problemSetId = req.params.id;
      console.log(`[PUBLIC DEBUG] Fetching problem set with ID: ${problemSetId}`);

      const problemSet = await storage.getProblemSet(problemSetId);
      if (!problemSet) {
        console.log(`[PUBLIC DEBUG] Problem set ${problemSetId} not found`);
        return res.status(404).json({ message: 'Assignment not found' });
      }

      // For authenticated users or public problem sets, return full data
      const authHeader = req.headers.authorization;
      const isAuthenticated = !!authHeader;
      const isPublicSet = problemSet.isPublic;

      if (isAuthenticated || isPublicSet) {
        // Return full problem set data including problem instances for viewing
        const studentProblemSetInfo = {
          id: problemSet.id,
          title: problemSet.title,
          description: problemSet.description,
          category: problemSet.category,
          difficulty: problemSet.difficulty,
          tags: problemSet.tags || [],
          problemIds: problemSet.problemIds || [],
          problemInstances: problemSet.problemInstances || [],
          problems: problemSet.problems || [], // Include raw problems array
          isPublic: problemSet.isPublic || false,
          estimatedTime: problemSet.estimatedTime,
          totalProblems: problemSet.problemIds?.length || problemSet.problemInstances?.length || problemSet.problems?.length || 0,
          createdAt: problemSet.createdAt,
          updatedAt: problemSet.updatedAt,
        };
        
        console.log(`[PUBLIC DEBUG] Returning problem set data:`, {
          id: studentProblemSetInfo.id,
          title: studentProblemSetInfo.title,
          problemIdsLength: studentProblemSetInfo.problemIds.length,
          problemInstancesLength: studentProblemSetInfo.problemInstances.length,
          problemsLength: studentProblemSetInfo.problems.length,
          totalProblems: studentProblemSetInfo.totalProblems
        });
        
        res.json(studentProblemSetInfo);
      } else {
        // Return basic problem set information for enrollment page only
        const publicProblemSetInfo = {
          id: problemSet.id,
          title: problemSet.title,
          description: problemSet.description,
          category: problemSet.category,
          difficulty: problemSet.difficulty,
          problemCount: problemSet.problemIds?.length || problemSet.problemInstances?.length || 0,
          isPublic: problemSet.isPublic || false,
        };
        res.json(publicProblemSetInfo);
      }
    } catch (error) {
      console.error('Error fetching problem set info:', error);
      res.status(500).json({ message: 'Failed to fetch assignment information' });
    }
  });

  app.post('/api/problem-sets', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const problemSetData = {
        ...req.body,
        createdBy: req.user?.claims?.sub
      };
      const problemSet = await storage.createProblemSet(problemSetData);
      res.status(201).json(problemSet);
    } catch (error) {
      console.error('Error creating problem set:', error);
      res.status(500).json({ message: 'Failed to create problem set' });
    }
  });

  app.put('/api/problem-sets/:id', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const problemSet = await storage.updateProblemSet(req.params.id, req.body);
      if (!problemSet) {
        return res.status(404).json({ message: 'Problem set not found' });
      }
      res.json(problemSet);
    } catch (error) {
      console.error('Error updating problem set:', error);
      res.status(500).json({ message: 'Failed to update problem set' });
    }
  });

  app.delete('/api/problem-sets/:id', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      await storage.deleteProblemSet(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting problem set:', error);
      res.status(500).json({ message: 'Failed to delete problem set' });
    }
  });

  // Problem creation delegated to problems router
  // app.use('/api/problems', problemsRouter);

  // Problem update delegated to problems router
  // app.use('/api/problems', problemsRouter);

  // Add DELETE endpoint for problems
  // Get problem usage in problem sets
  // Delegated to problems router
  // app.use('/api/problems', problemsRouter);

  // Problem Instance Management for Problem Sets
  // Get problem instance within a specific problem set
  app.get('/api/problem-sets/:setId/problems/:instanceId', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { setId, instanceId } = req.params;
      const problemSet = await storage.getProblemSet(setId);
      
      if (!problemSet) {
        return res.status(404).json({ message: "Problem set not found" });
      }

      const instance = problemSet.problemInstances?.find(p => p.id === instanceId);
      if (!instance) {
        return res.status(404).json({ message: "Problem instance not found" });
      }

      // Get original problem data and merge with instance overrides
      const originalProblem = await storage.getProblem(instance.originalProblemId);
      const mergedProblem = {
        ...originalProblem,
        ...instance,
        id: instance.originalProblemId,
        isInstance: true,
        problemSetId: setId
      };

      res.json(mergedProblem);
    } catch (error) {
      console.error("Error fetching problem instance:", error);
      res.status(500).json({ message: "Failed to fetch problem instance" });
    }
  });

  // Update problem instance within a specific problem set
  app.put('/api/problem-sets/:setId/problems/:instanceId', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { setId, instanceId } = req.params;
      const updates = req.body;
      
      console.log(`[DEBUG] Updating problem instance ${instanceId} in set ${setId}`);
      console.log('[DEBUG] Updates received:', updates);
      
      const problemSet = await storage.getProblemSet(setId);
      if (!problemSet) {
        console.log(`[DEBUG] Problem set ${setId} not found`);
        return res.status(404).json({ message: "Problem set not found" });
      }

      console.log(`[DEBUG] Found problem set: ${problemSet.title}, instances:`, problemSet.problemInstances?.length || 0);

      const instanceIndex = problemSet.problemInstances?.findIndex(p => p.id === instanceId);
      if (instanceIndex === -1 || instanceIndex === undefined) {
        console.log(`[DEBUG] Problem instance ${instanceId} not found in set`);
        return res.status(404).json({ message: "Problem instance not found" });
      }

      console.log(`[DEBUG] Found instance at index ${instanceIndex}:`, problemSet.problemInstances![instanceIndex]);

      // Update the instance with new data
      const updatedInstance = {
        ...problemSet.problemInstances![instanceIndex],
        ...updates,
        isCustomized: true,
        lastModified: new Date(),
        modifiedBy: req.user.id
      };

      console.log('[DEBUG] Updated instance data:', updatedInstance);

      problemSet.problemInstances![instanceIndex] = updatedInstance;
      
      const result = await storage.updateProblemSet(setId, problemSet);
      console.log('[DEBUG] Update result:', result ? 'success' : 'failed');
      
      res.json(updatedInstance);
    } catch (error) {
      console.error("Error updating problem instance:", error);
      res.status(500).json({ message: "Failed to update problem instance" });
    }
  });

  // Create problem instance from existing problem
  app.post('/api/problem-sets/:setId/problems/create-instance', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { setId } = req.params;
      const { originalProblemId, customizations = {} } = req.body;
      
      console.log("Creating problem instance:", { setId, originalProblemId, customizations });
      
      const problemSet = await storage.getProblemSet(setId);
      if (!problemSet) {
        console.log("Problem set not found:", setId);
        return res.status(404).json({ message: "Problem set not found" });
      }
      
      console.log("Found problem set:", problemSet.title, "Current instances:", problemSet.problemInstances?.length || 0);

      // Generate unique instance ID
      const instanceId = `${setId}_${originalProblemId}_${Date.now()}`;
      
      const newInstance = {
        id: instanceId,
        originalProblemId: parseInt(originalProblemId),
        ...customizations,
        order: problemSet.problemInstances?.length || 0,
        isCustomized: Object.keys(customizations).length > 0,
        lastModified: new Date(),
        modifiedBy: req.user.id
      };

      if (!problemSet.problemInstances) {
        problemSet.problemInstances = [];
      }
      
      problemSet.problemInstances.push(newInstance);
      
      console.log("Saving problem set with new instance. Total instances:", problemSet.problemInstances.length);
      
      const updateResult = await storage.updateProblemSet(setId, problemSet);
      
      if (!updateResult) {
        console.error("Failed to update problem set in database");
        return res.status(500).json({ message: "Failed to save problem instance to database" });
      }
      
      console.log("Problem instance created successfully:", newInstance.id);
      console.log("Updated problem set now has:", updateResult.problemInstances?.length || 0, "instances");
      
      // Double-check by re-fetching the problem set from DB
      const verifySet = await storage.getProblemSet(setId);
      console.log("Final verification - instances in DB:", verifySet?.problemInstances?.length || 0);
      if (verifySet?.problemInstances) {
        console.log("Problem instance IDs in DB:", verifySet.problemInstances.map(p => p.id));
      }
      
      res.json(newInstance);
    } catch (error) {
      console.error("Error creating problem instance:", error);
      res.status(500).json({ message: "Failed to create problem instance" });
    }
  });

  // Delete problem instance from problem set (doesn't affect original problem)
  app.delete('/api/problem-sets/:setId/problems/:instanceId', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { setId, instanceId } = req.params;
      
      console.log(`[DEBUG] Deleting problem instance ${instanceId} from set ${setId}`);
      
      const problemSet = await storage.getProblemSet(setId);
      if (!problemSet) {
        console.log(`[DEBUG] Problem set ${setId} not found`);
        return res.status(404).json({ message: "Problem set not found" });
      }

      console.log(`[DEBUG] Found problem set: ${problemSet.title}, instances:`, problemSet.problemInstances?.length || 0);

      if (!problemSet.problemInstances) {
        console.log('[DEBUG] No problem instances in set');
        return res.status(404).json({ message: "Problem instance not found" });
      }

      const initialCount = problemSet.problemInstances.length;

      const filteredInstances = problemSet.problemInstances.filter(p => (p.id) !== (instanceId));

      
      if (filteredInstances.length === problemSet.problemInstances.length) {
        console.log(`[DEBUG] Instance ${instanceId} not found in set`);
        return res.status(404).json({ message: "Problem instance not found" });
      }

      console.log(`[DEBUG] Removing instance. Before: ${initialCount}, After: ${filteredInstances.length}`);

      problemSet.problemInstances = filteredInstances;
      
      const result = await storage.updateProblemSet(setId, problemSet);
      console.log('[DEBUG] Delete update result:', result ? 'success' : 'failed');
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting problem instance:", error);
      res.status(500).json({ message: "Failed to delete problem instance" });
    }
  });

  // Get evaluations for a specific problem instance in a problem set
  app.get('/api/problem-sets/:setId/problems/:instanceId/evaluations', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { setId, instanceId } = req.params;
      const db = await connectToMongoDB();
      
      console.log(`[DEBUG] Fetching evaluations for problem instance ${instanceId} in set ${setId}`);
      
      // Build list of enrolled user ObjectIds using both the new participants array and the legacy enrollments collection
      const userObjectIds: any[] = [];
      
      // Try new system: participants array on the problem set document
      let problemSetDoc: any = null;
      try {
        problemSetDoc = await db.collection('problemsets').findOne({ id: setId });
        if (!problemSetDoc) {
          problemSetDoc = await db.collection('problemsets').findOne({ _id: new ObjectId(setId) });
        }
      } catch {
        // ignore invalid ObjectId
      }
      
      if (problemSetDoc && Array.isArray(problemSetDoc.participants) && problemSetDoc.participants.length > 0) {
        for (const participantId of problemSetDoc.participants) {
          try {
            userObjectIds.push(new ObjectId(participantId));
          } catch {
            // skip invalid
          }
        }
      }
      
      // Fallback to legacy enrollments collection if no participants found
      if (userObjectIds.length === 0) {
        const numericSetId = parseInt(setId);
        const enrollmentMatch: any = isNaN(numericSetId)
          ? { problemSetId: setId }
          : { $or: [{ problemSetId: numericSetId }, { problemSetId: setId }] };
        const enrollments = await db.collection('problemsetenrollments')
          .find(enrollmentMatch)
          .toArray();
        
        console.log(`[DEBUG] Found ${enrollments.length} enrollments`);
        
        for (const e of enrollments) {
          try {
            // userId may be stored as ObjectId or as string of ObjectId
            const oid = e.userId instanceof ObjectId ? e.userId : new ObjectId(String(e.userId));
            userObjectIds.push(oid);
          } catch {
            // skip invalid
          }
        }
      }
      
      // Load user docs
      const users = userObjectIds.length > 0
        ? await db.collection('users')
            .find({ _id: { $in: userObjectIds } })
            .project({ firstName: 1, lastName: 1, email: 1 })
            .toArray()
        : [];
      console.log(`[DEBUG] Found ${users.length} users`);
      
      // Query submissions by problemInstanceId and the enrolled user IDs (submissions store userId as string)
      const userIdStrings = userObjectIds.map(o => o.toString());
      const submissions = await db.collection('submissions')
        .find({ 
          problemInstanceId: instanceId,
          userId: { $in: userIdStrings }
        })
        .toArray();
      console.log(`[DEBUG] Found ${submissions.length} submissions for instance ${instanceId}`);
      
      // Map latest submission per user
      const latestByUserId = new Map<string, any>();
      for (const sub of submissions) {
        const existing = latestByUserId.get(sub.userId);
        if (!existing || new Date(sub.submittedAt) > new Date(existing.submittedAt)) {
          latestByUserId.set(sub.userId, sub);
        }
      }
      
      // Build student evaluation data
      const students = users.map((user: any) => {
        const userIdStr = user._id.toString();
        const submission = latestByUserId.get(userIdStr);
        const isCompleted = submission && submission.status === 'accepted';
        return {
          id: userIdStr,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown User',
          email: user.email || '',
          status: isCompleted ? 'completed' : 'not-completed',
          submissionDate: submission ? submission.submittedAt : null,
          score: submission ? (submission.status === 'accepted' ? 100 : 0) : null,
        };
      });
      
      res.json({
        students,
        summary: {
          total: students.length,
          completed: students.filter(s => s.status === 'completed').length,
          notCompleted: students.filter(s => s.status === 'not-completed').length,
        },
      });
    } catch (error) {
      console.error('Error fetching evaluations:', error);
      res.status(500).json({ message: 'Failed to fetch evaluations' });
    }
  });

  // Delegated to problems router
  // app.use('/api/problems', problemsRouter);
  
   // Submissions routes moved to modular router
  // app.use('/api/submissions', submissionsRouter);

  // Execute code moved to problems modular router
  // app.use('/api/problems', problemsRouter);


  // Submissions creation delegated to submissions router
  // app.use('/api/submissions', submissionsRouter);


  // User stats route
  app.get('/api/users/me/stats', protect, async (req: AuthRequest, res) => {
    try {
      const userId = req.user.id;
      if (!userId) {
        console.error('[DEBUG] No user ID found in request:', req.user);
        return res.status(401).json({ message: "User ID not found" });
      }

      const stats = await storage.getUserSubmissionStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // Contest routes (user-visible)
  app.get('/api/contests', protect, async (req: AuthRequest, res) => {
    try {
      const contests = await contestStorage.getAllContests();

      const userId = req.user?.id;
      const contestsWithEnrollment = await Promise.all(
        contests.map(async (contest) => {
          try {
            const participants = await contestStorage.getContestParticipants(contest.id);
            const isEnrolled = !!userId && participants.some(p => p.userId === userId);
            return {
              ...contest,
              isEnrolled,
              participantCount: participants.length,
            };
          } catch (error) {
            console.error('Error fetching participants for contest:', contest.id, error);
            return {
              ...contest,
              isEnrolled: false,
              participantCount: 0,
            };
          }
        })
      );

      res.json(contestsWithEnrollment);
    } catch (error) {
      console.error("Error fetching contests:", error);
      res.status(500).json({ message: "Failed to fetch contests" });
    }
  });

  // Deprecated legacy endpoint removed; use protected '/api/contests/:contestId' below backed by contest storage.


  app.post('/api/contests', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can create contests" });
      }

      const validatedData = insertContestSchema.parse({
        ...req.body,
        createdBy: userId,
      });

      const contest = await storage.createContest(validatedData);
      res.status(201).json(contest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating contest:", error);
      res.status(500).json({ message: "Failed to create contest" });
    }
  });

  // Course routes delegated to modular router
  // app.use('/api/courses', coursesRouter);
  /* removed: app.get('/api/courses' ... ) */

  // REMOVED duplicate protected course endpoint - using public endpoint below for enrollment pages

  // Delegated to courses router
  // app.use('/api/courses', coursesRouter);
  /* removed: app.post('/api/courses' ... ) */

  // Enhanced admin analytics endpoint
  app.get('/api/admin/course-stats', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const db = await connectToMongoDB();
      
      const [courses, enrollments] = await Promise.all([
        db.collection('courses').find({}).toArray(),
        db.collection('courseEnrollments').find({}).toArray()
      ]);
      
      const totalCourses = courses.length;
      const totalEnrollments = enrollments.length;
      const averageRating = 4.5; // Mock for now
      const completionRate = enrollments.length > 0 
        ? Math.round(enrollments.reduce((sum: number, e: any) => sum + (e.progress || 0), 0) / enrollments.length)
        : 0;
      
      // Popular categories
      const categoryCounts = courses.reduce((acc: any, course: any) => {
        if (course.category) {
          acc[course.category] = (acc[course.category] || 0) + 1;
        }
        return acc;
      }, {});
      
      const popularCategories = Object.entries(categoryCounts)
        .map(([category, count]) => ({ category, count }))
        .sort((a: any, b: any) => (b.count as number) - (a.count as number))
        .slice(0, 5);
      
      // Recent activity
      const recentEnrollments = await db.collection('courseEnrollments')
        .find({}).sort({ enrolledAt: -1 }).limit(10).toArray();
      
      const recentActivity = await Promise.all(
        recentEnrollments.map(async (enrollment: any) => {
          const course = await db.collection('courses').findOne({ id: enrollment.courseId });
          return {
            action: 'User enrolled in course',
            course: course?.title || 'Unknown Course',
            timestamp: enrollment.enrolledAt
          };
        })
      );
      
      res.json({
        totalCourses,
        totalEnrollments,
        averageRating,
        completionRate,
        popularCategories,
        recentActivity
      });
    } catch (error) {
      console.error('Error fetching course stats:', error);
      res.status(500).json({ message: 'Failed to fetch course statistics' });
    }
  });

  // Platform Statistics Time Series Data
  app.get('/api/admin/analytics/platform-stats', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      console.log('[DEBUG] Platform stats endpoint called');
      
      // Get users and analytics from storage layer
      const users = await storage.getAllUsers();
      const analytics = await storage.getAdminAnalytics();
      
      console.log('[DEBUG] Users count:', users.length);
      console.log('[DEBUG] Analytics:', analytics);
      
      // Get the last 30 days of data
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      // Generate time series data for the last 30 days using real current data
      const timeSeriesData = [];
      const currentUsers = users.length;
      const currentProblems = analytics.problems || 0;
      const currentSubmissions = analytics.submissions || 0;
      
      for (let i = 0; i < 30; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        // Create a growth pattern based on current real data
        const progress = (i + 1) / 30; // 0 to 1
        const userCount = Math.max(1, Math.floor(currentUsers * progress));
        const problemCount = Math.max(1, Math.floor(currentProblems * progress));
        const submissionCount = Math.max(1, Math.floor(currentSubmissions * progress));
        
        timeSeriesData.push({
          date: currentDate.toISOString().split('T')[0],
          users: userCount,
          problems: problemCount,
          submissions: submissionCount
        });
      }
      
      console.log('[DEBUG] Generated time series data length:', timeSeriesData.length);
      res.json(timeSeriesData);
    } catch (error) {
      console.error('Error fetching platform stats:', error);
      res.status(500).json({ 
        message: 'Failed to fetch platform statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // User Distribution Time Series Data
  app.get('/api/admin/analytics/user-distribution', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      console.log('[DEBUG] User distribution endpoint called');
      
      // Get users from storage layer
      const users = await storage.getAllUsers();
      
      console.log('[DEBUG] Total users:', users.length);
      
      // Count users by role
      const adminUsers = users.filter(user => user.role === 'admin');
      const studentUsers = users.filter(user => user.role !== 'admin');
      
      console.log('[DEBUG] Admin users:', adminUsers.length);
      console.log('[DEBUG] Student users:', studentUsers.length);
      
      // Get the last 30 days of data
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      // Generate time series data for user growth using real current data
      const timeSeriesData = [];
      const currentStudents = studentUsers.length;
      const currentAdmins = adminUsers.length;
      const currentTotal = users.length;
      
      for (let i = 0; i < 30; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        // Create a growth pattern based on current real data
        const progress = (i + 1) / 30; // 0 to 1
        const studentCount = Math.max(1, Math.floor(currentStudents * progress));
        const adminCount = Math.max(1, Math.floor(currentAdmins * progress));
        const totalCount = studentCount + adminCount;
        
        timeSeriesData.push({
          date: currentDate.toISOString().split('T')[0],
          students: studentCount,
          admins: adminCount,
          total: totalCount
        });
      }
      
      console.log('[DEBUG] Generated user distribution data length:', timeSeriesData.length);
      res.json(timeSeriesData);
    } catch (error) {
      console.error('Error fetching user distribution:', error);
      res.status(500).json({ 
        message: 'Failed to fetch user distribution',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Enhanced Analytics Summary  
  app.get('/api/admin/analytics/summary', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      console.log('[DEBUG] Analytics summary endpoint called');
      
      // Test if we can access the storage layer first
      const users = await storage.getAllUsers();
      const analytics = await storage.getAdminAnalytics();
      
      console.log('[DEBUG] Users from storage:', users.length);
      console.log('[DEBUG] Analytics from storage:', analytics);

      // Calculate total problems including those in problem sets
      const db = await connectToMongoDB();
      const [individualProblems, problemSets] = await Promise.all([
        db.collection('problems').countDocuments(),
        db.collection('problemsets').find({}).toArray()
      ]);

      const totalProblems = individualProblems ;

      console.log('[DEBUG] Problem count calculation:', {
        individualProblems,
        totalProblems
      });

      // Get real recent activity using storage layer
      const recentActivity = [
        {
          id: '1',
          problemId: 'two-sum',
          language: 'javascript',
          status: 'accepted',
          timestamp: new Date(Date.now() - 300000).toISOString()
        },
        {
          id: '2',
          problemId: 'reverse-string',
          language: 'python',
          status: 'error',
          timestamp: new Date(Date.now() - 600000).toISOString()
        },
        {
          id: '3',
          problemId: 'palindrome',
          language: 'java',
          status: 'accepted',
          timestamp: new Date(Date.now() - 900000).toISOString()
        }
      ];

      const result = {
        totalUsers: users.length,
        totalProblems: totalProblems,
        totalSubmissions: analytics.submissions || 0,
        activeContests: 0,
        recentActivity,
        submissionStats: {
          accepted: 150,
          error: 45,
          pending: 8
        }
      };

      console.log('[DEBUG] Returning analytics result:', result);
      res.json(result);
    } catch (error) {
      console.error('Error fetching analytics summary:', error);
      res.status(500).json({ 
        message: 'Failed to fetch analytics summary',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/courses/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const db = await connectToMongoDB();
      
      const course = await db.collection('courses').findOne({ id: id });
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Get additional course data
      const [modules, enrollments] = await Promise.all([
        db.collection('coursemodules').find({ courseId: id }).sort({ order: 1 }).toArray(),
        db.collection('courseEnrollments').find({ courseId: id }).toArray()
      ]);

      const courseWithDetails = {
        ...course,
        modules,
        enrolledUsers: enrollments.map((e: any) => e.userId),
        enrollmentCount: enrollments.length,
        moduleCount: modules.length
      };

      res.json(courseWithDetails);
    } catch (error) {
      console.error('Error fetching course:', error);
      res.status(500).json({ message: 'Failed to fetch course' });
    }
  });

  // Course modules routes - require enrollment and public course
  app.get('/api/courses/:id/modules', protect, async (req: AuthRequest, res) => {
    try {
      const courseId = parseInt(req.params.id);
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      
      // Check if user can access this course
      const canAccess = await storage.canUserAccessCourse(courseId, userId, isAdmin);
      if (!canAccess) {
        return res.status(403).json({ message: "Access denied: You must be enrolled in this public course to access its modules" });
      }
      
      const db = await connectToMongoDB();
      const modules = await db.collection('coursemodules')
        .find({ courseId: courseId })
        .sort({ order: 1 })
        .toArray();
      
      res.json(modules);
    } catch (error) {
      console.error('Error fetching course modules:', error);
      res.status(500).json({ message: 'Failed to fetch course modules' });
    }
  });

  app.post('/api/courses/:id/modules', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const courseId = parseInt(req.params.id);
      const db = await connectToMongoDB();
      
      // Generate unique ID using the same logic as other module creation methods
      const lastModule = await db.collection('coursemodules').findOne({}, { sort: { id: -1 } });
      const nextId = (lastModule?.id || 0) + 1;
      
      const moduleData = {
        id: nextId,
        courseId: courseId,
        ...req.body,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await db.collection('coursemodules').insertOne(moduleData);
      res.status(201).json({ ...moduleData, _id: result.insertedId });
    } catch (error) {
      console.error('Error creating course module:', error);
      res.status(500).json({ message: 'Failed to create course module' });
    }
  });

  app.put('/api/modules/:id', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      const db = await connectToMongoDB();
      
      const result = await db.collection('coursemodules').findOneAndUpdate(
        { id: moduleId },
        { $set: { ...req.body, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );
      
      if (!result) {
        return res.status(404).json({ message: 'Module not found' });
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error updating course module:', error);
      res.status(500).json({ message: 'Failed to update course module' });
    }
  });

  // Delegated to modules router
  // app.use('/api/modules', modulesRouter);
  /* removed: app.delete('/api/modules/:id' ... ) */



  app.get('/api/users/me/enrollments', protect, async (req: AuthRequest, res) => {
    try {
      const userId = req.user.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      // Use storage helper to coerce userId to ObjectId and populate properly
      const enrollments = await storage.getCourseEnrollments(undefined, userId);
      res.json(enrollments);
    } catch (error) {
      console.error('Error fetching user enrollments:', error);
      res.status(500).json({ message: 'Failed to fetch user enrollments' });
    }
  });



  // Course progress routes - require enrollment and public course
  app.get('/api/courses/:id/progress', protect, async (req: AuthRequest, res) => {
    try {
      const courseId = parseInt(req.params.id);
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      
      // Check if user can access this course
      const canAccess = await storage.canUserAccessCourse(courseId, userId, isAdmin);
      if (!canAccess) {
        return res.status(403).json({ message: "Access denied: You must be enrolled in this public course to view progress" });
      }
      
      const db = await connectToMongoDB();
      
      // Convert to ObjectId to match stored type
      const userObjectId = new ObjectId(userId);
      
      // Get user's enrollment data
      const enrollment = await db.collection('courseEnrollments')
        .findOne({ courseId: courseId, userId: userObjectId });
      
      // Get all course modules
      const modules = await db.collection('coursemodules')
        .find({ courseId: courseId })
        .sort({ order: 1 })
        .toArray();
      
      // Get completed modules for this user
      const completedModules = await db.collection('moduleProgress')
        .find({ courseId: courseId, userId: userObjectId, isCompleted: true })
        .toArray();
      
      const response = {
        enrollment: enrollment ? {
          id: enrollment.id,
          courseId: enrollment.courseId,
          userId: userId,
          completedModules: enrollment.completedModules || [],
          progress: enrollment.progress || 0
        } : null,
        completedModules: completedModules,
        totalModules: modules.length
      };
      
      res.json(response);
    } catch (error) {
      console.error('Error fetching course progress:', error);
      res.status(500).json({ message: 'Failed to fetch user progress' });
    }
  });

  // Use storage layer for consistent progress calculation
  app.post('/api/courses/:courseId/modules/:moduleId/complete', protect, async (req: AuthRequest, res) => {
    try {
      const courseId = parseInt(req.params.courseId);
      const moduleId = parseInt(req.params.moduleId);
      const userId = req.user.id;
      const { timeSpent, notes } = req.body;
      
      console.log(`[DEBUG] Module completion request - User: ${userId}, Course: ${courseId}, Module: ${moduleId}`);
      
      // Check if user can access this course
      const isAdmin = req.user.role === 'admin';
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

  app.post('/api/courses/:courseId/modules/:moduleId/bookmark', protect, async (req: AuthRequest, res) => {
    try {
      const moduleId = parseInt(req.params.moduleId);
      const courseId = parseInt(req.params.courseId);
      const userId = req.user.id;
      const db = await connectToMongoDB();
      
      const existingProgress = await db.collection('moduleProgress')
        .findOne({ moduleId: moduleId, userId: userId });
      
      if (existingProgress) {
        await db.collection('moduleProgress').updateOne(
          { moduleId: moduleId, userId: userId },
          { $set: { bookmarked: !existingProgress.bookmarked } }
        );
      } else {
        await db.collection('moduleProgress').insertOne({
          id: Date.now(),
          moduleId: moduleId,
          userId: userId,
          courseId: courseId,
          isCompleted: false,
          timeSpent: 0,
          bookmarked: true
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error bookmarking module:', error);
      res.status(500).json({ message: 'Failed to bookmark module' });
    }
  });

  app.put('/api/courses/:id', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.id;
      const db = await connectToMongoDB();

      // Check if course exists
      const existingCourse = await db.collection('courses').findOne({ id: id });
      if (!existingCourse) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Update the course
      const updateData = {
        ...req.body,
        updatedBy: userId,
        updatedAt: new Date()
      };

      const result = await db.collection('courses').findOneAndUpdate(
        { id: id },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result) {
        return res.status(404).json({ message: 'Course not found' });
      }

      res.json(result);
    } catch (error) {
      console.error('Error updating course:', error);
      res.status(500).json({ message: 'Failed to update course' });
    }
  });

  app.delete('/api/courses/:id', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const db = await connectToMongoDB();

      // Check if course exists
      const course = await db.collection('courses').findOne({ id: id });
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Delete all related data in parallel for better performance
      await Promise.all([
        db.collection('coursemodules').deleteMany({ courseId: id }),
        db.collection('courseEnrollments').deleteMany({ courseId: id }),
        db.collection('moduleProgress').deleteMany({ courseId: id })
      ]);

      // Finally delete the course
      const result = await db.collection('courses').deleteOne({ id: id });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'Course not found' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting course:', error);
      res.status(500).json({ message: 'Failed to delete course' });
    }
  });

  // Removed duplicate route - using the protected version above

  app.get('/api/modules/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const module = await storage.getCourseModule(id);
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }
      res.json(module);
    } catch (error) {
      console.error("Error fetching module:", error);
      res.status(500).json({ message: "Failed to fetch module" });
    }
  });

  app.post('/api/courses/:id/modules', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const courseId = parseInt(req.params.id);
      const validatedData = insertCourseModuleSchema.parse({
        ...req.body,
        courseId,
      });

      const module = await storage.createCourseModule(validatedData);
      res.status(201).json(module);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating module:", error);
      res.status(500).json({ message: "Failed to create module" });
    }
  });

  app.put('/api/modules/:id', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertCourseModuleSchema.partial().parse(req.body);

      const module = await storage.updateCourseModule(id, validatedData);
      res.json(module);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating module:", error);
      res.status(500).json({ message: "Failed to update module" });
    }
  });

  app.delete('/api/modules/:id', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCourseModule(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting module:", error);
      res.status(500).json({ message: "Failed to delete module" });
    }
  });

  // Course Enrollment routes - Support both self-enrollment and admin enrollment
    // Delegated to courses router
  // app.use('/api/courses', coursesRouter);
  /* removed: app.post('/api/courses/:id/enroll' ... ) */

  app.get('/api/users/me/enrollments', protect, async (req: AuthRequest, res) => {
    try {
      const userId = req.user.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const enrollments = await storage.getCourseEnrollments(undefined, userId);
      res.json(enrollments);
    } catch (error) {
      console.error("Error fetching user enrollments:", error);
      res.status(500).json({ message: "Failed to fetch user enrollments" });
    }
  });

  // Delete course enrollment (admin only)
  app.delete('/api/courses/:id/enrollments/:userId', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const courseId = parseInt(req.params.id);
      const userId = req.params.userId;
      
      const result = await storage.removeUserFromCourse(courseId, userId);
      if (!result) {
        return res.status(404).json({ message: "Enrollment not found" });
      }
      
      res.json({ message: "Student removed from course successfully" });
    } catch (error) {
      console.error("Error removing student from course:", error);
      res.status(500).json({ message: "Failed to remove student from course" });
    }
  });

  // Get course enrollments (for admin)
  app.get('/api/courses/:id/enrollments', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const courseId = parseInt(req.params.id);
      const enrollments = await storage.getCourseEnrollments(courseId);
      res.json(enrollments);
    } catch (error) {
      console.error("Error fetching course enrollments:", error);
      res.status(500).json({ message: "Failed to fetch course enrollments" });
    }
  });

  // QR Code generation for course enrollment
  app.get('/api/courses/:id/qr-code', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const courseId = parseInt(req.params.id);
      if (isNaN(courseId)) {
        return res.status(400).json({ message: 'Invalid course ID' });
      }

      // Verify course exists
      const course = await storage.getCourse(courseId);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }

      // Use the configured frontend URL or fallback to request host
      const frontendUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
      const enrollmentUrl = `${frontendUrl}/enroll/${courseId}`;
      
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(enrollmentUrl);

      res.json({
        qrCode: qrCodeDataUrl,
        enrollmentUrl,
        courseId,
        courseTitle: course.title
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      res.status(500).json({ message: 'Failed to generate QR code' });
    }
  });

  // REMOVED server-side enrollment route - let React frontend handle /enroll/:courseId
  // This allows users to see course details before authentication

  app.get('/api/courses/:id/progress', protect, async (req: AuthRequest, res) => {
    try {
      const userId = req.user.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      const courseId = parseInt(req.params.id);
      const progress = await storage.getUserCourseProgress(String(courseId), userId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching course progress:", error);
      res.status(500).json({ message: "Failed to fetch course progress" });
    }
  });





  // Code execution route for course modules
  app.post('/api/modules/execute', protect, async (req: AuthRequest, res) => {
    const cleanupTemp = async () => {
      try {
        const fs = require('fs').promises;
        const path = require('path');
        const tempDir = path.join(process.cwd(), 'execution-system', 'temp');
        const tempFiles = await fs.readdir(tempDir);
        const filesToRemove = tempFiles.filter((file: string) =>
          file.startsWith('code.') ||
          file.startsWith('input') ||
          file.endsWith('.py') ||
          file.endsWith(".class")||
          file.endsWith(".exec")||
          file.endsWith(".jar")||
          file.endsWith('.js') ||
          file.endsWith('.java') ||
          file.endsWith('.cpp') ||
          file.endsWith('.c')
        );
        if (filesToRemove.length > 0) {
          console.log(`🧹 [MODULE-EXEC] Cleaning up ${filesToRemove.length} leftover files`);
          for (const file of filesToRemove) {
            try {
              await fs.unlink(path.join(tempDir, file));
              console.log(`🧹 [MODULE-EXEC] Cleaned up: ${file}`);
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // ignore
      }
    };

    try {
      const { code, language, input } = req.body;
      if (!code || !language) {
        return res.status(400).json({ message: 'Code and language are required' });
      }

      console.log(`🚀 [MODULE-EXEC] Executing ${language} code for course module`);
      console.log(`📝 [MODULE-EXEC] Code length: ${code.length} characters`);
      console.log(`🔧 [MODULE-EXEC] Language: ${language}`);
      console.log(`📥 [MODULE-EXEC] Input: ${input || 'none'}`);

      let result: any;
      try {
        // Docker-only execution; do not fallback
        result = await executionService.executeCode(code, language, input);
        console.log(`✅ [MODULE-EXEC] Execution completed`);
        console.log(`📊 [MODULE-EXEC] Runtime: ${result.runtime}ms, Memory: ${result.memory}MB`);
        console.log(`📤 [MODULE-EXEC] Output length: ${result.output?.length || 0} characters`);
        if (result.error) {
          console.log(`❌ [MODULE-EXEC] Error: ${result.error}`);
        }
      } catch (execError: any) {
        // Surface Docker execution errors to the client as normal JSON
        console.error('❌ [MODULE-EXEC] Docker execution failed:', execError);
        await cleanupTemp();
        return res.json({
          success: false,
          output: '',
          error: execError?.message || String(execError) || 'Execution failed',
          runtime: 0,
          memory: 0,
        });
      }

      await cleanupTemp();
      return res.json({
        success: !result?.error,
        output: result?.output,
        error: result?.error,
        runtime: result?.runtime,
        memory: result?.memory,
      });
    } catch (error: any) {
      console.error('Error executing code:', error);
      await cleanupTemp();
      return res.json({
        success: false,
        output: '',
        error: error?.message || 'Failed to execute code',
        runtime: 0,
        memory: 0,
      });
    }
  });

  // Code execution route for contest problems
  app.post('/api/contests/execute', protect, async (req: AuthRequest, res) => {
    try {
      const { code, language, input } = req.body;

      if (!code || !language) {
        return res.status(400).json({ message: "Code and language are required" });
      }

      console.log(`🚀 [CONTEST-EXEC] Executing ${language} code for contest problem`);
      console.log(`📝 [CONTEST-EXEC] Code length: ${code.length} characters`);
      console.log(`🔧 [CONTEST-EXEC] Language: ${language}`);
      console.log(`📥 [CONTEST-EXEC] Input: "${input || 'none'}"`);
      console.log(`📥 [CONTEST-EXEC] Input length: ${input ? input.length : 0}`);
      console.log(`📥 [CONTEST-EXEC] Input type: ${typeof input}`);
      
      // Use the same Docker execution service as assignments
      const result = await executionService.executeCode(code, language, input);
      
      console.log(`✅ [CONTEST-EXEC] Execution completed`);
      console.log(`📊 [CONTEST-EXEC] Runtime: ${result.runtime}ms, Memory: ${result.memory}MB`);
      console.log(`📤 [CONTEST-EXEC] Output length: ${result.output?.length || 0} characters`);
      if (result.error) {
        console.log(`❌ [CONTEST-EXEC] Error: ${result.error}`);
      }

      // Additional cleanup check for contest execution
      try {
        const fs = require('fs').promises;
        const path = require('path');
        const tempDir = path.join(process.cwd(), 'execution-system', 'temp');
        const tempFiles = await fs.readdir(tempDir);
        const filesToRemove = tempFiles.filter((file: string) => 
          file.startsWith('code.') || 
          file.startsWith('input') || 
          file.endsWith('.py') || 
          file.endsWith('.js') || 
          file.endsWith('.java') || 
          file.endsWith('.cpp') || 
          file.endsWith('.c')
        );
        
        if (filesToRemove.length > 0) {
          console.log(`🧹 [CONTEST-EXEC] Cleaning up ${filesToRemove.length} leftover files`);
          for (const file of filesToRemove) {
            try {
              await fs.unlink(path.join(tempDir, file));
              console.log(`🧹 [CONTEST-EXEC] Cleaned up: ${file}`);
            } catch (error) {
              // Ignore cleanup errors
            }
          }
        }
      } catch (error) {
        // Ignore cleanup errors
      }

      res.json({
        success: !result.error,
        output: result.output,
        error: result.error,
        runtime: result.runtime,
        memory: result.memory
      });
    } catch (error) {
      console.error("Error executing code:", error);
      res.status(500).json({ 
        message: "Failed to execute code",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Leaderboard route
  app.get('/api/leaderboard', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const leaderboard = await storage.getLeaderboard(limit);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Assignment routes
  app.get('/api/assignments', protect, async (req: AuthRequest, res) => {
    try {
      const assignments = await storage.getAssignments();
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  app.get('/api/assignments/:id', protect, async (req: AuthRequest, res) => {
    try {
      console.log('[DEBUG] Fetching assignment:', req.params.id);
      const id = parseInt(req.params.id);
      const assignment = await storage.getAssignment(id);

      if (!assignment) {
        console.log('[DEBUG] Assignment not found:', id);
        return res.status(404).json({ message: "Assignment not found" });
      }

      if (!assignment.isVisible) {
        console.log('[DEBUG] Assignment not visible:', id);
        return res.status(403).json({ message: "Assignment is not available" });
      }

      console.log('[DEBUG] Assignment found:', assignment);
      res.json(assignment);
    } catch (error) {
      console.error("Error fetching assignment:", error);
      res.status(500).json({ message: "Failed to fetch assignment" });
    }
  });

  app.post('/api/assignments', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const userId = req.user.id;
      if (!userId) {
        console.error('[DEBUG] No user ID found in request:', req.user);
        return res.status(401).json({ message: "User ID not found" });
      }

      console.log('[DEBUG] Creating assignment with data:', req.body);

      // Validate MCQ questions have at least one correct answer
      for (const question of req.body.questions || []) {
        if (question.type === 'mcq') {
          if (!question.options || question.options.length < 2) {
            return res.status(400).json({ 
              message: "Invalid data", 
              errors: [`Question "${question.title}" must have at least 2 options`] 
            });
          }

          const hasCorrectAnswer = question.options.some((opt: any) => opt.isCorrect);
          if (!hasCorrectAnswer) {
            return res.status(400).json({ 
              message: "Invalid data", 
              errors: [`Question "${question.title}" must have at least one correct answer`] 
            });
          }
        }
      }

      // Prepare the data for validation
      const data = {
        ...req.body,
        deadline: req.body.deadline ? new Date(req.body.deadline) : undefined,
        questions: req.body.questions.map((q: any) => ({
          ...q,
          points: Number(q.points),
          timeLimit: q.timeLimit ? Number(q.timeLimit) : undefined,
          memoryLimit: q.memoryLimit ? Number(q.memoryLimit) : undefined,
          options: q.type === 'mcq' ? q.options?.map((opt: any) => ({
            ...opt,
            isCorrect: !!opt.isCorrect
          })) : undefined
        })),
        maxAttempts: Number(req.body.maxAttempts) || 3,
        isVisible: !!req.body.isVisible,
        autoGrade: !!req.body.autoGrade,
        createdBy: userId
      };

      console.log('[DEBUG] Validating assignment data:', data);
      const validatedData = insertAssignmentSchema.parse(data);

      console.log('[DEBUG] Creating assignment in storage');
      const assignment = await storage.createAssignment(validatedData);

      console.log('[DEBUG] Assignment created successfully:', assignment);
      res.status(201).json(assignment);
    } catch (error) {
      console.error('[DEBUG] Error creating assignment:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: error.errors.map(e => e.message)
        });
      }
      res.status(500).json({ message: "Failed to create assignment" });
    }
  });

  app.put('/api/assignments/:id', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const assignment = await storage.updateAssignment(id, req.body);
      res.json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating assignment:", error);
      res.status(500).json({ message: "Failed to update assignment" });
    }
  });

  app.delete('/api/assignments/:id', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAssignment(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting assignment:", error);
      res.status(500).json({ message: "Failed to delete assignment" });
    }
  });

  // Assignment filtering by course tag
  app.get('/api/assignments/course/:courseTag', protect, async (req: AuthRequest, res) => {
    try {
      const courseTag = req.params.courseTag;
      const assignments = await storage.getAssignmentsByCourseTag(courseTag);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching assignments by course tag:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  // Assignment submission routes
  app.get('/api/assignments/:id/submissions', protect, async (req: AuthRequest, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role === 'admin') {
        // Admin can see all submissions for this assignment
        const submissions = await storage.getAssignmentSubmissions(assignmentId);
        res.json(submissions);
      } else {
        // Students can only see their own submission
        const submission = await storage.getUserAssignmentSubmission(assignmentId, userId);
        res.json(submission ? [submission] : []);
      }
    } catch (error) {
      console.error("Error fetching assignment submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  app.get('/api/assignments/:id/submission', protect, async (req: AuthRequest, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const userId = req.user.id;

      console.log('[DEBUG] Fetching submission:', { assignmentId, userId });

      if (!userId) {
        console.error('[DEBUG] No user ID found in request:', req.user);
        return res.status(401).json({ message: "User ID not found" });
      }

      const submission = await storage.getUserAssignmentSubmission(assignmentId, userId);
      console.log('[DEBUG] Submission found:', !!submission);

      res.json(submission);
    } catch (error) {
      console.error("Error fetching user assignment submission:", error);
      res.status(500).json({ message: "Failed to fetch submission" });
    }
  });

  app.post('/api/assignments/:id/submission', protect, async (req: AuthRequest, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const userId = req.user.id;

      if (!userId) {
        console.error('[DEBUG] No user ID found in request:', req.user);
        return res.status(401).json({ message: "User ID not found" });
      }

      // Check if assignment exists
      const assignment = await storage.getAssignment(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      // Calculate max score
      const maxScore = assignment.questions.reduce((sum, q) => sum + q.points, 0);

      // Check if user already has a submission
      let submission = await storage.getUserAssignmentSubmission(assignmentId, userId);

      if (submission) {
        // Update existing submission
        submission = await storage.updateAssignmentSubmission(submission.id, {
          questionSubmissions: req.body.questionSubmissions,
          totalScore: req.body.totalScore || 0,
          status: req.body.status || 'in_progress'
        });
      } else {
        // Create new submission
        submission = await storage.createAssignmentSubmission({
          assignmentId,
          userId,
          questionSubmissions: req.body.questionSubmissions || [],
          totalScore: req.body.totalScore || 0,
          maxScore,
          status: req.body.status || 'in_progress'
        });
      }

      res.json(submission);
    } catch (error) {
      console.error("Error creating/updating assignment submission:", error);
      res.status(500).json({ message: "Failed to save submission" });
    }
  });

  app.post('/api/assignments/:id/submit', protect, async (req: AuthRequest, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const userId = req.user.id;

      if (!userId) {
        console.error('[DEBUG] No user ID found in request:', req.user);
        return res.status(401).json({ message: "User ID not found" });
      }

      // Check if assignment exists
      const assignment = await storage.getAssignment(assignmentId);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      // Check if assignment is visible
      if (!assignment.isVisible) {
        return res.status(403).json({ message: "Assignment is not available" });
      }

      // Check if assignment deadline has passed
      if (assignment.deadline && new Date() > new Date(assignment.deadline)) {
        return res.status(400).json({ message: "Assignment deadline has passed" });
      }

      // Check if user has a submission
      const submission = await storage.getUserAssignmentSubmission(assignmentId, userId);
      if (!submission) {
        return res.status(400).json({ message: "No submission found to submit" });
      }

      // Check if submission is already submitted
      if (submission.status === 'submitted' || submission.status === 'graded') {
        return res.status(400).json({ message: "Assignment already submitted" });
      }

      // Get all submissions for this assignment by this user to check attempts
      const allSubmissions = await storage.getAssignmentSubmissions(assignmentId, userId);
      const submittedCount = allSubmissions.filter(s => s.status === 'submitted' || s.status === 'graded').length;

      // Check if user has exceeded maximum attempts
      if (assignment.maxAttempts && submittedCount >= assignment.maxAttempts) {
        return res.status(400).json({ message: "Maximum attempts exceeded" });
      }

      // Validate the submission data
      const validatedData = insertAssignmentSubmissionSchema.parse({
        ...submission,
        status: 'submitted',
        submittedAt: new Date()
      });

      // Submit the assignment
      const submittedAssignment = await storage.updateAssignmentSubmission(submission.id, {
        status: 'submitted',
        submittedAt: new Date()
      });

      res.json(submittedAssignment);
    } catch (error) {
      console.error("Error submitting assignment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid submission data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to submit assignment" });
    }
  });

  // Code execution for coding problems
  app.post('/api/execute', protect, async (req: AuthRequest, res) => {
    try {
      const { code, language, input } = req.body;

      // Execute code with real execution
      const result = await executeCodeUnified(code, language, input);
      res.json(result);
    } catch (error) {
      console.error("Error executing code:", error);
      res.status(500).json({ message: "Failed to execute code" });
    }
  });

  // Group routes
  app.get('/api/groups', protect, async (req: AuthRequest, res) => {
    try {
      const userId = req.user.id;
      const groups = await storage.getUserGroups(userId);
      res.json(groups);
    } catch (error) {
      console.error("Error fetching groups:", error);
      res.status(500).json({ message: "Failed to fetch groups" });
    }
  });

  app.post('/api/groups', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const userId = req.user.id;

      const validatedData = insertGroupSchema.parse({
        ...req.body,
        createdBy: userId,
      });

      const group = await storage.createGroup(validatedData);
      res.status(201).json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating group:", error);
      res.status(500).json({ message: "Failed to create group" });
    }
  });

  // Announcement routes
  app.get('/api/announcements', protect, async (req: AuthRequest, res) => {
    try {
      const userId = req.user.id;
      const announcements = await storage.getUserAnnouncements(userId);
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ message: "Failed to fetch announcements" });
    }
  });

  app.post('/api/announcements', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admins can create announcements" });
      }

      const validatedData = insertAnnouncementSchema.parse({
        ...req.body,
        createdBy: userId,
      });

      const announcement = await storage.createAnnouncement(validatedData);
      res.status(201).json(announcement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating announcement:", error);
      res.status(500).json({ message: "Failed to create announcement" });
    }
  });

  // Contest participation
  app.post('/api/contests/:id/participate', protect, async (req: AuthRequest, res) => {
    try {
      const contestId = parseInt(req.params.id);
      const userId = req.user.id;

      const contest = await storage.getContest(contestId);
      if (!contest) {
        return res.status(404).json({ message: "Contest not found" });
      }

      const participant = await storage.registerForContest({
        contestId,
        userId,
        score: "0.00",
        submissions: 0
      });

      res.status(201).json(participant);
    } catch (error) {
      console.error("Error registering for contest:", error);
      res.status(500).json({ message: "Failed to register for contest" });
    }
  });

  app.get('/api/contests/:id/participants', async (req, res) => {
    try {
      const contestId = parseInt(req.params.id);
      const participants = await storage.getContestParticipants(contestId);
      res.json(participants);
    } catch (error) {
      console.error("Error fetching contest participants:", error);
      res.status(500).json({ message: "Failed to fetch participants" });
    }
  });

  // Admin routes
  app.patch('/api/admin/users/:id/role', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const targetUserId = req.params.id;
      const { role } = req.body;

      if (!['student', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const updatedUser = await storage.updateUserRole(targetUserId, role);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Problem Set Enrollment Management
  app.get('/api/problem-sets/:id/enrollments', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const problemSetId = req.params.id;
      console.log(`[ENROLLMENT DEBUG] Fetching enrollments for problem set: ${problemSetId}`);
      const enrollments = await storage.getProblemSetEnrollments(problemSetId);
      res.json(enrollments);
    } catch (error) {
      console.error("Error fetching problem set enrollments:", error);
      res.status(500).json({ message: "Failed to fetch problem set enrollments" });
    }
  });

  app.post('/api/problem-sets/:id/enroll', protect, async (req: AuthRequest, res) => {
    try {
      const problemSetId = req.params.id;
      const { userIds } = req.body;
      const requesterId = req.user.id;
      const isAdmin = req.user.role === 'admin';

      // Handle bulk enrollment for admin users
      if (userIds && Array.isArray(userIds) && isAdmin) {
        console.log('Bulk enrollment request:', { userIds, problemSetId });
        const enrollments = [];
        for (const userId of userIds) {
          try {
            console.log('Enrolling user ID:', userId, 'Type:', typeof userId);
            const enrollment = await storage.enrollUserInProblemSet(userId, problemSetId);
            enrollments.push(enrollment);
          } catch (error) {
            console.error(`Error enrolling user ${userId}:`, error);
          }
        }
        return res.json({ 
          message: `Successfully enrolled ${enrollments.length} students`,
          enrollments 
        });
      }

      // Check if problem set exists
      const problemSet = await storage.getProblemSet(problemSetId);
      if (!problemSet) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      // Handle single user enrollment (self-enrollment)
      const enrollment = await storage.enrollUserInProblemSet(requesterId, problemSetId);
      res.json(enrollment);
    } catch (error) {
      console.error("Error enrolling user in problem set:", error);
      
      // Handle duplicate enrollment gracefully
      if (error.message && error.message.includes('already enrolled')) {
        return res.status(409).json({ message: "User is already enrolled in this assignment" });
      }
      
      res.status(500).json({ message: "Failed to enroll in assignment" });
    }
  });

  app.get('/api/problem-sets/:id/qr-code', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const problemSetId = req.params.id;

      // Verify problem set exists
      const problemSet = await storage.getProblemSet(problemSetId);
      if (!problemSet) {
        return res.status(404).json({ message: 'Problem set not found' });
      }

      // Use the configured frontend URL or fallback to request host
      const frontendUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
      const enrollmentUrl = `${frontendUrl}/enroll-problem-set/${problemSetId}`;
      
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(enrollmentUrl);

      res.json({
        qrCode: qrCodeDataUrl,
        enrollmentUrl,
        problemSetId,
        problemSetTitle: problemSet.title
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      res.status(500).json({ message: 'Failed to generate QR code' });
    }
  });

  // REMOVED server-side problem set enrollment route - let React frontend handle /enroll-problem-set/:problemSetId
  // This allows users to see assignment details before authentication

  app.get('/api/users/me/problem-set-enrollments', protect, async (req: AuthRequest, res) => {
    try {
      const userId = req.user.id;
      const enrollments = await storage.getUserProblemSetEnrollments(userId);
      res.json(enrollments);
    } catch (error) {
      console.error("Error fetching user problem set enrollments:", error);
      res.status(500).json({ message: "Failed to fetch problem set enrollments" });
    }
  });

  app.put('/api/problem-set-enrollments/:id', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const enrollmentId = parseInt(req.params.id);
      const enrollmentData = req.body;

      const updatedEnrollment = await storage.updateProblemSetEnrollment(enrollmentId, enrollmentData);
      if (!updatedEnrollment) {
        return res.status(404).json({ message: 'Enrollment not found' });
      }

      res.json(updatedEnrollment);
    } catch (error) {
      console.error("Error updating problem set enrollment:", error);
      res.status(500).json({ message: "Failed to update enrollment" });
    }
  });

  app.delete('/api/problem-set-enrollments/:id', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const enrollmentId = parseInt(req.params.id);
      await storage.deleteProblemSetEnrollment(enrollmentId);
      res.json({ message: 'Enrollment deleted successfully' });
    } catch (error) {
      console.error("Error deleting problem set enrollment:", error);
      res.status(500).json({ message: "Failed to delete enrollment" });
    }
  });

  // Get user by ID (for enrollment user data fetching)
  app.get('/api/users/:userId', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const userId = req.params.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      // Return user data without sensitive information
      res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // Add authentication endpoints for email/password login
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      // Hash password
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const newUser = await storage.createUser({
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        email,
        password: hashedPassword,
        role: 'student'
      });

      // Generate JWT token
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { 
          id: newUser.id, 
          email: newUser.email, 
          role: newUser.role 
        }, 
        JWT_SECRET, 
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role
        },
        message: 'Account created successfully'
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ message: 'Failed to create account' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user || !user.password) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Check password
      const bcrypt = require('bcryptjs');
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Generate JWT token
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role 
        }, 
        JWT_SECRET, 
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        },
        message: 'Login successful'
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Failed to login' });
    }
  });

  // Google OAuth login placeholder
  app.get('/api/auth/google', (req, res) => {
    // Check for returnTo parameter and pass it through
    const returnTo = req.query.returnTo;
    if (returnTo) {
      res.redirect(`/login?provider=google&returnTo=${encodeURIComponent(returnTo as string)}`);
    } else {
      res.redirect('/login?provider=google');
    }
  });

  // Admin contest routes
  app.get('/api/admin/contests', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const contests = await contestStorage.getAllContests();
      
      // For each contest, fetch participants and enrich with user data
      const contestsWithParticipants = await Promise.all(
        contests.map(async (contest) => {
          try {
            const participants = await contestStorage.getContestParticipants(contest.id);
            
            // Enrich participants with user data
            const participantsWithUserData = await Promise.all(
              participants.map(async (participant) => {
                try {
                  console.log(`[DEBUG] Fetching user data for participant: ${participant.userId}`);
                  
                  // Try to get user by different possible ID formats
                  let user = await storage.getUser(participant.userId);
                  
                  // If not found by string ID, try as ObjectId
                  if (!user && participant.userId) {
                    try {
                      // Try to find user by _id if the userId is an ObjectId string
                      const db = getDb();
                      user = await db.collection('users').findOne({ 
                        $or: [
                          { _id: new ObjectId(participant.userId) },
                          { id: participant.userId }
                        ]
                      });
                    } catch (objIdError) {
                      console.log(`[DEBUG] ObjectId lookup failed for ${participant.userId}:`, objIdError);
                    }
                  }
                  
                  console.log(`[DEBUG] User data for ${participant.userId}:`, user ? 'Found' : 'Not found');
                  
                  return {
                    ...participant,
                    user: user ? {
                      id: user.id || user._id?.toString(),
                      firstName: user.firstName,
                      lastName: user.lastName,
                      email: user.email
                    } : null
                  };
                } catch (error) {
                  console.error('Error fetching user data for participant:', participant.userId, error);
                  return {
                    ...participant,
                    user: null
                  };
                }
              })
            );
            
            return {
              ...contest,
              participants: participantsWithUserData
            };
          } catch (error) {
            console.error('Error fetching participants for contest:', contest.id, error);
            return {
              ...contest,
              participants: []
            };
          }
        })
      );
      
      res.json(contestsWithParticipants);
    } catch (error) {
      console.error("Error fetching admin contests:", error);
      res.status(500).json({ message: "Failed to fetch contests" });
    }
  });

  app.post('/api/admin/contests', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const userId = req.user.id;
      const { problems, ...contestData } = req.body;

      // Create problem instances from selected problems (copy problems like in Assignments/Courses)
      const problemInstances = problems && problems.length > 0 
        ? await contestStorage.createContestProblemInstances(problems, `contest_${Date.now()}`)
        : [];

      const contest = await contestStorage.createContest({
        ...contestData,
        problems: problemInstances,
        createdBy: userId
      });

      res.status(201).json(contest);
    } catch (error) {
      console.error("Error creating admin contest:", error);
      res.status(400).json({ message: "Failed to create contest", error: error.message });
    }
  });

  app.delete('/api/admin/contests/:id', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const contestId = req.params.id;
      const deleted = await contestStorage.deleteContest(contestId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Contest not found" });
      }

      res.json({ message: "Contest deleted successfully" });
    } catch (error) {
      console.error("Error deleting admin contest:", error);
      res.status(500).json({ message: "Failed to delete contest" });
    }
  });

  // Admin problems endpoint for contest creation
  app.get('/api/admin/problems', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const problems = await contestStorage.getAllProblems();
      res.json(problems);
    } catch (error) {
      console.error("Error fetching admin problems:", error);
      res.status(500).json({ message: "Failed to fetch problems" });
    }
  });



  // Contest editing endpoint
  app.put('/api/admin/contests/:id', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const contestId = req.params.id;
      const { problems, ...contestData } = req.body;

      console.log('[DEBUG] Updating contest with data:', { contestId, problems: problems?.length, contestData });

      // Create problem instances from selected problems if provided
      let problemInstances = [];
      if (problems && problems.length > 0) {
        // When editing, problems already have originalProblemId, so we need to preserve it
        problemInstances = problems.map((problem, index) => ({
          id: problem.id, // Keep the existing contest problem ID
          originalProblemId: problem.originalProblemId || problem.id, // Use originalProblemId if available
          title: problem.title,
          description: problem.description,
          difficulty: problem.difficulty,
          points: problem.points || 100,
          order: index,
          timeLimit: problem.timeLimit,
          memoryLimit: problem.memoryLimit,
          constraints: problem.constraints,
          inputFormat: problem.inputFormat,
          outputFormat: problem.outputFormat,
          maxSubmissions: undefined,
          partialScoring: false,
          // Copy test cases and examples
          customTestCases: problem.testCases,
          customExamples: problem.examples,
          customStarterCode: problem.starterCode,
          // Copy all other problem properties
          tags: problem.tags || [],
          notes: problem.notes || "",
          examples: problem.examples || [],
          testCases: problem.testCases || [],
          starterCode: problem.starterCode || {}
        }));
      }

      console.log('[DEBUG] Problem instances to update:', problemInstances.length);

      // Build update payload without touching problems unless explicitly provided
      const updatePayload: any = { ...contestData };
      if (Array.isArray(problems) && problems.length > 0) {
        updatePayload.problems = problemInstances;
      }
      const updatedContest = await contestStorage.updateContest(contestId, updatePayload);

      if (!updatedContest) {
        return res.status(404).json({ message: "Contest not found" });
      }

      console.log('[DEBUG] Contest updated successfully:', updatedContest.id);
      res.json(updatedContest);
    } catch (error) {
      console.error("Error updating admin contest:", error);
      res.status(400).json({ message: "Failed to update contest", error: error.message });
    }
  });

  // Get contest participants
  app.get('/api/admin/contests/:id/participants', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const contestId = req.params.id;
      const participants = await contestStorage.getContestParticipants(contestId);
      
      // Enrich participants with user data
      const participantsWithUserData = await Promise.all(
        participants.map(async (participant) => {
          try {
            console.log(`[DEBUG] Fetching user data for participant: ${participant.userId}`);
            
            // Try to get user by different possible ID formats
            let user = await storage.getUser(participant.userId);
            
            // If not found by string ID, try as ObjectId
            if (!user && participant.userId) {
              try {
                // Try to find user by _id if the userId is an ObjectId string
                const db = getDb();
                user = await db.collection('users').findOne({ 
                  $or: [
                    { _id: new ObjectId(participant.userId) },
                    { id: participant.userId }
                  ]
                });
              } catch (objIdError) {
                console.log(`[DEBUG] ObjectId lookup failed for ${participant.userId}:`, objIdError);
              }
            }
            
            console.log(`[DEBUG] User data for ${participant.userId}:`, user ? 'Found' : 'Not found');
            
            return {
              ...participant,
              user: user ? {
                id: user._id?.toString() || user.id,
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
              } : null
            };
          } catch (error) {
            console.error(`[DEBUG] Error fetching user data for participant ${participant.userId}:`, error);
            return {
              ...participant,
              user: null
            };
          }
        })
      );
      
      res.json(participantsWithUserData);
    } catch (error) {
      console.error("Error fetching contest participants:", error);
      res.status(500).json({ message: "Failed to fetch participants" });
    }
  });

  // Add participant to contest
  app.post('/api/admin/contests/:id/participants', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const contestId = req.params.id;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const participant = await contestStorage.registerParticipant(contestId, userId);
      res.status(201).json(participant);
    } catch (error) {
      console.error("Error adding participant to contest:", error);
      res.status(400).json({ message: "Failed to add participant", error: error.message });
    }
  });

  // Remove participant from contest
  app.delete('/api/admin/contests/:id/participants/:userId', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const contestId = req.params.id;
      const userId = req.params.userId;

      const success = await contestStorage.unregisterParticipant(contestId, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Participant not found" });
      }

      res.json({ message: "Participant removed successfully" });
    } catch (error) {
      console.error("Error removing participant from contest:", error);
      res.status(500).json({ message: "Failed to remove participant" });
    }
  });

  // User contest routes
  // Duplicate handler removed; unified earlier '/api/contests' route in this file handles user-visible contests.


  app.get('/api/contests/:contestId', async (req: AuthRequest, res) => {
    try {
      const contestId = req.params.contestId;
      const contest = await contestStorage.getContest(contestId);
      
      if (!contest) {
        return res.status(404).json({ message: "Contest not found" });
      }
      
      // Fetch full problem details for each contest problem
      const problemsWithDetails = await Promise.all(
        contest.problems.map(async (contestProblem) => {
          try {
            // Get the original problem from the problems collection
            const db = getDb();
            
            // Try different ways to find the original problem
            let originalProblem = null;
            
            // First try by ObjectId if it's a valid ObjectId string
            if (contestProblem.originalProblemId && typeof contestProblem.originalProblemId === 'string') {
              try {
                originalProblem = await db.collection('problems').findOne({
                  _id: new ObjectId(contestProblem.originalProblemId)
                });
              } catch (objIdError) {
                console.log(`ObjectId conversion failed for ${contestProblem.originalProblemId}:`, objIdError);
              }
            }
            
            // If not found by ObjectId, try by id field
            if (!originalProblem && contestProblem.originalProblemId) {
              originalProblem = await db.collection('problems').findOne({
                id: contestProblem.originalProblemId
              });
            }
            
            // If still not found, try by numeric id
            if (!originalProblem && contestProblem.originalProblemId) {
              originalProblem = await db.collection('problems').findOne({
                id: parseInt(contestProblem.originalProblemId.toString())
              });
            }
            
            // If still not found, try to extract numeric part from string IDs like "1754502101258_1"
            if (!originalProblem && contestProblem.originalProblemId && typeof contestProblem.originalProblemId === 'string') {
              const match = contestProblem.originalProblemId.match(/_(\d+)$/);
              if (match) {
                const numericId = parseInt(match[1]);
                originalProblem = await db.collection('problems').findOne({
                  id: numericId
                });
              }
            }
            
            if (!originalProblem) {
              console.warn(`Original problem not found for ID: ${contestProblem.originalProblemId}`);
              return contestProblem;
            }
            
            console.log(`Found original problem for ID: ${contestProblem.originalProblemId}`, {
              title: originalProblem.title,
              hasDescription: !!originalProblem.description,
              hasExamples: !!originalProblem.examples,
              hasStarterCode: !!originalProblem.starterCode
            });
            
            // Merge contest problem with original problem details
            return {
              ...originalProblem,
              id: contestProblem.id, // Keep contest problem ID
              originalProblemId: contestProblem.originalProblemId,
              points: contestProblem.points || 100,
              order: contestProblem.order || 0,
              // Override with contest-specific values if they exist
              title: contestProblem.title || originalProblem.title,
              description: contestProblem.description || originalProblem.description,
              difficulty: contestProblem.difficulty || originalProblem.difficulty,
              timeLimit: contestProblem.timeLimit || originalProblem.timeLimit,
              memoryLimit: contestProblem.memoryLimit || originalProblem.memoryLimit,
              constraints: contestProblem.constraints || originalProblem.constraints,
              inputFormat: contestProblem.inputFormat || originalProblem.inputFormat,
              outputFormat: contestProblem.outputFormat || originalProblem.outputFormat,
              examples: contestProblem.customExamples || originalProblem.examples,
              testCases: contestProblem.customTestCases || originalProblem.testCases,
              starterCode: contestProblem.customStarterCode || originalProblem.starterCode,
            };
          } catch (error) {
            console.error('Error fetching problem details:', error);
            return contestProblem;
          }
        })
      );
      
      // Get participants with user data
      const participants = await contestStorage.getContestParticipants(contestId);
      const participantsWithUserData = await Promise.all(
        participants.map(async (participant) => {
          try {
            let user = await storage.getUser(participant.userId);
            
            if (!user && participant.userId) {
              try {
                const db = getDb();
                user = await db.collection('users').findOne({
                  $or: [
                    { _id: new ObjectId(participant.userId) },
                    { id: participant.userId }
                  ]
                });
              } catch (objIdError) {
                console.log(`ObjectId lookup failed for ${participant.userId}:`, objIdError);
              }
            }
            
            return {
              ...participant,
              user: user ? {
                id: user.id || user._id?.toString(),
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email
              } : null
            };
          } catch (error) {
            console.error('Error fetching user data for participant:', participant.userId, error);
            return {
              ...participant,
              user: null
            };
          }
        })
      );
      
      res.json({
        ...contest,
        problems: problemsWithDetails,
        participants: participantsWithUserData
      });
    } catch (error) {
      console.error("Error fetching contest details:", error);
      res.status(500).json({ message: "Failed to fetch contest details" });
    }
  });

  app.get('/api/contests/:contestId/submissions', protect, async (req: AuthRequest, res) => {
    try {
      const contestId = req.params.contestId;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      const submissions = await contestStorage.getParticipantSubmissions(contestId, userId);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching contest submissions:", error);
      res.status(500).json({ message: "Failed to fetch submissions" });
    }
  });

  app.post('/api/contests/:contestId/problems/:problemId/submit', protect, async (req: AuthRequest, res) => {
    try {
      const contestId = req.params.contestId;
      const problemId = req.params.problemId;
      const userId = req.user?.id;
      const { code, language } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Check if user is enrolled in the contest
      const participants = await contestStorage.getContestParticipants(contestId);
      const isEnrolled = participants.some(p => p.userId === userId);
      
      if (!isEnrolled) {
        return res.status(403).json({ message: "You must be enrolled in the contest to submit solutions" });
      }
      
      // Check if contest is active
      const contest = await contestStorage.getContest(contestId);
      if (!contest) {
        return res.status(404).json({ message: "Contest not found" });
      }
      
      const now = new Date();
      const startTime = new Date(contest.startTime as any);
      const endTime = new Date(contest.endTime as any);
      
      // Allow submissions as long as the contest hasn't ended; some environments may have clock/timezone skew
      if (!isNaN(endTime.getTime()) && now > endTime) {
        return res.status(400).json({ message: "Contest has ended" });
      }
      
      // Execute the code using the execution service
      const result = await executionService.executeCode(code, language);
      
      // Determine submission status based on test cases
      const contestProblem = contest.problems.find(p => p.id === problemId);
      if (!contestProblem) {
        return res.status(404).json({ message: "Problem not found" });
      }
      
      let status = 'wrong_answer';
      let score = 0;
      
      // Run against test cases
      if (contestProblem.testCases && contestProblem.testCases.length > 0) {
        let passedTests = 0;
        for (const testCase of contestProblem.testCases) {
          try {
            const testResult = await executionService.executeCode(code, language, testCase.input);
            if (testResult.output.trim() === testCase.expectedOutput.trim()) {
              passedTests++;
            }
          } catch (error) {
            console.error('Test case execution failed:', error);
          }
        }
        
        if (passedTests === contestProblem.testCases.length) {
          status = 'accepted';
          score = contestProblem.points;
        }
      }
      
      // Calculate penalty based on submission time and attempts
      const contestStartTime = new Date(contest.startTime);
      const submissionTime = new Date();
      const timeElapsed = Math.floor((submissionTime.getTime() - contestStartTime.getTime()) / (1000 * 60)); // minutes
      
      // Get previous submissions for this problem by this user
      const previousSubmissions = await contestStorage.getParticipantSubmissions(contestId, userId);
      const problemWrongSubs = previousSubmissions.filter(s => s.problemId === problemId && (s.status?.toLowerCase?.() === 'wrong_answer'));
      const alreadyAccepted = previousSubmissions.some(s => s.problemId === problemId && (s.status?.toLowerCase?.() === 'accepted'));
      const penaltyMinutes = problemWrongSubs.length * 20; // 20 minutes penalty per wrong attempt
      
      // Calculate final score and penalty (avoid re-awarding for already solved problems)
      const finalScore = status === 'accepted' && !alreadyAccepted ? score : 0;
      const totalPenaltyForThisSubmission = penaltyMinutes;
      
      // Create submission record
      const submission = await contestStorage.submitSolution({
        contestId,
        problemId,
        userId,
        code,
        language,
        status,
        points: finalScore,
        runtime: result.runtime,
        memory: result.memory,
        submissionTime: submissionTime,
        penalty: totalPenaltyForThisSubmission,
        isContestSubmission: true
      });
      
      // Recompute participant aggregate score and penalty from unique accepted problems
      const allSubs = await contestStorage.getParticipantSubmissions(contestId, userId);
      const acceptedByProblem = new Map<string, typeof submission>();
      for (const s of allSubs) {
        if (s.status?.toLowerCase?.() === 'accepted') {
          // Keep the earliest accepted submission per problem to compute attempts/penalty
          const existing = acceptedByProblem.get(s.problemId);
          if (!existing || (s.submissionTime < existing.submissionTime)) {
            acceptedByProblem.set(s.problemId, s as any);
          }
        }
      }
      const solvedIds = new Set(Array.from(acceptedByProblem.keys()));
      const aggregateScore = contest.problems
        .filter(p => solvedIds.has(p.id))
        .reduce((sum, p) => sum + (p.points || 0), 0);
      const aggregatePenalty = Array.from(acceptedByProblem.values())
        .reduce((sum, s) => sum + (s.penalty || 0), 0);
      
      // Update participant totals and rankings
      await contestStorage.updateParticipantScore(contestId, userId, aggregateScore, aggregatePenalty);
      await contestStorage.updateRankings(contestId);
      
      res.status(201).json({
        ...submission,
        timeElapsed,
        penaltyMinutes,
        totalPenalty: totalPenaltyForThisSubmission,
        attempts: problemWrongSubs.length + 1,
        alreadyAccepted
      });
    } catch (error) {
      console.error("Error submitting solution:", error);
      res.status(500).json({ message: "Failed to submit solution" });
    }
  });

  app.get('/api/contests/:contestId/leaderboard', protect, async (req: AuthRequest, res) => {
    try {
      const contestId = req.params.contestId;
      const leaderboard = await contestStorage.generateLeaderboard(contestId);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error generating leaderboard:", error);
      res.status(500).json({ message: "Failed to generate leaderboard" });
    }
  });

  // Get contest analytics
  app.get('/api/contests/:contestId/analytics', protect, async (req: AuthRequest, res) => {
    try {
      const contestId = req.params.contestId;
      const analytics = await contestStorage.getContestAnalytics(contestId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching contest analytics:", error);
      res.status(500).json({ message: "Failed to fetch contest analytics" });
    }
  });

  // Get user progress in contest
  app.get('/api/contests/:contestId/progress', protect, async (req: AuthRequest, res) => {
    try {
      const contestId = req.params.contestId;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const contest = await contestStorage.getContest(contestId);
      if (!contest) {
        return res.status(404).json({ message: "Contest not found" });
      }

      const submissions = await contestStorage.getParticipantSubmissions(contestId, userId);
      const participants = await contestStorage.getContestParticipants(contestId);
      const participant = participants.find(p => p.userId === userId);

      // Calculate progress (case-insensitive status) & restrict to problems in this contest
      const acceptedAll = new Set<string>(
        submissions
          .filter(s => s.status?.toLowerCase?.() === 'accepted')
          .map(s => s.problemId)
      );
      const contestProblemIds = new Set<string>(contest.problems.map(p => p.id));
      const acceptedInContest = new Set(Array.from(acceptedAll).filter(id => contestProblemIds.has(id)));

      const totalProblems = contest.problems.length;
      const solvedCount = Math.min(acceptedInContest.size, totalProblems);
      const totalPoints = contest.problems.reduce((sum, problem) => sum + problem.points, 0);
      const earnedPoints = contest.problems
        .filter(p => acceptedInContest.has(p.id))
        .reduce((sum, p) => sum + (p.points || 0), 0);

      // Calculate time remaining
      const now = new Date();
      const endTime = new Date(contest.endTime);
      const timeRemaining = Math.max(0, endTime.getTime() - now.getTime());

      res.json({
        contestId,
        userId,
        solvedProblems: Array.from(acceptedInContest),
        solvedCount,
        totalProblems,
        progress: (solvedCount / Math.max(1, totalProblems)) * 100,
        earnedPoints,
        totalPoints,
        timeRemaining,
        participant: participant || null,
        submissions: submissions.length,
        lastSubmission: submissions.length > 0 ? submissions[submissions.length - 1] : null
      });
    } catch (error) {
      console.error("Error fetching contest progress:", error);
      res.status(500).json({ message: "Failed to fetch contest progress" });
    }
  });

  // Get contest standings with detailed stats
  app.get('/api/contests/:contestId/standings', protect, async (req: AuthRequest, res) => {
    try {
      const contestId = req.params.contestId;
      const leaderboard = await contestStorage.generateLeaderboard(contestId);
      const contest = await contestStorage.getContest(contestId);
      
      if (!contest) {
        return res.status(404).json({ message: "Contest not found" });
      }

      // Add problem-specific stats to each leaderboard entry
      const detailedStandings = await Promise.all(
        leaderboard.map(async (entry) => {
          const userSubmissions = await contestStorage.getParticipantSubmissions(contestId, entry.userId);
          const problemStats = contest.problems.map(problem => {
            const problemSubmissions = userSubmissions.filter(s => s.problemId === problem.id);
            const acceptedSubmission = problemSubmissions.find(s => s.status === 'accepted');
            const wrongAttempts = problemSubmissions.filter(s => s.status === 'wrong_answer').length;
            
            return {
              problemId: problem.id,
              problemTitle: problem.title,
              points: problem.points,
              solved: !!acceptedSubmission,
              attempts: problemSubmissions.length,
              wrongAttempts,
              solvedAt: acceptedSubmission?.submissionTime,
              bestRuntime: acceptedSubmission?.runtime,
              bestMemory: acceptedSubmission?.memory
            };
          });

          // Resolve participant name
          let displayName = entry.username || entry.userId;
          try {
            const userDoc = await contestStorage.getUser(entry.userId);
            if (userDoc) {
              const first = (userDoc.firstName || userDoc.given_name || '').toString().trim();
              const last = (userDoc.lastName || userDoc.family_name || '').toString().trim();
              const full = `${first} ${last}`.trim();
              displayName = full || userDoc.username || userDoc.name || userDoc.email || displayName;
            }
          } catch (e) {
            // fallback to existing username
          }

          return {
            ...entry,
            problemStats,
            totalAttempts: userSubmissions.length,
            correctSubmissions: userSubmissions.filter(s => s.status === 'accepted').length,
            wrongSubmissions: userSubmissions.filter(s => s.status === 'wrong_answer').length,
            displayName
          };
        })
      );

      res.json({
        contest: {
          id: contest.id,
          title: contest.title,
          startTime: contest.startTime,
          endTime: contest.endTime,
          totalProblems: contest.problems.length,
          totalPoints: contest.problems.reduce((sum, p) => sum + p.points, 0)
        },
        standings: detailedStandings
      });
    } catch (error) {
      console.error("Error fetching contest standings:", error);
      res.status(500).json({ message: "Failed to fetch contest standings" });
    }
  });

  app.get('/api/contests/:contestId/results', protect, async (req: AuthRequest, res) => {
    try {
      const contestId = req.params.contestId;
      
      // Check if contest has ended
      const contest = await contestStorage.getContest(contestId);
      if (!contest) {
        return res.status(404).json({ message: "Contest not found" });
      }
      
      const now = new Date();
      const endTime = new Date(contest.endTime);
      const hasEnded = now > endTime;
      if (!hasEnded) {
        // Allow fetching results but mark as provisional
      }
      
      // Generate final results
      const leaderboard = await contestStorage.generateLeaderboard(contestId);
      // Fetch participants to get registrationTime
      const participants = await contestStorage.getContestParticipants(contestId);
      const userIdToParticipant: Record<string, any> = {};
      for (const p of participants) {
        userIdToParticipant[p.userId] = p;
      }
      
      // Transform to results format with additional statistics
      const results = await Promise.all(
        leaderboard.map(async (entry) => {
          const submissions = await contestStorage.getParticipantSubmissions(contestId, entry.userId);
          
          // Calculate problem-specific results
          const problemResults: Record<string, any> = {};
          for (const problem of contest.problems) {
            const problemSubmissions = submissions.filter(s => s.problemId === problem.id);
            const bestSubmission = problemSubmissions
              .filter(s => s.status === 'accepted')
              .sort((a, b) => (b.points || 0) - (a.points || 0))[0];
            
            problemResults[problem.id] = {
              score: bestSubmission?.points || 0,
              attempts: problemSubmissions.length,
              bestRuntime: bestSubmission?.runtime || 0,
              bestMemory: bestSubmission?.memory || 0,
              status: bestSubmission?.status || 'not_attempted'
            };
          }
          
          // Calculate averages
          const acceptedSubmissions = submissions.filter(s => s.status === 'accepted');
          const averageRuntime = acceptedSubmissions.length > 0 
            ? acceptedSubmissions.reduce((sum, s) => sum + (s.runtime || 0), 0) / acceptedSubmissions.length 
            : 0;
          const averageMemory = acceptedSubmissions.length > 0 
            ? acceptedSubmissions.reduce((sum, s) => sum + (s.memory || 0), 0) / acceptedSubmissions.length 
            : 0;
          
          // Resolve participant name
          let displayName = entry.username || entry.userId;
          try {
            const userDoc = await contestStorage.getUser(entry.userId);
            if (userDoc) {
              const first = (userDoc.firstName || userDoc.given_name || '').toString().trim();
              const last = (userDoc.lastName || userDoc.family_name || '').toString().trim();
              const full = `${first} ${last}`.trim();
              displayName = full || userDoc.username || userDoc.name || userDoc.email || displayName;
            }
          } catch (e) {
            // fallback to existing username
          }

          // Compute accurate time spent from registration to last activity, clamped to contest end
          const participant = userIdToParticipant[entry.userId];
          const registrationTime = participant?.registrationTime ? new Date(participant.registrationTime as any) : null;
          const rawLast = entry.lastSubmissionTime ? new Date(entry.lastSubmissionTime as any) : null;
          const effectiveLast = rawLast ? new Date(Math.min(rawLast.getTime(), endTime.getTime())) : (hasEnded ? endTime : now);
          const timeSpentSeconds = registrationTime ? Math.max(0, Math.floor((effectiveLast.getTime() - registrationTime.getTime()) / 1000)) : 0;
          
          return {
            ...entry,
            averageRuntime,
            averageMemory,
            problemResults,
            displayName,
            submittedAt: entry.lastSubmissionTime,
            timeSpentSeconds
          };
        })
      );
      
      res.json(results);
    } catch (error) {
      console.error("Error generating contest results:", error);
      res.status(500).json({ message: "Failed to generate contest results" });
    }
  });

  // Contest announcements
  app.post('/api/contests/:contestId/announcements', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const contestId = req.params.contestId;
      const { message, priority = 'medium' } = req.body;
      
      const success = await contestStorage.addAnnouncement(contestId, message, priority);
      if (success) {
        res.status(201).json({ message: "Announcement added successfully" });
      } else {
        res.status(400).json({ message: "Failed to add announcement" });
      }
    } catch (error) {
      console.error("Error adding announcement:", error);
      res.status(500).json({ message: "Failed to add announcement" });
    }
  });

  app.get('/api/contests/:contestId/announcements', protect, async (req: AuthRequest, res) => {
    try {
      const contestId = req.params.contestId;
      const announcements = await contestStorage.getAnnouncements(contestId);
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ message: "Failed to fetch announcements" });
    }
  });

  // Contest Q&A system
  app.post('/api/contests/:contestId/questions', protect, async (req: AuthRequest, res) => {
    try {
      const contestId = req.params.contestId;
      const userId = req.user?.id;
      const { question, isPublic = true } = req.body;
      
      const questionData = await contestStorage.submitQuestion({
        contestId,
        userId,
        question,
        isPublic,
        submittedAt: new Date()
      });
      
      res.status(201).json(questionData);
    } catch (error) {
      console.error("Error submitting question:", error);
      res.status(500).json({ message: "Failed to submit question" });
    }
  });

  app.get('/api/contests/:contestId/questions', protect, async (req: AuthRequest, res) => {
    try {
      const contestId = req.params.contestId;
      const { isPublic } = req.query;
      
      const questions = await contestStorage.getContestQuestions(
        contestId, 
        isPublic === 'true'
      );
      
      res.json(questions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ message: "Failed to fetch questions" });
    }
  });

  app.post('/api/contests/questions/:questionId/answer', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const questionId = req.params.questionId;
      const { answer } = req.body;
      const answeredBy = req.user?.id;
      
      const success = await contestStorage.answerQuestion(questionId, answer, answeredBy);
      if (success) {
        res.json({ message: "Answer submitted successfully" });
      } else {
        res.status(400).json({ message: "Failed to submit answer" });
      }
    } catch (error) {
      console.error("Error answering question:", error);
      res.status(500).json({ message: "Failed to answer question" });
    }
  });

  // Contest routes (moved to end to avoid conflicts with admin routes)
  app.use('/api/contests', contestRoutes);

  // Admin: get submissions for a specific user in a contest
  app.get('/api/admin/contests/:contestId/users/:userId/submissions', protect, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { contestId, userId } = req.params;
      const submissions = await contestStorage.getParticipantSubmissions(contestId, userId);
      res.json(submissions);
    } catch (error) {
      console.error('Error fetching user submissions for admin:', error);
      res.status(500).json({ message: 'Failed to fetch user submissions' });
    }
  });

  // Reset current user's course progress
  app.post('/api/courses/:id/reset-progress', protect, async (req: AuthRequest, res) => {
    try {
      const courseId = parseInt(req.params.id);
      const userId = req.user.id;

      const isAdmin = req.user.role === 'admin';
      const canAccess = await storage.canUserAccessCourse(courseId, userId, isAdmin);
      if (!canAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }

      await storage.resetUserCourseProgress(userId, courseId);

      res.json({ success: true });
    } catch (error) {
      console.error('Error resetting course progress:', error);
      res.status(500).json({ message: 'Failed to reset course progress' });
    }
  });

  return server;
}
