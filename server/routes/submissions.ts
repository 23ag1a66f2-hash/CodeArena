import { Router } from 'express';
import { protect } from '../middleware/auth';
import { listSubmissions, createSubmission, deleteSubmission } from '../controllers/submissionsController';

const router = Router();

router.get('/', protect as any, listSubmissions as any);
router.post('/', protect as any, createSubmission as any);
router.delete('/:id', protect as any, deleteSubmission as any);

export default router; 