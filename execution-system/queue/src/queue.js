const Queue = require('bull');
const Redis = require('redis');
const config = require('./config');
const logger = require('./logger');

class ExecutionQueue {
  constructor() {
    this.queue = null;
    this.redis = null;
    this.isConnected = false;
  }

  async initialize() {
    try {
      logger.info('Initializing execution queue...');

      // Create Redis connection
      this.redis = Redis.createClient({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
        maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
        retryDelayOnFailover: config.redis.retryDelayOnFailover,
        lazyConnect: config.redis.lazyConnect,
        family: config.redis.family,
        keepAlive: config.redis.keepAlive,
        connectTimeout: config.redis.connectTimeout,
        commandTimeout: config.redis.commandTimeout
      });

      // Connect to Redis
      await this.redis.connect();
      logger.info('Connected to Redis');

      // Create Bull queue
      this.queue = new Queue(
        config.queue.name,
        {
          redis: {
            host: config.redis.host,
            port: config.redis.port,
            password: config.redis.password,
            db: config.redis.db
          },
          prefix: config.queue.prefix,
          defaultJobOptions: config.queue.defaultJobOptions,
          settings: config.queue.settings
        }
      );

      // Set up queue event listeners
      this.setupEventListeners();

      this.isConnected = true;
      logger.info('Execution queue initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize execution queue:', error);
      throw error;
    }
  }

  setupEventListeners() {
    this.queue.on('ready', () => {
      logger.info('Queue is ready');
    });

    this.queue.on('error', (error) => {
      logger.error('Queue error:', error);
    });

    this.queue.on('waiting', (jobId) => {
      logger.debug(`Job ${jobId} is waiting`);
    });

    this.queue.on('active', (job, jobPromise) => {
      logger.info(`Job ${job.id} started processing`);
    });

    this.queue.on('completed', (job, result) => {
      logger.info(`Job ${job.id} completed successfully`);
    });

    this.queue.on('failed', (job, err) => {
      logger.error(`Job ${job.id} failed:`, err);
    });

    this.queue.on('stalled', (job) => {
      logger.warn(`Job ${job.id} stalled`);
    });

    this.queue.on('progress', (job, progress) => {
      logger.debug(`Job ${job.id} progress: ${progress}%`);
    });
  }

  async addJob(jobData, options = {}) {
    if (!this.isConnected) {
      throw new Error('Queue not initialized');
    }

    try {
      const job = await this.queue.add(jobData, {
        ...config.queue.defaultJobOptions,
        ...options
      });

      logger.info(`Job ${job.id} added to queue`);
      return job;
    } catch (error) {
      logger.error('Failed to add job to queue:', error);
      throw error;
    }
  }

  async getJob(jobId) {
    if (!this.isConnected) {
      throw new Error('Queue not initialized');
    }

    try {
      const job = await this.queue.getJob(jobId);
      return job;
    } catch (error) {
      logger.error(`Failed to get job ${jobId}:`, error);
      throw error;
    }
  }

  async getJobStatus(jobId) {
    if (!this.isConnected) {
      throw new Error('Queue not initialized');
    }

    try {
      const job = await this.getJob(jobId);
      if (!job) {
        return null;
      }

      const state = await job.getState();
      return {
        id: job.id,
        state,
        progress: job.progress(),
        data: job.data,
        result: job.returnvalue,
        failedReason: job.failedReason,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        attempts: job.attemptsMade,
        delay: job.delay
      };
    } catch (error) {
      logger.error(`Failed to get job status ${jobId}:`, error);
      throw error;
    }
  }

  async removeJob(jobId) {
    if (!this.isConnected) {
      throw new Error('Queue not initialized');
    }

    try {
      const job = await this.getJob(jobId);
      if (job) {
        await job.remove();
        logger.info(`Job ${jobId} removed from queue`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Failed to remove job ${jobId}:`, error);
      throw error;
    }
  }

  async getQueueStats() {
    if (!this.isConnected) {
      throw new Error('Queue not initialized');
    }

    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue.getWaiting(),
        this.queue.getActive(),
        this.queue.getCompleted(),
        this.queue.getFailed(),
        this.queue.getDelayed()
      ]);

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        total: waiting.length + active.length + completed.length + failed.length + delayed.length
      };
    } catch (error) {
      logger.error('Failed to get queue stats:', error);
      throw error;
    }
  }

  async processJobs(processor, concurrency = config.worker.concurrency) {
    if (!this.isConnected) {
      throw new Error('Queue not initialized');
    }

    try {
      this.queue.process(concurrency, processor);
      logger.info(`Started processing jobs with concurrency: ${concurrency}`);
    } catch (error) {
      logger.error('Failed to start job processing:', error);
      throw error;
    }
  }

  async pause() {
    if (!this.isConnected) {
      throw new Error('Queue not initialized');
    }

    try {
      await this.queue.pause();
      logger.info('Queue paused');
    } catch (error) {
      logger.error('Failed to pause queue:', error);
      throw error;
    }
  }

  async resume() {
    if (!this.isConnected) {
      throw new Error('Queue not initialized');
    }

    try {
      await this.queue.resume();
      logger.info('Queue resumed');
    } catch (error) {
      logger.error('Failed to resume queue:', error);
      throw error;
    }
  }

  async close() {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.queue.close();
      if (this.redis) {
        await this.redis.quit();
      }
      this.isConnected = false;
      logger.info('Queue connection closed');
    } catch (error) {
      logger.error('Failed to close queue connection:', error);
      throw error;
    }
  }

  async clean(grace = 5000) {
    if (!this.isConnected) {
      throw new Error('Queue not initialized');
    }

    try {
      await this.queue.clean(grace, 'completed');
      await this.queue.clean(grace, 'failed');
      logger.info('Queue cleaned');
    } catch (error) {
      logger.error('Failed to clean queue:', error);
      throw error;
    }
  }
}

module.exports = ExecutionQueue; 