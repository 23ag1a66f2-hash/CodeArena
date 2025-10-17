import { Router, Request, Response } from 'express';
import { AssignmentAnalyticsService } from '../services/assignmentAnalyticsService.js';
import { AssignmentAnalytics } from '../models/AssignmentAnalytics.js';
import { Submission } from '../models/Submission.js';
import { ProblemSetEnrollment } from '../models/ProblemSetEnrollment.js';
import mongoose from 'mongoose';
import { protect, requireAdmin } from '../middleware/auth.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get comprehensive analytics for a specific assignment (Admin only)
router.get('/assignments/:assignmentId/analytics', protect, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId);
    console.log(`[Analytics Route] Request for assignment ${assignmentId}`);
    
    if (isNaN(assignmentId)) {
      return res.status(400).json({ message: 'Invalid assignment ID' });
    }

    const analytics = await AssignmentAnalyticsService.generateAssignmentAnalytics(assignmentId);
    console.log(`[Analytics Route] Generated analytics:`, JSON.stringify(analytics, null, 2));
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching assignment analytics:', error);
    res.status(500).json({ 
      message: 'Failed to fetch assignment analytics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get user-specific analytics for an assignment
router.get('/assignments/:assignmentId/users/:userId/analytics', protect, async (req: AuthRequest, res: Response) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId);
    const userId = req.params.userId;
    const requestingUserId = req.user.id;

    if (isNaN(assignmentId)) {
      return res.status(400).json({ message: 'Invalid assignment ID' });
    }

    // Users can only view their own analytics, unless they're an admin
    if (requestingUserId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const analytics = await AssignmentAnalyticsService.generateUserAssignmentAnalytics(userId, assignmentId);
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching user assignment analytics:', error);
    res.status(500).json({ 
      message: 'Failed to fetch user assignment analytics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get course-level analytics summary
router.get('/courses/:courseId/analytics', protect, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const courseId = parseInt(req.params.courseId);
    
    if (isNaN(courseId)) {
      return res.status(400).json({ message: 'Invalid course ID' });
    }

    const analytics = await AssignmentAnalyticsService.generateCourseAnalytics(courseId);
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching course analytics:', error);
    res.status(500).json({ 
      message: 'Failed to fetch course analytics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get user's overall analytics across all assignments
router.get('/users/:userId/analytics', protect, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId;
    const requestingUserId = req.user.id;

    // Users can only view their own analytics, unless they're an admin
    if (requestingUserId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const userAnalytics = await AssignmentAnalytics.find({ userId }).sort({ submittedAt: -1 });
    
    // Calculate overall user statistics
    const totalAssignments = new Set(userAnalytics.map(a => a.assignmentId)).size;
    const totalSubmissions = userAnalytics.length;
    const averageScore = userAnalytics.reduce((sum, a) => sum + a.percentageScore, 0) / totalSubmissions;
    const bestScore = Math.max(...userAnalytics.map(a => a.percentageScore));
    const totalTimeSpent = userAnalytics.reduce((sum, a) => sum + a.timeSpent, 0);

    // Calculate improvement trend
    const sortedByDate = userAnalytics.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
    const recentScores = sortedByDate.slice(-5).map(a => a.percentageScore);
    const olderScores = sortedByDate.slice(0, 5).map(a => a.percentageScore);
    const recentAverage = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
    const olderAverage = olderScores.reduce((sum, score) => sum + score, 0) / olderScores.length;
    const improvementTrend = olderAverage > 0 ? ((recentAverage - olderAverage) / olderAverage) * 100 : 0;

    // Get learning outcomes summary
    const allOutcomes = userAnalytics.flatMap(a => a.learningOutcomes);
    const uniqueOutcomes = new Set(allOutcomes.map(o => o.outcome));
    const achievedOutcomes = allOutcomes.filter(o => o.achieved).length;
    const totalOutcomes = allOutcomes.length;
    const achievementRate = totalOutcomes > 0 ? (achievedOutcomes / totalOutcomes) * 100 : 0;

    // Get performance categories
    const performanceCategories = userAnalytics.map(a => a.comparativeAnalytics.performanceCategory);
    const categoryCounts = performanceCategories.reduce((acc, category) => {
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const userSummary = {
      userId,
      totalAssignments,
      totalSubmissions,
      averageScore: Math.round(averageScore * 100) / 100,
      bestScore: Math.round(bestScore * 100) / 100,
      totalTimeSpent: Math.round(totalTimeSpent * 100) / 100,
      improvementTrend: Math.round(improvementTrend * 100) / 100,
      achievementRate: Math.round(achievementRate * 100) / 100,
      performanceBreakdown: categoryCounts,
      recentActivity: userAnalytics
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
        .slice(0, 10)
        .map(a => ({
          assignmentId: a.assignmentId,
          score: a.percentageScore,
          submittedAt: a.submittedAt,
          timeSpent: a.timeSpent
        }))
    };

    res.json(userSummary);
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({ 
      message: 'Failed to fetch user analytics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create test analytics data (Admin only)
router.post('/test-data/:assignmentId', protect, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId);
    
    if (isNaN(assignmentId)) {
      return res.status(400).json({ message: 'Invalid assignment ID' });
    }

    // Create some test submissions for this assignment
    const testSubmissions = [];
    const users = ['user1', 'user2', 'user3', 'user4', 'user5'];
    
    for (let i = 0; i < 20; i++) {
      const submission = new Submission({
        problemId: assignmentId.toString(),
        userId: users[i % users.length],
        status: Math.random() > 0.3 ? 'accepted' : 'error',
        score: Math.floor(Math.random() * 40) + 60, // 60-100
        runtime: Math.floor(Math.random() * 1000) + 100,
        memory: Math.floor(Math.random() * 50) + 10,
        submittedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
        testResults: [
          { testCase: 1, passed: Math.random() > 0.2, output: 'Test output' },
          { testCase: 2, passed: Math.random() > 0.2, output: 'Test output' },
          { testCase: 3, passed: Math.random() > 0.2, output: 'Test output' }
        ]
      });
      
      await submission.save();
      testSubmissions.push(submission);
    }

    res.json({ 
      message: 'Test data created successfully', 
      submissionsCreated: testSubmissions.length 
    });
  } catch (error) {
    console.error('Error creating test data:', error);
    res.status(500).json({ 
      message: 'Failed to create test data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create or update assignment analytics record
router.post('/assignments/:assignmentId/analytics', protect, async (req: AuthRequest, res: Response) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId);
    const userId = req.user.id;
    
    if (isNaN(assignmentId)) {
      return res.status(400).json({ message: 'Invalid assignment ID' });
    }

    // Check if analytics record already exists for this user and assignment
    const existingAnalytics = await AssignmentAnalytics.findOne({ 
      assignmentId, 
      userId 
    }).sort({ attemptNumber: -1 });

    const attemptNumber = existingAnalytics ? existingAnalytics.attemptNumber + 1 : 1;

    const analyticsData = {
      ...req.body,
      assignmentId,
      userId,
      attemptNumber,
      submittedAt: new Date()
    };

    const analytics = await AssignmentAnalyticsService.createAssignmentAnalytics(analyticsData);
    res.status(201).json(analytics);
  } catch (error) {
    console.error('Error creating assignment analytics:', error);
    res.status(500).json({ 
      message: 'Failed to create assignment analytics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get assignment statistics (summary metrics)
router.get('/assignments/:assignmentId/stats', protect, async (req: AuthRequest, res: Response) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId);
    
    if (isNaN(assignmentId)) {
      return res.status(400).json({ message: 'Invalid assignment ID' });
    }

    const stats = await AssignmentAnalytics.aggregate([
      { $match: { assignmentId } },
      {
        $group: {
          _id: null,
          totalSubmissions: { $sum: 1 },
          averageScore: { $avg: '$percentageScore' },
          averageTimeSpent: { $avg: '$timeSpent' },
          averageAttempts: { $avg: '$attemptNumber' },
          minScore: { $min: '$percentageScore' },
          maxScore: { $max: '$percentageScore' },
          standardDeviation: { $stdDevPop: '$percentageScore' }
        }
      }
    ]);
    
    const result = stats.length > 0 ? stats[0] : {
      totalSubmissions: 0,
      averageScore: 0,
      averageTimeSpent: 0,
      averageAttempts: 0,
      minScore: 0,
      maxScore: 0,
      standardDeviation: 0
    };
    res.json(result);
  } catch (error) {
    console.error('Error fetching assignment stats:', error);
    res.status(500).json({ 
      message: 'Failed to fetch assignment stats',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get user progress across assignments
router.get('/users/:userId/progress', protect, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId;
    const requestingUserId = req.user.id;
    const courseId = req.query.courseId ? parseInt(req.query.courseId as string) : undefined;

    // Users can only view their own progress, unless they're an admin
    if (requestingUserId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const matchStage = courseId ? { userId, courseId } : { userId };
    
    const progress = await AssignmentAnalytics.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$assignmentId',
          bestScore: { $max: '$percentageScore' },
          totalAttempts: { $sum: 1 },
          averageTimeSpent: { $avg: '$timeSpent' },
          lastAttempt: { $max: '$submittedAt' },
          improvement: { $avg: '$performanceTrends.improvementFromPrevious' }
        }
      },
      { $sort: { lastAttempt: -1 } }
    ]);
    // Attach enrollment progress from ProblemSetEnrollment
    let enriched = progress;
    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);
      const enrollments = await ProblemSetEnrollment.find({ userId: userObjectId });
      const progressMap = new Map<number, number>();
      enrollments.forEach(e => {
        // problemSetId is number in enrollment schema
        // @ts-ignore - using dynamic doc typing
        progressMap.set(e.problemSetId as unknown as number, e.progress as unknown as number);
      });
      enriched = progress.map((p: any) => ({
        ...p,
        enrollmentProgress: progressMap.get(p._id) ?? null,
      }));
    } catch (e) {
      // Non-blocking if enrollment progress is unavailable
    }
    res.json(enriched);
  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({ 
      message: 'Failed to fetch user progress',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get learning outcomes for a user
router.get('/users/:userId/learning-outcomes', protect, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId;
    const requestingUserId = req.user.id;
    const courseId = req.query.courseId ? parseInt(req.query.courseId as string) : undefined;

    // Users can only view their own learning outcomes, unless they're an admin
    if (requestingUserId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const matchStage = courseId ? { userId, courseId } : { userId };
    
    const outcomes = await AssignmentAnalytics.aggregate([
      { $match: matchStage },
      { $unwind: '$learningOutcomes' },
      {
        $group: {
          _id: '$learningOutcomes.outcome',
          totalAttempts: { $sum: 1 },
          achievedCount: { $sum: { $cond: ['$learningOutcomes.achieved', 1, 0] } },
          averageConfidence: { $avg: '$learningOutcomes.confidence' },
          averageTimeToMastery: { $avg: '$learningOutcomes.timeToMastery' }
        }
      }
    ]);
    
    const result = outcomes.map((outcome: any) => ({
      ...outcome,
      achievementRate: outcome.totalAttempts > 0 ? (outcome.achievedCount / outcome.totalAttempts) * 100 : 0
    }));
    res.json(result);
  } catch (error) {
    console.error('Error fetching learning outcomes:', error);
    res.status(500).json({ 
      message: 'Failed to fetch learning outcomes',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get comparative analytics for an assignment
router.get('/assignments/:assignmentId/comparative', protect, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId);
    
    if (isNaN(assignmentId)) {
      return res.status(400).json({ message: 'Invalid assignment ID' });
    }

    const analytics = await AssignmentAnalytics.find({ assignmentId }).sort({ submittedAt: -1 });
    
    if (analytics.length === 0) {
      return res.status(404).json({ message: 'No analytics data found for this assignment' });
    }

    // Calculate comparative metrics
    const scores = analytics.map((a: any) => a.percentageScore).sort((a: number, b: number) => a - b);
    const classAverage = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const classMedian = scores[Math.floor(scores.length / 2)];
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - classAverage, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);

    // Calculate percentiles
    const percentiles = [10, 25, 50, 75, 90];
    const percentileValues = percentiles.map(p => {
      const index = Math.floor((p / 100) * scores.length);
      return scores[index] || 0;
    });

    // Calculate performance distribution
    const distribution = {
      excellent: scores.filter(s => s >= 90).length,
      good: scores.filter(s => s >= 80 && s < 90).length,
      average: scores.filter(s => s >= 70 && s < 80).length,
      needsImprovement: scores.filter(s => s < 70).length
    };

    const comparativeData = {
      assignmentId,
      totalStudents: analytics.length,
      classAverage: Math.round(classAverage * 100) / 100,
      classMedian: Math.round(classMedian * 100) / 100,
      standardDeviation: Math.round(standardDeviation * 100) / 100,
      percentiles: percentiles.map((p, i) => ({
        percentile: p,
        score: Math.round(percentileValues[i] * 100) / 100
      })),
      distribution,
      scoreRange: {
        min: Math.min(...scores),
        max: Math.max(...scores)
      }
    };

    res.json(comparativeData);
  } catch (error) {
    console.error('Error fetching comparative analytics:', error);
    res.status(500).json({ 
      message: 'Failed to fetch comparative analytics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get time series data for an assignment
router.get('/assignments/:assignmentId/timeline', protect, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId);
    const period = req.query.period as string || 'daily'; // daily, weekly, monthly
    
    if (isNaN(assignmentId)) {
      return res.status(400).json({ message: 'Invalid assignment ID' });
    }

    // Get the assignment (problem set) structure
    const { getDb } = await import('../db');
    const db = getDb();
    
    // Get the problem set (assignment) details - try multiple approaches
    let problemSet = await db.collection('problemsets').findOne({ id: assignmentId.toString() });
    
    // If not found by string ID, try finding by position
    if (!problemSet) {
      const allProblemSets = await db.collection('problemsets').find().toArray();
      
      // Try to find by position (assignmentId - 1 for 0-based index)
      if (allProblemSets.length > 0 && assignmentId > 0 && assignmentId <= allProblemSets.length) {
        problemSet = allProblemSets[assignmentId - 1];
      }
    }
    
    if (!problemSet) {
      return res.status(404).json({ message: 'Assignment not found' });
    }
    
    // Get all problem instances for this assignment
    const problemInstances = problemSet.problemInstances || [];
    const problemIds = problemInstances.map((pi: any) => pi.problemId);
    
    // Get submissions for all problems in this assignment
    const submissions = await Submission.find({ problemId: { $in: problemIds } });
    
    if (submissions.length === 0) {
      return res.status(404).json({ message: 'No analytics data found for this assignment' });
    }

    // Group by time period
    const timelineData = new Map();
    
    submissions.forEach((submission: any) => {
      let dateKey: string;
      const date = new Date(submission.submittedAt);
      
      switch (period) {
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          dateKey = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default: // daily
          dateKey = date.toISOString().split('T')[0];
      }

      if (!timelineData.has(dateKey)) {
        timelineData.set(dateKey, {
          submissions: 0,
          totalScore: 0,
          averageTime: 0,
          totalTime: 0
        });
      }

      const data = timelineData.get(dateKey);
      data.submissions++;
      data.totalScore += submission.score || 0;
      data.totalTime += Math.floor(Math.random() * 30) + 5; // Mock time data
      data.averageTime = data.totalTime / data.submissions;
    });

    const timeline = Array.from(timelineData.entries())
      .map(([date, data]: [string, any]) => ({
        date,
        submissions: data.submissions,
        averageScore: Math.round((data.totalScore / data.submissions) * 100) / 100,
        averageTime: Math.round(data.averageTime * 100) / 100
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      assignmentId,
      period,
      timeline
    });
  } catch (error) {
    console.error('Error fetching timeline data:', error);
    res.status(500).json({ 
      message: 'Failed to fetch timeline data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get question-level analytics for an assignment
router.get('/assignments/:assignmentId/questions', protect, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const assignmentId = parseInt(req.params.assignmentId);
    
    if (isNaN(assignmentId)) {
      return res.status(400).json({ message: 'Invalid assignment ID' });
    }

    // Get the assignment (problem set) structure
    const { getDb } = await import('../db');
    const db = getDb();
    
    // Get the problem set (assignment) details - try multiple approaches
    let problemSet = await db.collection('problemsets').findOne({ id: assignmentId.toString() });
    
    // If not found by string ID, try finding by position
    if (!problemSet) {
      const allProblemSets = await db.collection('problemsets').find().toArray();
      
      // Try to find by position (assignmentId - 1 for 0-based index)
      if (allProblemSets.length > 0 && assignmentId > 0 && assignmentId <= allProblemSets.length) {
        problemSet = allProblemSets[assignmentId - 1];
      }
    }
    
    if (!problemSet) {
      return res.status(404).json({ message: 'Assignment not found' });
    }
    
    // Get all problem instances for this assignment
    const problemInstances = problemSet.problemInstances || [];
    const problemIds = problemInstances.map((pi: any) => pi.originalProblemId || pi.problemId);
    
    // Get submissions for all problems in this assignment
    const submissions = await Submission.find({ problemId: { $in: problemIds } });
    
    if (submissions.length === 0) {
      return res.status(404).json({ message: 'No analytics data found for this assignment' });
    }

    // Aggregate question-level data from problem instances and submissions
    const questionMap = new Map();

    // Initialize map with all problem instances
    (problemInstances as any[]).forEach((problemInstance: any) => {
      const problemId = String(problemInstance.originalProblemId || problemInstance.problemId);
      questionMap.set(problemId, {
        questionId: problemId,
        questionType: 'coding',
        totalAttempts: 0,
        correctAttempts: 0,
        totalScore: 0,
        totalTime: 0,
        difficultyRatings: [],
        feedback: new Set(),
        title: problemInstance.title || `Problem ${problemId}`,
        difficulty: problemInstance.difficulty || 'medium'
      });
    });

    // Aggregate submission data
    submissions.forEach(submission => {
      const problemId = submission.problemId.toString();
      const score = typeof submission.score === 'string' ? parseFloat(submission.score) : (submission.score || 0);
      
      if (questionMap.has(problemId)) {
        const qData = questionMap.get(problemId);
        qData.totalAttempts++;
        if (score >= 70) qData.correctAttempts++;
        qData.totalScore += score;
        qData.totalTime += submission.runtime || 0;
        qData.difficultyRatings.push(score >= 80 ? 1 : score >= 60 ? 2 : 3);
        if (submission.feedback) qData.feedback.add(submission.feedback);
      }
    });

    const questionAnalytics = Array.from(questionMap.values()).map(qData => ({
      questionId: qData.questionId,
      questionType: qData.questionType,
      totalAttempts: qData.totalAttempts,
      correctAttempts: qData.correctAttempts,
      successRate: Math.round((qData.correctAttempts / qData.totalAttempts) * 100 * 100) / 100,
      averageScore: Math.round((qData.totalScore / qData.totalAttempts) * 100) / 100,
      averageTime: Math.round((qData.totalTime / qData.totalAttempts) * 100) / 100,
      averageDifficulty: qData.difficultyRatings.length > 0 
        ? Math.round((qData.difficultyRatings.reduce((sum: number, rating: number) => sum + rating, 0) / qData.difficultyRatings.length) * 100) / 100
        : null,
      commonFeedback: Array.from(qData.feedback).slice(0, 5)
    }));

    res.json({
      assignmentId,
      totalQuestions: questionAnalytics.length,
      questions: questionAnalytics
    });
  } catch (error) {
    console.error('Error fetching question analytics:', error);
    res.status(500).json({ 
      message: 'Failed to fetch question analytics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get analytics overview (Admin only)
router.get('/overview', protect, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Get basic analytics overview data
    const assignments = await AssignmentAnalytics.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          averageScore: { $avg: '$percentageScore' },
          completionRate: { $avg: '$engagementMetrics.completionRate' }
        }
      }
    ]);

    const courses = await AssignmentAnalytics.aggregate([
      {
        $match: { courseId: { $exists: true } }
      },
      {
        $group: {
          _id: null,
          total: { $addToSet: '$courseId' },
          averageScore: { $avg: '$percentageScore' },
          enrollmentRate: { $avg: 85 } // Mock data for now
        }
      }
    ]);

    const students = await AssignmentAnalytics.aggregate([
      {
        $group: {
          _id: null,
          total: { $addToSet: '$userId' },
          averageScore: { $avg: '$percentageScore' },
          improvementRate: { $avg: '$performanceTrends.improvementFromPrevious' }
        }
      }
    ]);

    const overview = {
      assignments: {
        total: assignments.length > 0 ? assignments[0].total : 0,
        active: assignments.length > 0 ? Math.round(assignments[0].total * 0.8) : 0,
        averageScore: assignments.length > 0 ? Math.round(assignments[0].averageScore) : 0,
        completionRate: assignments.length > 0 ? Math.round(assignments[0].completionRate) : 0
      },
      courses: {
        total: courses.length > 0 ? courses[0].total.length : 0,
        active: courses.length > 0 ? Math.round(courses[0].total.length * 0.9) : 0,
        averageScore: courses.length > 0 ? Math.round(courses[0].averageScore) : 0,
        enrollmentRate: courses.length > 0 ? Math.round(courses[0].enrollmentRate) : 0
      },
      students: {
        total: students.length > 0 ? students[0].total.length : 0,
        active: students.length > 0 ? Math.round(students[0].total.length * 0.7) : 0,
        averageScore: students.length > 0 ? Math.round(students[0].averageScore) : 0,
        improvementRate: students.length > 0 ? Math.round(students[0].improvementRate) : 0
      }
    };

    res.json(overview);
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    res.status(500).json({ 
      message: 'Failed to fetch analytics overview',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Debug endpoint to see what submissions exist
router.get('/debug/submissions', protect, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const submissions = await Submission.find({}).limit(10);
    const sampleSubmission = submissions.length > 0 ? submissions[0] : null;
    
    res.json({
      totalSubmissions: await Submission.countDocuments({}),
      sampleSubmission,
      allSubmissions: submissions
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ message: 'Debug failed', error: (error as any).message });
  }
});

// Export analytics data (Admin only)
router.get('/export/:type/:id', protect, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { type, id } = req.params;
    const format = req.query.format as string || 'json';

    let data: any;

    switch (type) {
      case 'assignment':
        const assignmentId = parseInt(id);
        if (isNaN(assignmentId)) {
          return res.status(400).json({ message: 'Invalid assignment ID' });
        }
        data = await AssignmentAnalyticsService.generateAssignmentAnalytics(assignmentId);
        break;
      
      case 'course':
        const courseId = parseInt(id);
        if (isNaN(courseId)) {
          return res.status(400).json({ message: 'Invalid course ID' });
        }
        data = await AssignmentAnalyticsService.generateCourseAnalytics(courseId);
        break;
      
      case 'user':
        // Get user's submissions
        const userSubmissions = await Submission.find({ userId: id });
        data = {
          userId: id,
          submissions: userSubmissions,
          totalSubmissions: userSubmissions.length,
          averageScore: userSubmissions.length > 0 ? 
            userSubmissions.reduce((sum, s) => {
              const score = typeof s.score === 'string' ? parseFloat(s.score) : (s.score || 0);
              return sum + score;
            }, 0) / userSubmissions.length : 0
        };
        break;
      
      default:
        return res.status(400).json({ message: 'Invalid export type' });
    }

    if (format === 'csv') {
      // Convert to CSV format (simplified)
      const toCsv = (rows: any[]): string => {
        if (!Array.isArray(rows) || rows.length === 0) return '';
        const headers = Object.keys(rows[0]);
        const lines = [headers.join(',')];
        for (const r of rows) {
          lines.push(headers.map(h => JSON.stringify((r as any)[h] ?? '')).join(','));
        }
        return lines.join('\n');
      };
      const csvData = toCsv((data as any[]) || []);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-${id}-analytics.csv"`);
      res.send(csvData);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-${id}-analytics.json"`);
      res.json(data);
    }
  } catch (error) {
    console.error('Error exporting analytics:', error);
    res.status(500).json({ message: 'Failed to export analytics', error: (error as any).message });
  }
});
export default router;