import { Router } from 'express';
import { protect, requireAdmin, type AuthRequest } from '../middleware/auth.js';
import { VersionHistory } from '../models/VersionHistory.js';

const router = Router();

// Get latest N activities (default 4) for dashboard widgets
router.get('/recent', protect as any, requireAdmin as any, async (req: AuthRequest, res) => {
  try {
    const limit = Math.max(1, Math.min(50, parseInt(String(req.query.limit || '4'), 10)));
    const items = await VersionHistory.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json(items.map((i: any) => ({
      id: i._id?.toString?.() || i.id,
      action: i.action,
      description: i.description,
      entityType: i.entityType,
      entityId: i.entityId,
      metadata: i.metadata,
      adminName: i.adminName,
      adminId: i.adminId?.toString?.() || i.adminId,
      createdAt: i.createdAt,
    })));
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch recent activities', error: error.message });
  }
});

// Full list with filters and pagination
router.get('/', protect as any, requireAdmin as any, async (req: AuthRequest, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(String(req.query.pageSize || '20'), 10)));
    const skip = (page - 1) * pageSize;

    const entityType = req.query.entityType as string | undefined;
    const adminId = req.query.adminId as string | undefined;
    const search = req.query.search as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const query: any = {};
    if (entityType) query.entityType = entityType;
    if (adminId) query.adminId = adminId;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }
    if (search) {
      query.$or = [
        { action: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      VersionHistory.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
      VersionHistory.countDocuments(query),
    ]);

    res.json({
      items: items.map((i: any) => ({
        id: i._id?.toString?.() || i.id,
        action: i.action,
        description: i.description,
        entityType: i.entityType,
        entityId: i.entityId,
        metadata: i.metadata,
        adminName: i.adminName,
        adminId: i.adminId?.toString?.() || i.adminId,
        createdAt: i.createdAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch version history', error: error.message });
  }
});

export default router; 