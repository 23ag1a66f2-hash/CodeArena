import { Router } from 'express';
import { protect, requireAdmin } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import {
  getProblems,
  getProblemById,
  createProblem,
  updateProblem,
  getProblemUsage,
  deleteProblem,
  runProblemCode,
  runProblemCodeWithCustomInput,
} from '../controllers/problemsController.js';

// Import execution service for cleanup
import executionService from '../services/executionService.js';

const router = Router();

router.get('/', getProblems);
router.get('/:id', getProblemById);
router.get('/:id/usage', protect as any, requireAdmin as any, getProblemUsage as any);
router.post('/', protect as any, requireAdmin as any, createProblem as any);
router.put('/:id', protect as any, requireAdmin as any, updateProblem as any);
router.delete('/:id', protect as any, requireAdmin as any, deleteProblem as any);
router.post('/run', protect as any, runProblemCode as any);
router.post('/run-custom-input', protect as any, runProblemCodeWithCustomInput as any);

// Manual cleanup endpoint for testing
router.post('/cleanup', protect as any, async (req, res) => {
  try {
    console.log('[PROBLEMS-ROUTE] 🧹 Manual cleanup requested');
    
    // Call the public cleanup method
    const service = await executionService;
    await service.cleanupAllTempFiles();
    
    res.json({ 
      status: 'success',
      message: 'Temporary files cleaned up successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[PROBLEMS-ROUTE] ❌ Manual cleanup failed:', error);
    res.status(500).json({ 
      status: 'error',
      error: error.message 
    });
  }
});

export default router; 
