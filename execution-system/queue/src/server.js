const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const { v4: uuidv4 } = require('uuid');
const Redis = require('redis');

const config = require('./config');
const logger = require('./logger');
const ExecutionQueue = require('./queue');

class ExecutionAPI {
  constructor() {
    this.app = express();
    this.queue = new ExecutionQueue();
    this.rateLimiter = null;
    this.redis = null;
  }

  async initialize() {
    try {
      logger.info('Initializing Execution API...');

      // Initialize Redis for rate limiting
      this.redis = Redis.createClient({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db + 1 // Use different DB for rate limiting
      });
      await this.redis.connect();

      // Initialize rate limiter
      this.rateLimiter = new RateLimiterRedis({
        storeClient: this.redis,
        keyGenerator: (req) => req.ip,
        points: config.api.rateLimit.max,
        duration: config.api.rateLimit.windowMs / 1000,
        blockDuration: 60, // Block for 1 minute after limit exceeded
      });

      // Initialize queue
      await this.queue.initialize();

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Setup error handling
      this.setupErrorHandling();

      logger.info('Execution API initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Execution API:', error);
      throw error;
    }
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    }));

    // CORS
    this.app.use(cors(config.api.cors));

    // Body parsing
    this.app.use(express.json({ 
      limit: '1mb',
      strict: true 
    }));
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: '1mb' 
    }));

    // Request ID middleware
    this.app.use((req, res, next) => {
      req.requestId = uuidv4();
      res.setHeader('X-Request-ID', req.requestId);
      req.logger = logger.addRequestId(req.requestId);
      next();
    });

    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      req.logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.method === 'POST' ? 'redacted' : undefined
      });

      res.on('finish', () => {
        const duration = Date.now() - start;
        req.logger.info(`${req.method} ${req.path} completed`, {
          statusCode: res.statusCode,
          duration
        });
      });

      next();
    });

    // Rate limiting middleware
    this.app.use(async (req, res, next) => {
      try {
        await this.rateLimiter.consume(req.ip);
        next();
      } catch (rejRes) {
        req.logger.warn('Rate limit exceeded', { ip: req.ip });
        res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.round(rejRes.msBeforeNext / 1000) || 1
        });
      }
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: require('../package.json').version
      });
    });

    // Queue stats
    this.app.get('/api/stats', async (req, res) => {
      try {
        const stats = await this.queue.getQueueStats();
        res.json(stats);
      } catch (error) {
        req.logger.error('Failed to get queue stats:', error);
        res.status(500).json({ error: 'Failed to get queue statistics' });
      }
    });

    // Submit code for execution
    this.app.post('/api/execute', async (req, res) => {
      try {
        const { code, language, input, testCases } = req.body;

        // Validate request
        const validation = this.validateExecutionRequest(req.body);
        if (!validation.valid) {
          return res.status(400).json({ 
            error: 'Validation failed', 
            details: validation.errors 
          });
        }

        // Create job data
        const jobData = {
          id: uuidv4(),
          code,
          language: language.toLowerCase(),
          input: input || '',
          testCases: testCases || [],
          submittedAt: new Date().toISOString(),
          requestId: req.requestId,
          limits: {
            timeLimit: config.execution.timeLimit,
            memoryLimit: config.execution.memoryLimit,
            outputLimit: config.execution.outputLimit
          }
        };

        // Add job to queue
        const job = await this.queue.addJob(jobData, {
          priority: testCases && testCases.length > 0 ? 5 : 1, // Higher priority for test cases
          delay: 0
        });

        req.logger.info(`Code execution job created`, { 
          jobId: job.id, 
          language,
          hasTestCases: !!(testCases && testCases.length > 0)
        });

        res.status(202).json({
          jobId: job.id,
          status: 'queued',
          message: 'Code execution job submitted successfully'
        });

      } catch (error) {
        req.logger.error('Failed to submit execution job:', error);
        res.status(500).json({ error: 'Failed to submit execution job' });
      }
    });

    // Get job status
    this.app.get('/api/jobs/:jobId', async (req, res) => {
      try {
        const { jobId } = req.params;
        const status = await this.queue.getJobStatus(jobId);

        if (!status) {
          return res.status(404).json({ error: 'Job not found' });
        }

        res.json(status);
      } catch (error) {
        req.logger.error('Failed to get job status:', error);
        res.status(500).json({ error: 'Failed to get job status' });
      }
    });

    // Cancel job
    this.app.delete('/api/jobs/:jobId', async (req, res) => {
      try {
        const { jobId } = req.params;
        const removed = await this.queue.removeJob(jobId);

        if (!removed) {
          return res.status(404).json({ error: 'Job not found' });
        }

        req.logger.info(`Job cancelled`, { jobId });
        res.json({ message: 'Job cancelled successfully' });
      } catch (error) {
        req.logger.error('Failed to cancel job:', error);
        res.status(500).json({ error: 'Failed to cancel job' });
      }
    });

    // Get supported languages
    this.app.get('/api/languages', (req, res) => {
      res.json({
        languages: Object.keys(config.worker.docker.images),
        limits: config.execution
      });
    });
  }

  validateExecutionRequest(body) {
    const errors = [];
    const { code, language, input, testCases } = body;

    // Required fields
    if (!code || typeof code !== 'string') {
      errors.push('Code is required and must be a string');
    } else if (code.length > config.execution.maxCodeSize) {
      errors.push(`Code size exceeds maximum limit of ${config.execution.maxCodeSize} bytes`);
    }

    if (!language || typeof language !== 'string') {
      errors.push('Language is required and must be a string');
    } else if (!config.worker.docker.images[language.toLowerCase()]) {
      errors.push(`Unsupported language: ${language}. Supported languages: ${Object.keys(config.worker.docker.images).join(', ')}`);
    }

    // Optional fields validation
    if (input && typeof input !== 'string') {
      errors.push('Input must be a string');
    } else if (input && input.length > config.execution.maxInputSize) {
      errors.push(`Input size exceeds maximum limit of ${config.execution.maxInputSize} bytes`);
    }

    if (testCases) {
      if (!Array.isArray(testCases)) {
        errors.push('Test cases must be an array');
      } else {
        testCases.forEach((testCase, index) => {
          if (!testCase.input || typeof testCase.input !== 'string') {
            errors.push(`Test case ${index + 1}: input is required and must be a string`);
          }
          if (!testCase.expectedOutput || typeof testCase.expectedOutput !== 'string') {
            errors.push(`Test case ${index + 1}: expectedOutput is required and must be a string`);
          }
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });

    // Global error handler
    this.app.use((error, req, res, next) => {
      req.logger.error('Unhandled error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        requestId: req.requestId 
      });
    });
  }

  async start() {
    return new Promise((resolve, reject) => {
      try {
        const server = this.app.listen(config.api.port, () => {
          logger.info(`Execution API listening on port ${config.api.port}`);
          resolve(server);
        });

        server.setTimeout(config.api.timeout);
        
        // Graceful shutdown
        process.on('SIGTERM', async () => {
          logger.info('SIGTERM received, shutting down gracefully');
          server.close(() => {
            this.queue.close().then(() => {
              process.exit(0);
            });
          });
        });

      } catch (error) {
        reject(error);
      }
    });
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const api = new ExecutionAPI();
  api.initialize()
    .then(() => api.start())
    .catch((error) => {
      logger.error('Failed to start Execution API:', error);
      process.exit(1);
    });
}

module.exports = ExecutionAPI; 