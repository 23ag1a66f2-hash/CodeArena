import type { AuthRequest } from '../middleware/auth.js';
import { VersionHistory } from '../models/VersionHistory.js';

interface LogParams {
  action: string;
  entityType:
    | 'problem'
    | 'problemSet'
    | 'course'
    | 'courseModule'
    | 'user'
    | 'contest'
    | 'enrollment'
    | 'announcement'
    | 'other';
  entityId?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export async function logAdminAction(req: AuthRequest, params: LogParams): Promise<void> {
  try {
    const adminId = req.user?.id;
    if (!adminId) return;

    const adminName = [req.user?.firstName, req.user?.lastName].filter(Boolean).join(' ').trim() || req.user?.email || 'Admin';

    await VersionHistory.create({
      action: params.action,
      description: params.description,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata,
      adminId,
      adminName,
    } as any);
  } catch (error) {
    console.error('[VersionHistory] Failed to log admin action:', params, error);
  }
} 