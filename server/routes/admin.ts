import { Router, Request, Response } from 'express';
import { protect, requireAdmin } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { storage } from '../storage.js';
import { connectToMongoDB } from '../db.ts';
import { listUsers, updateUserRole, analyticsSummary, createUser, deleteUser } from '../controllers/adminController.js';
import { Submission } from '../models/Submission.js';
import { User } from '../models/User.js';
import { Problem } from '../models/Problem.js';
import mongoose from 'mongoose';

const router = Router();

// Admin assignments
router.get('/assignments', protect, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const assignments = await storage.getAssignments();
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch assignments' });
  }
});

// Admin groups
router.get('/groups', protect, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const groups = await storage.getGroups();
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch groups' });
  }
});

// Admin announcements
router.get('/announcements', protect, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const announcements = await storage.getAnnouncements();
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch announcements' });
  }
});

// Admin users
router.get('/users', protect, requireAdmin, listUsers as any);
router.post('/users', protect, requireAdmin, createUser as any);
router.delete('/users/:id', protect, requireAdmin, deleteUser as any);
router.patch('/users/:id/role', protect, requireAdmin, updateUserRole as any);

// Admin problems list (used by assignment creation UI)
router.get('/problems', protect, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const problems = await storage.getProblems();
    res.json(problems || []);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch problems' });
  }
});

// Admin submissions
router.get('/submissions', protect, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const submissions = await storage.getAllSubmissions();
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch submissions' });
  }
});

// Submissions stats (two paths for compatibility)
async function handleSubmissionStats(_req: AuthRequest, res: Response) {
  try {
    const stats = await storage.getSubmissionStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch submission stats' });
  }
}
router.get('/submissions/stats', protect, requireAdmin, handleSubmissionStats);
router.get('/submission-stats', protect, requireAdmin, handleSubmissionStats);

// Problem analytics (Mongoose-only, admin)
router.get('/problems/:problemId/analytics', protect, requireAdmin, async (req, res) => {
  try {
    const problemId = parseInt(req.params.problemId);
    if (Number.isNaN(problemId)) return res.status(400).json({ message: 'Invalid problem id' });

    // Load submissions with joined user info
    const rows: any[] = await Submission.aggregate([
      { $match: { problemId } },
      { $sort: { submittedAt: -1 } },
      { $addFields: { userIdObj: { $toObjectId: '$userId' } } },
      {
        $lookup: {
          from: 'users',
          localField: 'userIdObj',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }
    ]);

    const byUser: Record<string, any> = {};
    for (const s of rows) {
      const key = String(s.userIdObj || s.userId);
      if (!byUser[key]) {
        byUser[key] = {
          userId: key,
          userName: s.user ? `${s.user.firstName || ''} ${s.user.lastName || ''}`.trim() || s.user.email : 'Unknown User',
          userEmail: s.user?.email || '',
          totalAttempts: 0,
          passedAttempts: 0,
          failedAttempts: 0,
          bestScore: 0,
          lastAttempt: null as any,
          status: 'failed',
        };
      }
      byUser[key].totalAttempts += 1;
      const isPass = (s.status === 'completed' && s.score === '100%') || s.status === 'accepted';
      if (isPass) {
        byUser[key].passedAttempts += 1;
        byUser[key].status = 'passed';
      } else {
        byUser[key].failedAttempts += 1;
      }
      const numericScore = typeof s.score === 'string' ? parseFloat(s.score) : (s.score || 0);
      if (!Number.isNaN(numericScore) && numericScore > byUser[key].bestScore) {
        byUser[key].bestScore = numericScore;
      }
      if (!byUser[key].lastAttempt || new Date(s.submittedAt) > new Date(byUser[key].lastAttempt)) {
        byUser[key].lastAttempt = s.submittedAt;
      }
    }

    const problem = await Problem.findOne({ id: problemId }).lean();
    const totalUsers = Object.keys(byUser).length;
    const passedUsers = Object.values(byUser).filter((u: any) => u.status === 'passed').length;
    const failedUsers = totalUsers - passedUsers;

    res.json({
      problemId,
      problemTitle: (problem as any)?.title || `Problem ${problemId}`,
      totalUsers,
      passedUsers,
      failedUsers,
      passRate: totalUsers > 0 ? Math.round((passedUsers / totalUsers) * 100) : 0,
      totalSubmissions: rows.length,
      userStats: Object.values(byUser),
    });
  } catch (error) {
    console.error('Error fetching problem analytics:', error);
    res.status(500).json({ message: 'Failed to fetch problem analytics' });
  }
});

router.get('/problems/:problemId/users/:userId/analytics', protect, requireAdmin, async (req, res) => {
  try {
    const problemId = parseInt(req.params.problemId);
    const userId = req.params.userId;
    if (Number.isNaN(problemId)) return res.status(400).json({ message: 'Invalid problem id' });

    const userObjectId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : undefined;
    const userDoc = userObjectId ? await User.findById(userObjectId).lean() : await User.findOne({ id: userId }).lean();
    const submissions = await Submission.find({ problemId, userId }).sort({ submittedAt: 1 }).lean();

    const totalAttempts = submissions.length;
    const passedAttempts = submissions.filter((s: any) => (s.status === 'completed' && s.score === '100%') || s.status === 'accepted').length;
    const failedAttempts = totalAttempts - passedAttempts;
    const bestScore = submissions.reduce((max: number, s: any) => {
      const v = typeof s.score === 'string' ? parseFloat(s.score) : (s.score || 0);
      return Number.isFinite(v) && v > max ? v : max;
    }, 0);
    const averageRuntime = Math.round((submissions.reduce((sum: number, s: any) => sum + (s.runtime || 0), 0) / Math.max(1, totalAttempts)) || 0);
    const averageMemory = Math.round((submissions.reduce((sum: number, s: any) => sum + (s.memory || 0), 0) / Math.max(1, totalAttempts)) || 0);

    const attempts = submissions.map((s: any, idx: number) => ({
      attemptNumber: idx + 1,
      submittedAt: s.submittedAt,
      language: s.language,
      status: (s.status === 'completed' && s.score === '100%') ? 'accepted' : (s.status || 'failed'),
      runtime: s.runtime,
      memory: s.memory,
      score: s.score,
      testCasesPassed: undefined,
      totalTestCases: undefined,
    }));

    const problem = await Problem.findOne({ id: problemId }).lean();
    res.json({
      problemId,
      problemTitle: (problem as any)?.title || `Problem ${problemId}`,
      userId,
      userName: userDoc ? `${userDoc.firstName || ''} ${userDoc.lastName || ''}`.trim() || userDoc.email : 'Unknown User',
      userEmail: userDoc?.email || '',
      totalAttempts,
      passedAttempts,
      failedAttempts,
      successRate: totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0,
      bestScore,
      averageRuntime,
      averageMemory,
      firstAttempt: submissions[0]?.submittedAt || null,
      lastAttempt: submissions[submissions.length - 1]?.submittedAt || null,
      attempts,
    });
  } catch (error) {
    console.error('Error fetching user problem analytics:', error);
    res.status(500).json({ message: 'Failed to fetch user problem analytics' });
  }
});

// Admin contest user submissions
router.get('/contests/:contestId/users/:userId/submissions', protect, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { contestId, userId } = req.params;
    
    // Import contest storage
    const { contestStorage } = await import('../services/contestStorage');
    
    // Get user submissions for the specific contest
    const submissions = await contestStorage.getParticipantSubmissions(contestId, userId);
    console.log(`[ADMIN-CONTEST-SUBMISSIONS] Found ${submissions.length} submissions for user ${userId} in contest ${contestId}`);
    console.log(`[ADMIN-CONTEST-SUBMISSIONS] Raw submissions:`, JSON.stringify(submissions, null, 2));
    
    // Get contest details for additional context
    const contest = await contestStorage.getContest(contestId);
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }
    console.log(`[ADMIN-CONTEST-SUBMISSIONS] Contest problems:`, contest.problems?.map(p => ({ id: p.id, title: p.title })));
    
    // Get user details
    const user = await storage.getUser(userId);
    const userInfo = user ? {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      username: (user as any).username || user.email
    } : null;
    
    // Format submissions with problem information - match frontend expectations
    const formattedSubmissions = submissions.map(submission => ({
      id: submission.id,
      problemId: submission.problemId,
      problemTitle: contest.problems.find(p => p.id === submission.problemId)?.title || 'Unknown Problem',
      code: submission.code || '',
      language: submission.language || '',
      status: submission.status || 'unknown',
      runtime: submission.runtime || 0,
      memory: submission.memory || 0,
      points: submission.points || 0,
      submissionTime: submission.submissionTime || new Date(),
      submittedAt: submission.submissionTime || new Date(),
      penalty: submission.penalty || 0,
      isContestSubmission: submission.isContestSubmission || false
    }));
    
    const response = {
      contest: {
        id: contest.id,
        title: contest.title,
        startTime: contest.startTime,
        endTime: contest.endTime
      },
      user: userInfo,
      submissions: formattedSubmissions,
      totalSubmissions: submissions.length,
      acceptedSubmissions: submissions.filter(s => s.status === 'accepted').length,
      totalPoints: submissions.filter(s => s.status === 'accepted').reduce((sum, s) => sum + (s.points || 0), 0)
    };
    
    console.log(`[ADMIN-CONTEST-SUBMISSIONS] Final response:`, JSON.stringify(response, null, 2));
    res.json(response);
  } catch (error) {
    console.error('Error fetching admin contest user submissions:', error);
    res.status(500).json({ message: 'Failed to fetch user submissions' });
  }
});

// Platform analytics (basic impl using storage)
router.get('/analytics/platform-stats', protect, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const users = await storage.getAllUsers();
    const analytics = await storage.getAdminAnalytics();

 	const endDate = new Date();
 	const startDate = new Date();
 	startDate.setDate(startDate.getDate() - 30);

 	const timeSeriesData = [] as Array<{ date: string; users: number; problems: number; submissions: number }>;
 	const currentUsers = users.length;
 	const currentProblems = (analytics as any).problems || 0;
 	const currentSubmissions = (analytics as any).submissions || 0;

 	for (let i = 0; i < 30; i++) {
 		const d = new Date(startDate);
 		d.setDate(startDate.getDate() + i);
 		const progress = (i + 1) / 30;
 		timeSeriesData.push({
 			date: d.toISOString().split('T')[0],
 			users: Math.max(1, Math.floor(currentUsers * progress)),
 			problems: Math.max(1, Math.floor(currentProblems * progress)),
 			submissions: Math.max(1, Math.floor(currentSubmissions * progress)),
 		});
 	}

 	res.json(timeSeriesData);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch platform statistics' });
  }
});

// User distribution analytics
router.get('/analytics/user-distribution', protect, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const users = await storage.getAllUsers();
    const adminUsers = users.filter((u: any) => u.role === 'admin');
    const studentUsers = users.filter((u: any) => u.role !== 'admin');

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const timeSeriesData = [] as Array<{ date: string; students: number; admins: number; total: number }>;
    const currentStudents = studentUsers.length;
    const currentAdmins = adminUsers.length;

    for (let i = 0; i < 30; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const progress = (i + 1) / 30;
      const students = Math.max(1, Math.floor(currentStudents * progress));
      const admins = Math.max(1, Math.floor(currentAdmins * progress));
      timeSeriesData.push({ date: d.toISOString().split('T')[0], students, admins, total: students + admins });
    }

    res.json(timeSeriesData);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user distribution' });
  }
});

// Course stats for admin dashboard
router.get('/course-stats', protect, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const stats = await storage.getCourseStats();
    res.json(stats || {});
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch course stats' });
  }
});

// Analytics summary (totals and recent activity)
router.get('/analytics/summary', protect, requireAdmin, analyticsSummary as any);

export default router; 