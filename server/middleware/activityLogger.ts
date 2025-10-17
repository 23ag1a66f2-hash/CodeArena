import { NextFunction, Response } from 'express';
import type { AuthRequest } from './auth';
import { logAdminAction } from '../services/adminActivityLogger';
import { storage } from '../storage';

export function activityLogger() {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const startedAt = Date.now();

    res.on('finish', async () => {
      try {
        // Only log successful mutating requests by admins
        if (!req.user || req.user.role !== 'admin') return;
        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return;
        if (res.statusCode >= 400) return;

        const path = req.originalUrl || req.url;
        const method = req.method;

        let entityType: Parameters<typeof logAdminAction>[1]['entityType'] = 'other';
        let action = `${method} ${path}`;
        let description = action;
        let entityId: string | undefined = undefined;

        const adminName = [req.user?.firstName, req.user?.lastName].filter(Boolean).join(' ').trim() || req.user?.email || 'Admin';

        // Admin users management
        if (path.startsWith('/api/admin/users')) {
          entityType = 'user';
          if (method === 'POST') {
            const full = [req.body?.firstName, req.body?.lastName].filter(Boolean).join(' ');
            action = 'create_user';
            description = `${adminName} created a user${full ? `: ${full}` : ''}${req.body?.email ? ` (${req.body.email})` : ''}`;
          } else if (method === 'PATCH' && path.includes('/role')) {
            action = 'change_user_role';
            entityId = (req.params as any)?.id ? String((req.params as any).id) : undefined;
            description = `${adminName} changed user role${entityId ? ` for user ${entityId}` : ''}${req.body?.role ? ` to ${req.body.role}` : ''}`;
          } else if (method === 'DELETE') {
            action = 'delete_user';
            entityId = (req.params as any)?.id ? String((req.params as any).id) : undefined;
            description = `${adminName} deleted a user${entityId ? `: ${entityId}` : ''}`;
          }
        }

        // Problem sets (act as assignments)
        if (path.startsWith('/api/problem-sets')) {
          entityType = 'problemSet';
          entityId = (req.params as any)?.id ? String((req.params as any).id) : undefined;
          if (method === 'POST' && !entityId) {
            action = 'create_problem_set';
            description = `${adminName} created a problem set${req.body?.title ? `: ${req.body.title}` : ''}`;
          } else if (method === 'PUT') {
            action = 'update_problem_set';
            description = `${adminName} updated a problem set${req.body?.title ? `: ${req.body.title}` : ''}`;
          } else if (method === 'DELETE') {
            action = 'delete_problem_set';
            description = `${adminName} deleted a problem set${entityId ? ` #${entityId}` : ''}`;
          }
        }

        // Course enroll via admin
        if (path.match(/^\/api\/courses\/\d+\/enroll/)) {
          entityType = 'enrollment';
          const courseId = Number((req.params as any)?.id);
          let courseName = '';
          try {
            const course = await storage.getCourse(courseId);
            courseName = (course as any)?.title || '';
          } catch {}
          const targetUserId = req.body?.userId && req.body.userId !== 'self' ? req.body.userId : req.user?.id;
          let targetUserName = '';
          if (targetUserId) {
            try {
              const u = await storage.getUser(String(targetUserId));
              targetUserName = [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim() || u?.email || String(targetUserId);
            } catch {}
          }
          action = 'enroll_user_in_course';
          description = `${adminName} enrolled ${targetUserName || 'a user'} in course${courseName ? `: ${courseName}` : courseId ? ` #${courseId}` : ''}`;
          entityId = String(courseId);
        }

        await logAdminAction(req, {
          action,
          description,
          entityType,
          entityId,
          metadata: {
            statusCode: res.statusCode,
            durationMs: Date.now() - startedAt,
            query: req.query,
            bodyKeys: req.body ? Object.keys(req.body) : [],
          },
        });
      } catch (e) {
        // do not block response
      }
    });

    next();
  };
} 