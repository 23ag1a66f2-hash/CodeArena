import { Request, Response } from 'express';
// FIX: Added .js extensions to all local/relative imports
import type { AuthRequest } from '../middleware/auth.js';
import { storage } from '../storage.js';
import { insertProblemSchema } from '../shared-schema.js';
import { z } from 'zod';
import { executionServicePromise } from '../services/executionService.js';

export async function getProblems(req: Request, res: Response) {
  try {
    const problems = await storage.getProblems();
    res.json(problems);
  } catch (error) {
    console.error('Error fetching problems:', error);
    res.status(500).json({ message: 'Failed to fetch problems' });
  }
}

export async function getProblemById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const problem = await storage.getProblem(id);
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }
    res.json(problem);
  } catch (error) {
    console.error('Error fetching problem:', error);
    res.status(500).json({ message: 'Failed to fetch problem' });
  }
}

export async function createProblem(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      console.error('[DEBUG] No user ID found in request:', req.user);
      return res.status(401).json({ message: 'User ID not found' });
    }

    // CRITICAL FIX: Revert to a method that works with the current storage layer
    // Find the highest existing problemNumber by fetching all problems and processing them in memory.
    const allProblems = await storage.getProblems();
    
    const maxProblemNumber = allProblems.reduce((max: number, p: any) => {
      // Safely get the problemNumber, defaulting to 0 if it doesn't exist
      const num = typeof p.problemNumber === 'number' ? p.problemNumber : 0;
      return num > max ? num : max;
    }, 0);
    
    const newProblemNumber = maxProblemNumber + 1;

    // Validate and ensure problemNumber is present
    const validatedData = {
      ...req.body,
      createdBy: userId,
      problemNumber: newProblemNumber, // Assign the new, unique problem number
    };

    console.log('[DEBUG] Creating problem with data:', validatedData);

    const problem = await storage.createProblem(validatedData);
    res.status(201).json(problem);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    console.error('Error creating problem:', error);
    res.status(500).json({ message: 'Failed to create problem' });
  }
}
export async function updateProblem(req: AuthRequest, res: Response) {
  try {
    const problemId = parseInt(req.params.id);
    const userId = req.user?.id;

    if (!userId) {
      console.error('[DEBUG] No user ID found in request:', req.user);
      return res.status(401).json({ message: 'User ID not found' });
    }

    // First check if the problem exists
    const existingProblem = await storage.getProblem(problemId);
    if (!existingProblem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    // Validate the update data
    const validatedData = insertProblemSchema.parse({
      ...req.body,
      updatedBy: userId,
      updatedAt: new Date(),
    });

    console.log('[DEBUG] Updating problem:', { problemId, data: validatedData });

    // Update the problem
    const updatedProblem = await storage.updateProblem(problemId, validatedData);
    if (!updatedProblem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    console.log('[DEBUG] Problem updated successfully:', updatedProblem);
    res.json(updatedProblem);
  } catch (error) {
    console.error('[DEBUG] Error updating problem:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    res.status(500).json({ message: 'Failed to update problem' });
  }
}

export async function getProblemUsage(req: AuthRequest, res: Response) {
  try {
    const problemId = parseInt(req.params.id);
    const problemSets = await storage.getProblemSets();

    const usageSets = problemSets.filter(
      (set: any) => set.problemIds && set.problemIds.includes(problemId.toString())
    );

    res.json({
      problemSetCount: usageSets.length,
      problemSets: usageSets.map((set: any) => ({
        id: set.id,
        title: set.title,
      })),
    });
  } catch (error) {
    console.error('Error checking problem usage:', error);
    res.status(500).json({ message: 'Failed to check problem usage' });
  }
}

export async function deleteProblem(req: AuthRequest, res: Response) {
  try {
    const problemId = parseInt(req.params.id);

    // First check if the problem exists
    const existingProblem = await storage.getProblem(problemId);
    if (!existingProblem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    console.log('[DEBUG] Deleting problem:', problemId);

    // Remove problem from all problem sets
    const problemSets = await storage.getProblemSets();
    let updatedSets = 0;

    for (const set of problemSets) {
      let setUpdated = false;
      const updatedSet: any = { ...set };

      // Handle legacy problemIds system
      if (set.problemIds && set.problemIds.includes(problemId.toString())) {
        console.log(
          `[DEBUG] Removing problem ${problemId} from legacy problemIds in set: ${set.title}`
        );
        updatedSet.problemIds = set.problemIds.filter(
          (pid: string) => pid !== problemId.toString()
        );
        setUpdated = true;
      }

      // Handle new problemInstances system
      if (set.problemInstances && set.problemInstances.length > 0) {
        const initialCount = set.problemInstances.length;

        // Remove instances that reference this problem as originalProblemId
        updatedSet.problemInstances = set.problemInstances.filter(
          (instance: any) => instance.originalProblemId !== problemId
        );

        if (updatedSet.problemInstances.length !== initialCount) {
          setUpdated = true;
          console.log(
            `[DEBUG] Removed ${initialCount - updatedSet.problemInstances.length} instances from set: ${set.title}`
          );
        }
      }

      // Update the problem set if changes were made
      if (setUpdated) {
        // Recalculate total problems
        const legacyCount = updatedSet.problemIds?.length || 0;
        const instanceCount = updatedSet.problemInstances?.length || 0;
        updatedSet.totalProblems = legacyCount + instanceCount;

        await storage.updateProblemSet(set.id, updatedSet);
        updatedSets++;
        console.log(
          `[DEBUG] Updated problem set: ${set.title}, new total problems: ${updatedSet.totalProblems}`
        );
      }
    }

    console.log(
      `[DEBUG] Updated ${updatedSets} problem sets after removing problem ${problemId}`
    );

    // Delete the problem from storage
    await storage.deleteProblem(problemId);

    console.log(
      `[DEBUG] Successfully deleted problem ${problemId} and cleaned up ${updatedSets} problem sets`
    );
    res.status(204).send();
  } catch (error) {
    console.error('[DEBUG] Error deleting problem:', error);
    res.status(500).json({ message: 'Failed to delete problem' });
  }
}

export async function runProblemCode(req: AuthRequest, res: Response) {
  try {
    console.log('🚀 [MAIN-SERVER] Processing execution request (RUN CODE)');

    const { code, language, problemId, testCases } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: 'Missing required fields: code and language' });
    }

    let casesToRun = testCases || [];

    if (problemId && !testCases) {
      try {
        const problem = await storage.getProblem(problemId);
        if (!problem || !problem.testCases || problem.testCases.length === 0) {
          throw new Error('No test cases found for this problem');
        }
        casesToRun = problem.testCases.filter((testCase: any) => !testCase.isHidden);
        console.log(
          `[MAIN-SERVER] Running ${casesToRun.length} visible test cases out of ${problem.testCases.length} total`
        );
      } catch (error: any) {
        console.error('❌ [MAIN-SERVER] Failed to fetch problem:', error);
        return res.status(404).json({
          error: error.message || 'Problem not found',
          results: [],
        });
      }
    }

    if (casesToRun.length === 0) {
      return res.status(400).json({
        error: 'No visible test cases available for this problem',
        results: [],
      });
    }

    console.log(`✅ [MAIN-SERVER] Running ${casesToRun.length} visible test cases for ${language} code`);

    // Use the main server's execution service
    const executionService = await executionServicePromise;
    const result = await executionService.executeWithTestCases(code, language, casesToRun);

    const response = {
      results: result.testResults.map((testResult: any, index: number) => ({
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
      })),
      summary: {
        totalTests: result.testResults.length,
        passedTests: result.testResults.filter((r: any) => r.passed).length,
        failedTests: result.testResults.filter((r: any) => !r.passed).length,
        allPassed: result.allTestsPassed,
        problemTitle: problemId ? `Problem ${problemId}` : 'Custom Execution',
        difficulty: 'N/A',
        mode: 'run',
      },
    } as const;

    console.log('✅ [MAIN-SERVER] Run Code execution completed successfully');
    res.json(response);
  } catch (error: any) {
    console.error('❌ [MAIN-SERVER] Route error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      output: error.message,
    });
  }
}

export async function runProblemCodeWithCustomInput(req: AuthRequest, res: Response) {
  try {
    console.log('🚀 [MAIN-SERVER] Processing custom input execution request');

    const { code, language, customInput } = req.body;

    if (!code || !language || !customInput) {
      return res.status(400).json({
        error: 'Missing required fields: code, language, and customInput'
      });
    }

    console.log(`✅ [MAIN-SERVER] Executing ${language} code with custom input`);

    const executionService = await executionServicePromise;
    const result = await executionService.executeWithCustomInput(code, language, customInput);

    const response = {
      status: result.error ? 'error' : 'success',
      output: result.output,
      error: result.error,
      runtime: result.runtime,
      memory: result.memory,
      input: result.input,
      mode: 'custom_input',
    };

    console.log('✅ [MAIN-SERVER] Custom input execution completed successfully');
    res.json(response);
  } catch (error: any) {
    console.error('❌ [MAIN-SERVER] Custom input execution error:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      output: error.message,
    });
  }
}