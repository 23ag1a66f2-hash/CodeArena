import { Router, Response } from 'express';
import { protect } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';
import { storage } from '../storage';

const router = Router();

// List assignments (derived from problem sets)
router.get('/', protect as any, (async (_req: AuthRequest, res: Response) => {
  try {
    const assignments = await storage.getAssignments();
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ message: 'Failed to fetch assignments' });
  }
}) as any);

export default router; 