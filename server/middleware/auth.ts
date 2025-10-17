import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthRequest extends Request {
  user?: any;
}

interface JwtPayload {
  id: string;
  sub?: string;
  role?: string;
}

export const generateToken = (userId: string): string => {
  return jwt.sign(
    { 
      id: userId,
      sub: userId
    }, 
    JWT_SECRET, 
    { expiresIn: '7d' }
  );
};

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let token;

    console.log('[DEBUG] 🔐 Auth middleware - checking for token');
    console.log('[DEBUG] 🔐 Request URL:', req.originalUrl);
    console.log('[DEBUG] 🔐 Authorization header:', req.headers.authorization);

    // Check for token in Authorization header only
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('[DEBUG] Token found in Authorization header');
    }

    if (!token) {
      console.log('[DEBUG] No token found in request');
      return res.status(401).json({ 
        message: 'Authentication required. Please log in.',
        code: 'NO_TOKEN'
      });
    }

    try {
      // Verify token
      console.log('[DEBUG] Verifying token:', token.substring(0, 20) + '...');
      console.log('[DEBUG] JWT_SECRET exists:', !!JWT_SECRET);
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      console.log('[DEBUG] Token decoded successfully:', decoded);
      
      if (!decoded.id && !decoded.sub) {
        console.log('[DEBUG] Invalid token format - missing id/sub:', decoded);
        return res.status(401).json({ 
          message: 'Invalid token format',
          code: 'INVALID_TOKEN_FORMAT'
        });
      }

      // Get user from database
      const userId = decoded.id || decoded.sub;
      console.log('[DEBUG] Looking up user with ID:', userId);
      
      const user = await User.findById(userId)
        .select('-password')
        .lean()
        .exec();

      if (!user) {
        console.log('[DEBUG] User not found in database for ID:', userId);
        return res.status(401).json({ 
          message: 'User not found or deactivated',
          code: 'USER_NOT_FOUND'
        });
      }

      console.log('[DEBUG] User found in database:', {
        id: user._id,
        email: user.email,
        role: user.role
      });
      
      // Attach user to request
      req.user = {
        ...user,
        id: user._id.toString(),
        sub: user._id.toString(),
        claims: {
          sub: user._id.toString(),
          role: user.role
        }
      };

      console.log('[DEBUG] User attached to request successfully');

      next();
    } catch (jwtError) {
      console.error('[DEBUG] JWT Verification Error:', jwtError);
      console.error('[DEBUG] JWT Error details:', {
        name: jwtError instanceof Error ? jwtError.name : 'Unknown',
        message: jwtError instanceof Error ? jwtError.message : String(jwtError)
      });
      return res.status(401).json({ 
        message: 'Session expired. Please log in again.',
        code: 'INVALID_TOKEN'
      });
    }
  } catch (error) {
    console.error('[DEBUG] Auth Middleware Error:', error);
    res.status(500).json({ 
      message: 'Internal server error during authentication',
      code: 'AUTH_ERROR'
    });
  }
};

// Middleware to check if user is admin
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      message: 'Access denied. Admin privileges required.',
      code: 'ADMIN_REQUIRED'
    });
  }
  next();
};