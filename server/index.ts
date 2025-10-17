import express from "express";
// FIX: Added .js extensions to all local/relative imports
import { registerRoutes } from "./appRouter.js";
import { setupVite, serveStatic, log } from "./viteIntegration.js";
import { connectToMongoDB, dbHealthCheck } from "./db.js";
import { MaintenanceConfig } from "./models/MaintenanceConfig.js";
import authRoutes from "./routes/auth.js";
import passport from "passport";
import session from "express-session";
import cors from "cors";
import { Request, Response, NextFunction } from "express";
import { activityLogger } from './middleware/activityLogger.js';
import dotenv from "dotenv";
import MongoStore from 'connect-mongo';
dotenv.config();
// Load environment variables


console.log('MONGODB_URL:', process.env.MONGODB_URL);


// Validate required environment variables
const requiredEnvVars = ['SESSION_SECRET', 'MONGODB_URL'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please check your .env file and ensure all required variables are set.');
  process.exit(1);
}

// Validate SESSION_SECRET strength
if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
  console.warn('⚠️  SESSION_SECRET should be at least 32 characters long for security.');
}

const app = express();

// Configuration from environment variables
const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5000',
  corsOrigin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5000',
  debugMode: process.env.DEBUG_MODE === 'true',
  logLevel: process.env.LOG_LEVEL || 'info',
  sessionSecret: process.env.SESSION_SECRET!,
  sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000'), // 24 hours default
};

// Disable ETag to avoid 304 Not Modified responses on API
app.set('etag', false);

// --- FIX: ROBUST CORS CONFIGURATION ---
const allowedOrigins = [
    'https://code-arena-taupe.vercel.app', // Your production frontend
    'http://localhost:5000',               // For local development
    'http://localhost:5173'                // Another common local dev port
];

const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (like mobile apps, curl, postman)
        if (!origin) return callback(null, true);
        
        // Check if the origin is in our whitelist
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Also, handle pre-flight requests for all routes
app.options('*', cors(corsOptions));


// Ensure API responses are never cached
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Debug middleware
if (config.debugMode) {
  app.use((req, res, next) => {
    console.log('----------------------------------------');
    console.log(`[DEBUG] ${new Date().toISOString()} ${req.method} ${req.url}`);
    if (config.logLevel === 'debug') {
      console.log(`[DEBUG] Headers:`, req.headers);
    }
    next();
  });
}

// Parse JSON bodies
app.use(express.json({ limit: process.env.JSON_SIZE_LIMIT || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.URL_ENCODED_LIMIT || '10mb' }));

// Session configuration
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URL,
    collectionName: 'sessions' // Optional: name of the collection to store sessions
  }),
  name: process.env.SESSION_NAME || 'codearena.sid',
  cookie: {
    secure: config.nodeEnv === 'production',
    httpOnly: true,
    maxAge: config.sessionMaxAge,
    sameSite: config.nodeEnv === 'production' ? 'lax' : 'lax'
  }
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Health check endpoints
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'API Server Running',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.nodeEnv,
    port: config.port
  });
});

app.get('/health', async (req, res) => {
  try {
    const dbHealth = await dbHealthCheck();
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: { database: dbHealth, server: { status: 'connected' } },
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Mount auth routes
app.use('/api/auth', (req, res, next) => {
  if (config.debugMode) {
    console.log('[AUTH] Route hit:', req.method, req.url);
  }
  next();
}, authRoutes);
app.use('/auth', authRoutes); // Backward compatibility

// Activity logger
app.use(activityLogger);

// --- MAIN ASYNC BOOTSTRAP ---
(async () => {
  try {
    const serverInstance = app.listen(config.port, config.host, () => {
      console.log(`🚀 CodeArena API Server running on http://${config.host}:${config.port}`);
    });

    // --- FIX: ROUTE REGISTRATION MOVED UP ---
    // Register all application routes BEFORE the 404 handler
    await registerRoutes(app);
    console.log('✅ Routes registered successfully');

    // Setup Vite for development AFTER routes are registered
    if (config.nodeEnv === "development") {
      try {
        await setupVite(app, serverInstance);
        console.log('✅ Vite dev server integrated');
      } catch (viteError) {
        console.warn('⚠️  Vite dev server failed. Running in API-only mode.');
      }
    } else {
        console.log('🚀 Production mode: API-only server');
    }

    // --- FIX: 404 AND ERROR HANDLERS MOVED TO THE END ---
    // Global 404 handler for any unmatched routes
    app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method
      });
    });

    // Global error handling middleware
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('[ERROR]', err.stack || err.message);
      const errorResponse = config.nodeEnv === 'production'
        ? { error: 'Internal Server Error' }
        : { error: err.message };
      res.status(500).json(errorResponse);
    });

    // Connect to the database
    await connectToMongoDB();
    console.log('✅ MongoDB connected successfully');

    // Initialize maintenance mode configuration
    // FIX: Added .js extension
    const { initializeMaintenanceAfterDB } = await import('./middleware/maintenance.js');
    await initializeMaintenanceAfterDB();
    console.log('✅ Maintenance configuration initialized');

    console.log('\n🎉 CodeArena API Server fully initialized!\n');

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
})();

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down...');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});
