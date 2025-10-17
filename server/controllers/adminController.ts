import { Request, Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { Problem } from '../models/Problem';
import { Submission } from '../models/Submission';
import crypto from 'crypto';

export async function listUsers(req: AuthRequest, res: Response) {
  try {
    const users = await User.find({}).select('-password').lean();
    res.json(users.map(u => ({
      id: u._id.toString(),
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      createdAt: u.createdAt,
    })));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
}

export async function createUser(req: AuthRequest, res: Response) {
  try {
    const { email, firstName, lastName, role, password } = req.body as {
      email: string;
      firstName: string;
      lastName: string;
      role?: 'student' | 'admin';
      password?: string;
    };

    if (!email || !firstName || !lastName) {
      return res.status(400).json({ message: 'email, firstName, and lastName are required' });
    }

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    const newUser = new User({
      email,
      firstName,
      lastName,
      role: role && ['student', 'admin'].includes(role) ? role : 'student',
      password: password && password.trim().length >= 6 ? password : crypto.randomBytes(12).toString('hex'),
    } as any);

    const saved = await newUser.save();

    res.status(201).json({
      id: saved._id.toString(),
      email: saved.email,
      firstName: saved.firstName,
      lastName: saved.lastName,
      role: saved.role,
      createdAt: saved.createdAt,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create user', error: error?.message });
  }
}

export async function deleteUser(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const deleted = await User.findByIdAndDelete(id).lean();
    if (!deleted) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete user' });
  }
}

export async function updateUserRole(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { role } = req.body as { role: 'student' | 'admin' };
    if (!['student', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const updated = await User.findByIdAndUpdate(id, { $set: { role } }, { new: true }).select('-password').lean();
    if (!updated) return res.status(404).json({ message: 'User not found' });
    res.json({
      id: updated._id.toString(),
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      role: updated.role,
      createdAt: updated.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user role' });
  }
}

export async function analyticsSummary(req: AuthRequest, res: Response) {
  try {
    const [totalUsers, totalProblems, totalSubmissions] = await Promise.all([
      User.countDocuments({}),
      Problem.countDocuments({}),
      Submission.countDocuments({}),
    ]);
    res.json({
      totalUsers,
      totalProblems,
      totalSubmissions,
      activeContests: 0,
      recentActivity: [],
      submissionStats: { accepted: 0, error: 0, pending: 0 },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch analytics summary' });
  }
} 