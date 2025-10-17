import { Router } from 'express';
import { protect, requireAdmin } from '../middleware/auth';
import { getModuleById, createModule, updateModule, deleteModule, executeModule } from '../controllers/modulesController';

const router = Router();

router.get('/:id', getModuleById as any);
router.post('/courses/:id', protect as any, requireAdmin as any, createModule as any);
router.put('/:id', protect as any, requireAdmin as any, updateModule as any);
router.delete('/:id', protect as any, requireAdmin as any, deleteModule as any);
router.post('/execute', protect as any, executeModule as any);

export default router; 