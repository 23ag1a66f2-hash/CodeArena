import { Router, Response } from 'express';
import { protect } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import {
  listProblemSets,
  getProblemSetById,
  createProblemSet,
  updateProblemSet,
  deleteProblemSet,
  addProblemInstance,
  updateProblemInstance,
  deleteProblemInstance,
  listProblemSetEnrollments,
  enrollUserInProblemSet,
  removeUserFromProblemSet,
} from '../controllers/problemSetsController.js';
import { ProblemSetEnrollment } from '../models/ProblemSetEnrollment.js';
import QRCode from 'qrcode';
import { ProblemSet } from '../models/ProblemSet.js';
import { getDb } from '../db.js';
import { storage } from '../storage.js';
import mongoose from 'mongoose';

const router = Router();

router.get('/', listProblemSets as any);
router.get('/:id', getProblemSetById as any);
router.post('/', protect as any, createProblemSet as any);
router.put('/:id', protect as any, updateProblemSet as any);
router.delete('/:id', protect as any, deleteProblemSet as any);

router.post('/:id/problems', protect as any, addProblemInstance as any);
router.put('/:id/problems/:problemId', protect as any, updateProblemInstance as any);
router.delete('/:id/problems/:problemId', protect as any, deleteProblemInstance as any);

router.get('/:id/enrollments', protect as any, listProblemSetEnrollments as any);
router.post('/:id/enrollments', protect as any, enrollUserInProblemSet as any);
// Alias for enrollment used by some clients
router.post('/:id/enroll', protect as any, enrollUserInProblemSet as any);
router.delete('/:id/enrollments/:userId', protect as any, removeUserFromProblemSet as any);

// Overall analytics endpoint for problem set
router.get('/:id/overall-analytics', protect as any, (async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    
    const { id } = req.params;
    const { ProblemSet } = await import('../models/ProblemSet');
    const { ProblemSetEnrollment } = await import('../models/ProblemSetEnrollment');
    const { User } = await import('../models/User');
    
    // Find problem set by custom id or Mongo _id
    let ps: any = await ProblemSet.findOne({ id }).lean();
    if (!ps) {
      try {
        ps = await ProblemSet.findById(id).lean();
      } catch {}
    }
    if (!ps) return res.status(404).json({ message: 'Problem set not found' });
    
    const problemSetId = ps.id || String(ps._id);
    const totalProblems = ps.problemInstances?.length || ps.problems?.length || 0;
    
    // Get all enrollments for this problem set
    const enrollments = await ProblemSetEnrollment.find({ problemSetId }).lean();
    
    // Get user details for enrolled students
    const userIds = enrollments.map((e: any) => e.userId);
    const users = await User.find({ _id: { $in: userIds } }).select('firstName lastName email').lean();
    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));
    
    // Calculate analytics for each student
    const students = enrollments.map((enrollment: any) => {
      const user = userMap.get(enrollment.userId.toString());
      const progress = enrollment.progress || 0;
      const completedProblems = enrollment.completedProblems?.length || 0;
      // Calculate progress based on completed problems if progress is not set
      const calculatedProgress = progress > 0 ? progress : (totalProblems > 0 ? (completedProblems / totalProblems) * 100 : 0);
      const overallScore = enrollment.totalSubmissions > 0 
        ? Math.round((enrollment.correctSubmissions / enrollment.totalSubmissions) * 100) 
        : 0;
      
      // Debug logging for troubleshooting
      console.log(`Student ${user?.email || enrollment.userId}: progress=${progress}, completed=${completedProblems}, total=${totalProblems}, calculated=${calculatedProgress.toFixed(2)}, score=${overallScore.toFixed(2)}`);
      
      return {
        id: enrollment.userId.toString(),
        name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Unknown User',
        email: user?.email || '',
        progress: Math.min(100, calculatedProgress),
        completedProblems,
        totalProblems,
        lastActivity: enrollment.updatedAt || enrollment.enrolledAt,
        overallScore: Math.min(100, overallScore),
      };
    });
    
    // Calculate summary statistics
    const totalEnrolled = students.length;
    const averageProgress = totalEnrolled > 0 
      ? students.reduce((sum, s) => sum + s.progress, 0) / totalEnrolled 
      : 0;
    const averageScore = totalEnrolled > 0 
      ? students.reduce((sum, s) => sum + s.overallScore, 0) / totalEnrolled 
      : 0;
    const completionRate = totalEnrolled > 0 
      ? (students.filter(s => s.progress >= 100).length / totalEnrolled) * 100 
      : 0;
    
    // Debug logging for summary
    console.log(`Analytics Summary: totalEnrolled=${totalEnrolled}, avgProgress=${Number(averageProgress).toFixed(2)}%, avgScore=${Number(averageScore).toFixed(2)}%, completionRate=${Number(completionRate).toFixed(2)}%`);
    
    res.json({
      students,
      summary: {
        totalEnrolled,
        averageProgress,
        averageScore,
        completionRate,
      }
    });
  } catch (error) {
    console.error('Error fetching overall analytics:', error);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
}) as any);

// Manage enrollments by enrollment id
router.delete('/enrollments/:enrollmentId', protect as any, (async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    const enrollmentId = parseInt(req.params.enrollmentId);
    
    // Use storage layer for consistency
    await storage.deleteProblemSetEnrollment(enrollmentId);
    
    res.json({ message: 'Enrollment deleted' });
  } catch (error: any) {
    console.error('Error deleting enrollment:', error);
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }
    res.status(500).json({ message: 'Failed to delete enrollment' });
  }
}) as any);

// Fetch a specific problem instance from a problem set, merged with original problem data
// This enables solving assignment problems with per-instance overrides
router.get('/:setId/problems/:instanceId', protect as any, (async (req: AuthRequest, res: Response) => {
  try {
    const { setId, instanceId } = req.params as { setId: string; instanceId: string };

    // Find the problem set by custom id or by Mongo _id
    let ps: any = await ProblemSet.findOne({ id: setId }).lean();
    if (!ps) {
      try {
        ps = await ProblemSet.findById(setId).lean();
      } catch {}
    }
    if (!ps) return res.status(404).json({ message: 'Problem set not found' });

    // Look for instance either in problemInstances or legacy problems array
    const instances: any[] = Array.isArray(ps.problemInstances) ? ps.problemInstances : (Array.isArray(ps.problems) ? ps.problems : []);
    const instance: any = instances.find((p: any) => String(p.id || p._id) === String(instanceId));
    if (!instance) return res.status(404).json({ message: 'Problem instance not found' });

    // If instance references an original problem, merge fields from the base problem
    const db = await getDb();
    const originalProblemId = parseInt(String(instance.originalProblemId || instance.selectedProblemId || instance.problemId || 0));
    let original: any = undefined;
    if (!Number.isNaN(originalProblemId) && originalProblemId > 0) {
      original = await db.collection('problems').findOne({ id: originalProblemId });
    }

    const merged = {
      // identity
      id: original?.id || originalProblemId || 0,
      instanceId: String(instance.id || instance._id),
      problemSetId: String(ps.id || ps._id),
      isInstance: true,

      // presentation
      title: instance.title || original?.title || 'Untitled Problem',
      description: instance.description || original?.description || '',
      difficulty: (instance.difficulty || original?.difficulty || 'medium') as any,
      timeLimit: instance.timeLimit || original?.timeLimit,
      memoryLimit: instance.memoryLimit || original?.memoryLimit,
      notes: instance.setNotes || instance.notes || original?.notes,
      tags: instance.tags || original?.tags || [],

      // IO + examples
      inputFormat: instance.inputFormat || original?.inputFormat,
      outputFormat: instance.outputFormat || original?.outputFormat,
      constraints: instance.constraints || original?.constraints,
      examples: instance.customExamples || instance.examples || original?.examples || [],

      // execution assets
      starterCode: instance.customStarterCode || instance.starterCode || original?.starterCode || {},
      testCases: instance.customTestCases || instance.testCases || original?.testCases || [],
    };

    // If entirely custom (no original), ensure an id field exists for client routing
    if (!merged.id) {
      merged.id = 0;
    }

    return res.json(merged);
  } catch (error) {
    console.error('Error fetching problem instance:', error);
    return res.status(500).json({ message: 'Failed to fetch problem instance' });
  }
}) as any);

router.patch('/enrollments/:enrollmentId', protect as any, (async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    const enrollmentId = parseInt(req.params.enrollmentId);
    const update: any = { ...req.body, updatedAt: new Date() };
    const updated = await ProblemSetEnrollment.findOneAndUpdate({ id: enrollmentId }, { $set: update }, { new: true }).lean();
    if (!updated) return res.status(404).json({ message: 'Enrollment not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update enrollment' });
  }
}) as any);

// Generate QR code to enroll in a problem set (assignment)
router.get('/:id/qr-code', protect as any, (async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    // Check flag to allow QR enrollment
    const ps: any = await ProblemSet.findOne({ id }).lean();
    if (!ps) return res.status(404).json({ message: 'Problem set not found' });
    // Only gate the actual self-enrollment; allow admins to generate QR regardless
    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin && ps.allowDirectEnrollment !== true) {
      return res.status(403).json({ message: 'Direct enrollment is disabled for this assignment' });
    }
    const frontendUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
    // Enrollment link expected by client
    const enrollmentUrl = `${frontendUrl}/admin/problem-sets/${id}/enrollments/create`;
    const qrCodeDataUrl = await QRCode.toDataURL(enrollmentUrl);
    res.json({ qrCode: qrCodeDataUrl, url: enrollmentUrl, id });
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate QR code' });
  }
}) as any);

// Student self-enroll via link/QR (respects allowDirectEnrollment)
router.post('/:id/self-enroll', protect as any, (async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const ps: any = await ProblemSet.findOne({ id }).lean();
    if (!ps) return res.status(404).json({ message: 'Problem set not found' });
    if (ps.allowDirectEnrollment !== true) {
      return res.status(403).json({ message: 'Direct enrollment is disabled for this assignment' });
    }
    
    // Check if user is already enrolled using both methods
    // 1. Check Mongoose ProblemSetEnrollment collection
    const exists = await ProblemSetEnrollment.findOne({ problemSetId: id, userId }).lean();
    if (exists) return res.status(200).json({ message: 'Already enrolled' });
    
    // 2. Check participants array in problemSets collection
    if (ps.participants && ps.participants.includes(userId)) {
      return res.status(200).json({ message: 'Already enrolled' });
    }
    
    const last = await ProblemSetEnrollment.findOne({}, {}, { sort: { id: -1 } }).lean();
    const nextId = (last?.id || 0) + 1;
    const created = await ProblemSetEnrollment.create({ 
      id: nextId, 
      problemSetId: id, 
      userId, 
      enrolledAt: new Date(), 
      progress: 0, 
      completedProblems: [], 
      totalSubmissions: 0, 
      correctSubmissions: 0,
      enrollmentType: 'qr' // Set enrollment type as QR
    } as any);
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: 'Failed to self-enroll' });
  }
}) as any);

// Track problem completion when users successfully solve problems
router.post('/:id/complete-problem', protect as any, (async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { problemId, isCompleted } = req.body;
    const userId = req.user?.id;
    
    if (!userId) return res.status(401).json({ message: 'Authentication required' });
    if (!problemId) return res.status(400).json({ message: 'Problem ID is required' });
    
    const { ProblemSetEnrollment } = await import('../models/ProblemSetEnrollment');
    const { ProblemSet } = await import('../models/ProblemSet');
    
    // Find problem set
    let ps: any = await ProblemSet.findOne({ id }).lean();
    if (!ps) {
      try {
        ps = await ProblemSet.findById(id).lean();
      } catch {}
    }
    if (!ps) return res.status(404).json({ message: 'Problem set not found' });
    
    const problemSetId = ps.id || String(ps._id);
    
    // Find user's enrollment
    const enrollment = await ProblemSetEnrollment.findOne({ 
      problemSetId, 
      userId: new mongoose.Types.ObjectId(userId) 
    });
    
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }
    
    if (isCompleted) {
      // Mark problem as completed if not already
      if (!enrollment.completedProblems.includes(problemId)) {
        enrollment.completedProblems.push(problemId);
      }
    }
    
    // Calculate progress based on completed problems
    const totalProblems = ps.problemInstances?.length || ps.problems?.length || 0;
    const progress = totalProblems > 0 ? Math.min(100, Math.round((enrollment.completedProblems.length / totalProblems) * 100)) : 0;
    
    // Update enrollment
    await ProblemSetEnrollment.findByIdAndUpdate(enrollment._id, {
      $set: { 
        progress,
        updatedAt: new Date()
      }
    });
    
    res.json({ 
      message: 'Problem completion tracked successfully',
      progress,
      completedProblems: enrollment.completedProblems,
      totalProblems
    });
  } catch (error) {
    console.error('Error tracking problem completion:', error);
    res.status(500).json({ message: 'Failed to track problem completion' });
  }
}) as any);

// Server-Sent Events endpoint for real-time submission updates
router.get('/:id/submissions/stream', protect as any, (async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    
    const { id } = req.params;
    
    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE connection established' })}\n\n`);

    // Keep connection alive with periodic heartbeats
    const heartbeat = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
    }, 30000); // Every 30 seconds

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
      res.end();
    });

    // Keep connection open
    req.on('error', () => {
      clearInterval(heartbeat);
      res.end();
    });

  } catch (error) {
    console.error('Error setting up SSE stream:', error);
    res.status(500).json({ message: 'Failed to set up SSE stream' });
  }
}) as any);

// Refresh analytics endpoint for manual recalculation
router.post('/:id/refresh-analytics', protect as any, (async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    
    const { id } = req.params;
    const { ProblemSet } = await import('../models/ProblemSet');
    const { ProblemSetEnrollment } = await import('../models/ProblemSetEnrollment');
    const { Submission } = await import('../models/Submission');
    
    // Find problem set by custom id or Mongo _id
    let ps: any = await ProblemSet.findOne({ id }).lean();
    if (!ps) {
      try {
        ps = await ProblemSet.findById(id).lean();
      } catch {}
    }
    if (!ps) return res.status(404).json({ message: 'Problem set not found' });
    
    const problemSetId = ps.id || String(ps._id);
    const totalProblems = ps.problemInstances?.length || ps.problems?.length || 0;
    
    console.log(`[REFRESH ANALYTICS] Starting manual refresh for problem set ${problemSetId} with ${totalProblems} problems`);
    
    // Get all enrollments for this problem set
    const enrollments = await ProblemSetEnrollment.find({ problemSetId });
    
    let updatedCount = 0;
    
    for (const enrollment of enrollments) {
      const userId = enrollment.userId;
      
      // Get all submissions for this user in this problem set
      const submissions = await Submission.find({
        userId: userId.toString(),
        $or: [
          { problemSetId: problemSetId },
          { problemInstanceId: { $in: ps.problemInstances?.map((p: any) => p._id) || [] } }
        ]
      }).lean();
      
      // Calculate actual statistics from submissions
      const totalSubmissions = submissions.length;
      const acceptedSubmissions = submissions.filter(s => s.status === 'accepted');
      const correctSubmissions = acceptedSubmissions.length;
      
      // Get unique completed problems from accepted submissions
      const completedProblems = [...new Set(acceptedSubmissions.map(s => s.problemId))];
      
      // Calculate progress
      const progress = totalProblems > 0 ? Math.min(100, Math.round((completedProblems.length / totalProblems) * 100)) : 0;
      
      // Update enrollment with recalculated data
      enrollment.totalSubmissions = totalSubmissions;
      enrollment.correctSubmissions = correctSubmissions;
      enrollment.completedProblems = completedProblems;
      enrollment.progress = progress;
      (enrollment as any).updatedAt = new Date();
      
      await enrollment.save();
      updatedCount++;
      
      console.log(`[REFRESH ANALYTICS] Updated enrollment for user ${userId}: submissions=${totalSubmissions}, correct=${correctSubmissions}, completed=${completedProblems.length}, progress=${progress}%`);
    }
    
    console.log(`[REFRESH ANALYTICS] Completed refresh for ${updatedCount} enrollments in problem set ${problemSetId}`);
    
    res.json({ 
      message: `Analytics refreshed successfully for ${updatedCount} enrollments`,
      updatedCount,
      totalProblems,
      problemSetId
    });
    
  } catch (error) {
    console.error('Error refreshing analytics:', error);
    res.status(500).json({ message: 'Failed to refresh analytics' });
  }
}) as any);

export default router;
