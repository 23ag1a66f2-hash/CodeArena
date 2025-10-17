import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { MaintenanceConfig } from '../models/MaintenanceConfig.js';
import mongoose from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Check if database is connected
function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

// Cache for maintenance config to avoid database calls on every request
let maintenanceConfigCache: any = {
  isMaintenanceMode: false,
  maintenanceFrom: '',
  maintenanceTo: '',
  isMaintenanceActive: false,
  isPreMaintenanceWarning: false,
  lastUpdated: new Date()
};

// Cache refresh interval (5 seconds)
const CACHE_REFRESH_INTERVAL = 1000; // 1 second for faster updates
let lastCacheRefresh = 0;

// Initialize maintenance config from database
async function initializeMaintenanceConfig() {
  try {
    let config = await MaintenanceConfig.findOne().lean().exec();
    
    if (!config) {
      // Create default config if none exists
      const newConfig = await MaintenanceConfig.create({
        isMaintenanceMode: false,
        maintenanceFrom: '',
        maintenanceTo: '',
        isMaintenanceActive: false,
        isPreMaintenanceWarning: false,
        updatedBy: 'system'
      });
      config = newConfig.toObject();
    }
    
    maintenanceConfigCache = {
      isMaintenanceMode: config.isMaintenanceMode,
      maintenanceFrom: config.maintenanceFrom,
      maintenanceTo: config.maintenanceTo,
      isMaintenanceActive: config.isMaintenanceActive,
      isPreMaintenanceWarning: config.isPreMaintenanceWarning,
      lastUpdated: config.lastUpdated
    };
  } catch (error) {
    console.error('Error initializing maintenance config:', error);
  }
}

// Refresh cache from database
async function refreshMaintenanceConfig() {
  const now = Date.now();
  if (now - lastCacheRefresh < CACHE_REFRESH_INTERVAL) {
    return; // Don't refresh too frequently
  }
  
  try {
    if (!isDatabaseConnected() || !MaintenanceConfig) {
      return;
    }
    
    const config = await MaintenanceConfig.findOne().lean().exec();
    
    if (config) {
      maintenanceConfigCache = {
        isMaintenanceMode: config.isMaintenanceMode,
        maintenanceFrom: config.maintenanceFrom,
        maintenanceTo: config.maintenanceTo,
        isMaintenanceActive: config.isMaintenanceActive,
        isPreMaintenanceWarning: config.isPreMaintenanceWarning,
        lastUpdated: config.lastUpdated
      };
      lastCacheRefresh = now;
    }
  } catch (error) {
    console.error('Error refreshing maintenance config:', error);
  }
}

// Calculate maintenance status based on current time
function calculateMaintenanceStatus(): { isActive: boolean; isWarning: boolean } {
  // If maintenance mode is off, return inactive
  if (!maintenanceConfigCache.isMaintenanceMode) {
    return { isActive: false, isWarning: false };
  }

  // If maintenance mode is on but no times set, return inactive
  if (!maintenanceConfigCache.maintenanceFrom || !maintenanceConfigCache.maintenanceTo) {
    return { isActive: false, isWarning: false };
  }

  const now = new Date();
  const fromTime = new Date(`${now.toDateString()} ${maintenanceConfigCache.maintenanceFrom}`);
  const toTime = new Date(`${now.toDateString()} ${maintenanceConfigCache.maintenanceTo}`);
  
  // If maintenance times are for tomorrow
  if (fromTime <= now) {
    fromTime.setDate(fromTime.getDate() + 1);
    toTime.setDate(toTime.getDate() + 1);
  }

  const minutesUntilStart = Math.floor((fromTime.getTime() - now.getTime()) / (1000 * 60));
  const minutesUntilEnd = Math.floor((toTime.getTime() - now.getTime()) / (1000 * 60));

  // Check if we're in pre-maintenance warning period (30 minutes before)
  const isWarning = minutesUntilStart <= 30 && minutesUntilStart > 0;
  
  // Check if we're in active maintenance period
  // For immediate activation: if maintenance mode is on and times are set, make it active
  const isActive = (minutesUntilStart <= 0 && minutesUntilEnd > 0) || 
                  (maintenanceConfigCache.isMaintenanceMode && maintenanceConfigCache.maintenanceFrom && maintenanceConfigCache.maintenanceTo);

  return { isActive, isWarning };
}

// Format time for display
function formatTime(timeString: string): string {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
}

// Check if user is admin
async function isAdminUser(req: Request): Promise<boolean> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.id || decoded.sub;

    if (!userId) {
      return false;
    }

    const user = await User.findById(userId).select('role').lean().exec();
    return user?.role === 'admin';
  } catch (error) {
    return false;
  }
}

// Main maintenance middleware
export async function maintenanceMiddleware(req: Request, res: Response, next: NextFunction) {
  // Ensure maintenance config is initialized
  if (!maintenanceConfigCache.lastUpdated) {
    console.log('Maintenance config not initialized, initializing now...');
    try {
      await initializeMaintenanceConfig();
    } catch (error) {
      console.error('Failed to initialize maintenance config in middleware:', error);
    }
  }
  
  // Refresh cache periodically
  await refreshMaintenanceConfig();
  
  const { isActive, isWarning } = calculateMaintenanceStatus();
  
  // Update cache with calculated values
  maintenanceConfigCache.isMaintenanceActive = isActive;
  maintenanceConfigCache.isPreMaintenanceWarning = isWarning;

  // If maintenance is active, check if user is admin
  if (isActive) {
    // Allow admin routes, health check, maintenance status, and admin users to pass through
    if (req.path.startsWith('/api/admin') || 
        req.path.startsWith('/admin') || 
        req.path === '/api/health' ||
        req.path === '/api/admin/maintenance/status') {
      return next();
    }

    const isAdmin = await isAdminUser(req);
    console.log('Maintenance Middleware Debug:', {
      path: req.path,
      isAdmin,
      isActive,
      userAgent: req.headers['user-agent']
    });
    
    if (isAdmin) {
      console.log('Admin user bypassing maintenance mode');
      return next();
    }

    // Block non-admin users with maintenance message
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'We are upgrading a few things and will be back between ' + 
               formatTime(maintenanceConfigCache.maintenanceFrom) + ' and ' + 
               formatTime(maintenanceConfigCache.maintenanceTo) + '.',
      maintenance: {
        isActive: true,
        from: maintenanceConfigCache.maintenanceFrom,
        to: maintenanceConfigCache.maintenanceTo,
        estimatedEnd: maintenanceConfigCache.maintenanceTo
      }
    });
  }

  // Add warning headers if in warning period
  if (isWarning) {
    res.set({
      'X-Maintenance-Warning': 'true',
      'X-Maintenance-Start': maintenanceConfigCache.maintenanceFrom,
      'X-Maintenance-End': maintenanceConfigCache.maintenanceTo
    });
  }

  next();
}

// Setup maintenance API routes
export function setupMaintenanceRoutes(app: any) {
  // Health check endpoint
  app.get('/api/health', async (req: Request, res: Response) => {
    await refreshMaintenanceConfig();
    const { isActive, isWarning } = calculateMaintenanceStatus();
    
    // Always return 200 status, but include maintenance information
    res.json({
      status: isActive ? 'maintenance' : 'healthy',
      maintenance: {
        isActive: isActive,
        isWarning: isWarning,
        isMaintenanceMode: maintenanceConfigCache.isMaintenanceMode,
        from: maintenanceConfigCache.maintenanceFrom,
        to: maintenanceConfigCache.maintenanceTo
      },
      message: isActive ? 
        'We are upgrading a few things and will be back between ' + 
        formatTime(maintenanceConfigCache.maintenanceFrom) + ' and ' + 
        formatTime(maintenanceConfigCache.maintenanceTo) + '.' : 
        'Service is running normally'
    });
  });

  // Get maintenance status (admin only)
  app.get('/api/admin/maintenance/status', async (req: Request, res: Response) => {
    try {
      await refreshMaintenanceConfig();
      const { isActive, isWarning } = calculateMaintenanceStatus();
      
      // Ensure we have valid cache data
      if (!maintenanceConfigCache.lastUpdated) {
        maintenanceConfigCache = {
          isMaintenanceMode: false,
          maintenanceFrom: '',
          maintenanceTo: '',
          isMaintenanceActive: false,
          isPreMaintenanceWarning: false,
          lastUpdated: new Date()
        };
      }
      
      const response = {
        isMaintenanceMode: maintenanceConfigCache.isMaintenanceMode,
        maintenanceFrom: maintenanceConfigCache.maintenanceFrom,
        maintenanceTo: maintenanceConfigCache.maintenanceTo,
        isMaintenanceActive: isActive,
        isPreMaintenanceWarning: isWarning,
        lastUpdated: maintenanceConfigCache.lastUpdated
      };
      
      res.json(response);
    } catch (error) {
      console.error('Error fetching maintenance status:', error);
      res.status(500).json({ 
        error: 'Failed to fetch maintenance status',
        details: error.message
      });
    }
  });


  // Update maintenance configuration (admin only)
  app.post('/api/admin/maintenance/config', async (req: Request, res: Response) => {
    try {
      const { isMaintenanceMode, maintenanceFrom, maintenanceTo } = req.body;
      
      // Calculate new status
      const { isActive, isWarning } = calculateMaintenanceStatus();
      
      // Update database with proper data types
      const updateData = {
        isMaintenanceMode: Boolean(isMaintenanceMode),
        maintenanceFrom: isMaintenanceMode ? (maintenanceFrom || '') : '',
        maintenanceTo: isMaintenanceMode ? (maintenanceTo || '') : '',
        isMaintenanceActive: Boolean(isActive),
        isPreMaintenanceWarning: Boolean(isWarning),
        lastUpdated: new Date(),
        updatedBy: (req as any).user?.id || 'unknown'
      };
      
      const config = await MaintenanceConfig.findOneAndUpdate(
        {},
        updateData,
        { upsert: true, new: true }
      );
      
      // Update cache
      maintenanceConfigCache = {
        isMaintenanceMode: config.isMaintenanceMode,
        maintenanceFrom: config.maintenanceFrom,
        maintenanceTo: config.maintenanceTo,
        isMaintenanceActive: isActive,
        isPreMaintenanceWarning: isWarning,
        lastUpdated: config.lastUpdated
      };
      
      res.json({
        success: true,
        message: 'Maintenance configuration updated successfully',
        config: {
          isMaintenanceMode: config.isMaintenanceMode,
          maintenanceFrom: config.maintenanceFrom,
          maintenanceTo: config.maintenanceTo,
          isMaintenanceActive: isActive,
          isPreMaintenanceWarning: isWarning
        }
      });
    } catch (error) {
      console.error('Error updating maintenance config:', error);
      res.status(500).json({ 
        error: 'Failed to update maintenance configuration',
        details: error.message
      });
    }
  });

  // Initialize maintenance config on startup (after database connection)
  // This will be called after the database is connected
}

// Initialize maintenance config after database connection
export async function initializeMaintenanceAfterDB() {
  try {
    console.log('Initializing maintenance config after database connection...');
    await initializeMaintenanceConfig();
    console.log('Maintenance config initialized successfully');
  } catch (error) {
    console.error('Error initializing maintenance config after DB connection:', error);
    
    // Retry after a delay
    setTimeout(async () => {
      try {
        console.log('Retrying maintenance config initialization...');
        await initializeMaintenanceConfig();
        console.log('Maintenance config initialized on retry');
      } catch (retryError) {
        console.error('Retry failed for maintenance config initialization:', retryError);
      }
    }, 5000); // Retry after 5 seconds
  }
}

// Export functions for external use
export { maintenanceConfigCache as getMaintenanceConfig, refreshMaintenanceConfig };