import { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import executionService from '../services/executionService.js';
import { Submission } from '../models/Submission.js';
import { Problem as ProblemModel } from '../models/Problem.js';
import { ProblemSet } from '../models/ProblemSet.js';
import mongoose from 'mongoose';

export async function listSubmissions(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User ID not found' });
    }

    const problemId = req.query.problemId ? parseInt(req.query.problemId as string) : undefined;
    const query: any = { userId };
    if (problemId !== undefined) query.problemId = problemId;

    const submissions = await Submission.find(query).sort({ submittedAt: -1 }).lean();
    res.json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ message: 'Failed to fetch submissions' });
  }
}

export async function createSubmission(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required. Please log in to submit solutions.' });
    }

    const { problemId, code, language, problemInstanceId, problemSetId } = req.body as any;

    // Resolve problem data and test cases. Support assignment instances with no original problem (id=0)
    let problem: any = await ProblemModel.findOne({ id: problemId }).lean();
    let testCases: any[] = [];
    let resolvedProblemSetId = problemSetId; // Track the resolved problem set ID

    if (problem && Array.isArray((problem as any).testCases)) {
      testCases = (problem as any).testCases;
    } else if (problemInstanceId) {
      // Fallback to problem instance inside a problem set
      let ps: any = null;
      if (problemSetId) {
        ps = await ProblemSet.findOne({ id: problemSetId }).lean();
        if (!ps) {
          try { ps = await ProblemSet.findById(problemSetId).lean(); } catch {}
        }
      }
      // If still not found, try to locate by scanning for the problem instance
      if (!ps) {
        ps = await ProblemSet.findOne({ 'problemInstances._id': problemInstanceId }).lean();
        if (ps) {
          // Found the problem set, use its ID
          resolvedProblemSetId = ps.id || ps._id;
          console.log(`[SUBMISSION] Resolved problemSetId: ${resolvedProblemSetId} from problemInstanceId: ${problemInstanceId}`);
        }
      }

      if (!ps) {
        return res.status(404).json({ message: 'Problem set or problem instance not found' });
      }

      const instance = (ps.problemInstances || ps.problems || []).find((p: any) => String(p.id || p._id) === String(problemInstanceId));
      if (!instance) {
        return res.status(404).json({ message: 'Problem instance not found' });
      }

      // Compose a pseudo problem object from instance for metadata
      problem = {
        id: Number.isFinite(problemId) ? problemId : (instance.originalProblemId || instance.selectedProblemId || 0),
        title: instance.title || 'Untitled Problem',
        description: instance.description || '',
        difficulty: instance.difficulty || 'medium',
      };
      testCases = instance.customTestCases || instance.testCases || [];
      if (!Array.isArray(testCases) || testCases.length === 0) {
        return res.status(400).json({ message: 'No test cases available for this problem instance' });
      }
    } else {
      return res.status(404).json({ message: 'Problem not found' });
    }

    const execService = await executionService;
    const result = await execService.executeWithTestCases(code, language, testCases);

    const formattedResults = result.testResults.map((testResult: any, index: number) => ({
      status: testResult.error ? 'error' : testResult.passed ? 'success' : 'failed',
      output: testResult.actualOutput,
      error: testResult.error,
      runtime: testResult.runtime,
      memory: testResult.memory,
      input: testResult.input,
      expectedOutput: testResult.expectedOutput,
      isHidden: testResult.isHidden || false,
      testCaseNumber: index + 1,
      passed: testResult.passed,
    }));

    const passedCount = result.testResults.filter((r: any) => r.passed).length;
    const totalTestCases = result.testResults.length;
    const allPassed = result.allTestsPassed;
    const score = ((passedCount / totalTestCases) * 100).toFixed(2);
    const status = allPassed ? 'accepted' : passedCount > 0 ? 'partial' : 'wrong_answer';
    const feedback = allPassed ? 'All test cases passed!' : `${passedCount}/${totalTestCases} test cases passed`;

    // Check for existing submission to overwrite (for assignments)
    let existingSubmission = null;
    let isNewSubmission = true;
    
    if (resolvedProblemSetId || problemInstanceId) {
      // For assignments, try to find existing submission
      const query: any = { userId, problemId };
      if (resolvedProblemSetId) query.problemSetId = resolvedProblemSetId;
      if (problemInstanceId) query.problemInstanceId = problemInstanceId;
      
      existingSubmission = await Submission.findOne(query);
      
      if (existingSubmission) {
        console.log(`[SUBMISSION] Found existing submission ${existingSubmission.id} for user ${userId}, problem ${problemId}, will overwrite`);
        isNewSubmission = false;
      }
    }

    let submission;
    let submissionId;

    if (existingSubmission && !isNewSubmission) {
      // Update existing submission
      const previousStatus = existingSubmission.status;
      const wasAccepted = previousStatus === 'accepted';
      
      // Update the existing submission
      existingSubmission.code = code;
      existingSubmission.language = language;
      existingSubmission.status = status;
      existingSubmission.runtime = result.runtime;
      existingSubmission.memory = result.memory;
      existingSubmission.score = score;
      existingSubmission.feedback = feedback;
      existingSubmission.testResults = formattedResults;
      existingSubmission.submittedAt = new Date();
      
      // Ensure problemSetId is set if it was missing
      if (resolvedProblemSetId && !existingSubmission.problemSetId) {
        existingSubmission.problemSetId = resolvedProblemSetId;
      }
      
      await existingSubmission.save();
      submission = existingSubmission;
      submissionId = existingSubmission.id;
      
      console.log(`[SUBMISSION] Updated existing submission ${submissionId} for user ${userId}, problem ${problemId}`);
    } else {
      // Create new submission
      const last = await Submission.findOne({}, {}, { sort: { id: -1 } }).lean();
      const nextId = (last?.id || 0) + 1;

      const submissionData: any = {
        id: nextId,
        problemId,
        problemInstanceId,
        problemSetId: resolvedProblemSetId, // Use the resolved problem set ID
        userId,
        code,
        language,
        status,
        runtime: result.runtime,
        memory: result.memory,
        score,
        feedback,
        testResults: formattedResults,
        submittedAt: new Date(),
      };

      submission = await Submission.create(submissionData);
      submissionId = submission.id;
      console.log(`[SUBMISSION] Created new submission ${submissionId} for user ${userId}, problem ${problemId}, problemSetId: ${resolvedProblemSetId}`);
    }

    // Update ProblemSetEnrollment for assignments
    if (resolvedProblemSetId || problemInstanceId) {
      try {
        const { ProblemSetEnrollment } = await import('../models/ProblemSetEnrollment');
        const { ProblemSet } = await import('../models/ProblemSet');
        
        // Determine the actual problemSetId if we only have problemInstanceId
        let actualProblemSetId = resolvedProblemSetId;
        if (!actualProblemSetId && problemInstanceId) {
          const ps = await ProblemSet.findOne({ 'problemInstances._id': problemInstanceId }).lean();
          if (ps) {
            actualProblemSetId = ps.id || ps._id;
          }
        }
        
        if (actualProblemSetId) {
          // Find the problem set to get total problems count
          const ps = await ProblemSet.findOne({ id: actualProblemSetId }).lean();
          if (ps) {
            const totalProblems = ps.problemInstances?.length || (ps as any).problems?.length || 0;
            
            // Find and update the enrollment
            const enrollment = await ProblemSetEnrollment.findOne({ 
              problemSetId: actualProblemSetId, 
              userId: new mongoose.Types.ObjectId(userId) 
            });
            
            if (enrollment) {
              // Handle submission count updates
              if (isNewSubmission) {
                // New submission - increment total submissions
                enrollment.totalSubmissions += 1;
              } else {
                // Existing submission - check if status changed
                const previousStatus = existingSubmission?.status;
                const wasAccepted = previousStatus === 'accepted';
                const isNowAccepted = status === 'accepted';
                
                // Update correct submissions count based on status change
                if (wasAccepted && !isNowAccepted) {
                  // Was accepted, now not - decrement correct submissions
                  enrollment.correctSubmissions = Math.max(0, enrollment.correctSubmissions - 1);
                  
                  // Remove from completed problems if no longer accepted
                  const actualProblemId = problem.id || problemId;
                  enrollment.completedProblems = enrollment.completedProblems.filter(id => id !== actualProblemId);
                } else if (!wasAccepted && isNowAccepted) {
                  // Was not accepted, now is - increment correct submissions
                  enrollment.correctSubmissions += 1;
                  
                  // Add to completed problems
                  const actualProblemId = problem.id || problemId;
                  if (!enrollment.completedProblems.includes(actualProblemId)) {
                    enrollment.completedProblems.push(actualProblemId);
                  }
                }
                // If status didn't change (e.g., both were accepted), no need to update counts
              }
              
              // Calculate new progress based on completed problems
              const progress = totalProblems > 0 ? Math.min(100, Math.round((enrollment.completedProblems.length / totalProblems) * 100)) : 0;
              enrollment.progress = progress;
              
              // Update last activity
              (enrollment as any).updatedAt = new Date();
              
              await enrollment.save();
              
              console.log(`[ENROLLMENT] Updated enrollment for user ${userId} in problem set ${actualProblemSetId}: status=${status}, progress=${progress}%, completed=${enrollment.completedProblems.length}/${totalProblems}, totalSubmissions=${enrollment.totalSubmissions}, correctSubmissions=${enrollment.correctSubmissions}`);
            }
          }
        }
      } catch (enrollmentError) {
        console.error('Failed to update enrollment after submission:', enrollmentError);
        // Don't fail the submission if enrollment update fails
      }
    }

    res.status(201).json({
      ...submission.toObject(),
      results: formattedResults,
      summary: {
        totalTests: totalTestCases,
        passedTests: passedCount,
        failedTests: totalTestCases - passedCount,
        allPassed,
        problemTitle: (problem as any).title || `Problem ${problemId}`,
        difficulty: (problem as any).difficulty || 'N/A',
        mode: 'submit',
      },
      testResults: formattedResults,
      passedCount,
      totalTestCases,
    });
  } catch (error) {
    console.error('Error creating submission:', error);
    res.status(500).json({ message: 'Failed to create submission' });
  }
}

// Helper function to cleanup enrollment after submission deletion
async function cleanupEnrollmentAfterSubmissionDeletion(submission: any) {
  try {
    const { ProblemSetEnrollment } = await import('../models/ProblemSetEnrollment');
    const { ProblemSet } = await import('../models/ProblemSet');
    
    // Determine the problemSetId from the submission
    let problemSetId = submission.problemSetId;
    if (!problemSetId && submission.problemInstanceId) {
      const ps = await ProblemSet.findOne({ 'problemInstances._id': submission.problemInstanceId }).lean();
      if (ps) {
        problemSetId = ps.id || ps._id;
      }
    }
    
    if (problemSetId) {
      const enrollment = await ProblemSetEnrollment.findOne({ 
        problemSetId, 
        userId: submission.userId 
      });
      
      if (enrollment) {
        // Decrement total submissions
        enrollment.totalSubmissions = Math.max(0, enrollment.totalSubmissions - 1);
        
        // If the deleted submission was accepted, decrement correct submissions and remove from completed problems
        if (submission.status === 'accepted') {
          enrollment.correctSubmissions = Math.max(0, enrollment.correctSubmissions - 1);
          
          const problemId = submission.problemId;
          enrollment.completedProblems = enrollment.completedProblems.filter(id => id !== problemId);
        }
        
        // Recalculate progress
        const ps = await ProblemSet.findOne({ id: problemSetId }).lean();
        if (ps) {
          const totalProblems = ps.problemInstances?.length || (ps as any).problems?.length || 0;
          const progress = totalProblems > 0 ? Math.min(100, Math.round((enrollment.completedProblems.length / totalProblems) * 100)) : 0;
          enrollment.progress = progress;
        }
        
        // Update timestamp
        (enrollment as any).updatedAt = new Date();
        
        await enrollment.save();
        
        console.log(`[ENROLLMENT] Cleaned up enrollment after submission deletion: user ${submission.userId}, problem set ${problemSetId}, progress=${enrollment.progress}%, completed=${enrollment.completedProblems.length}, totalSubmissions=${enrollment.totalSubmissions}, correctSubmissions=${enrollment.correctSubmissions}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up enrollment after submission deletion:', error);
  }
}

export async function deleteSubmission(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const submissionId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Find the submission
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }
    
    // Check if user can delete this submission (owner or admin)
    if (submission.userId !== userId && userRole !== 'admin') {
      return res.status(403).json({ message: 'You can only delete your own submissions' });
    }
    
    // Clean up enrollment before deleting
    await cleanupEnrollmentAfterSubmissionDeletion(submission);
    
    // Delete the submission
    await Submission.findByIdAndDelete(submissionId);
    
    console.log(`[SUBMISSION] Deleted submission ${submissionId} for user ${userId}`);
    
    res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    console.error('Error deleting submission:', error);
    res.status(500).json({ message: 'Failed to delete submission' });
  }
} 