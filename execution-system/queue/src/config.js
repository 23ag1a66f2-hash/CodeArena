const config = {
  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || null,
    db: parseInt(process.env.REDIS_DB) || 0,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    lazyConnect: true,
    family: 4, // Force IPv4
    keepAlive: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
    // Additional options to force IPv4
    lookup: (hostname, options, callback) => {
      // Force IPv4 resolution
      require('dns').lookup(hostname, { family: 4 }, callback);
    }
  },

  // Queue Configuration
  queue: {
    name: 'code-execution',
    prefix: 'codearena',
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    },
    settings: {
      stalledInterval: 30 * 1000,
      maxStalledCount: 1
    }
  },

  // Worker Configuration
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY) || 5,
    docker: {
      socketPath: process.env.DOCKER_SOCKET_PATH || '/var/run/docker.sock',
      timeout: 30000,
      images: {
        python: process.env.PYTHON_IMAGE || 'codearena/executor-python:latest',
        javascript: process.env.JS_IMAGE || 'codearena/executor-javascript:latest',
        c: process.env.C_IMAGE || 'codearena/executor-c:latest',
        cpp: process.env.CPP_IMAGE || 'codearena/executor-cpp:latest',
        java: process.env.JAVA_IMAGE || 'codearena/executor-java:latest'
      },
      limits: {
        memory: process.env.CONTAINER_MEMORY_LIMIT || '128m',
        cpus: process.env.CONTAINER_CPU_LIMIT || '0.5',
        pids: parseInt(process.env.CONTAINER_PIDS_LIMIT) || 64,
        ulimits: [
          { name: 'nofile', soft: 1024, hard: 1024 },
          { name: 'nproc', soft: 64, hard: 64 }
        ]
      }
    }
  },

  // API Configuration
  api: {
    port: parseInt(process.env.API_PORT) || 3001,
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    },
    rateLimit: {
      windowMs: 60 * 1000, // 1 minute
      max: 100, // limit each IP to 100 requests per windowMs
      standardHeaders: true,
      legacyHeaders: false
    },
    timeout: parseInt(process.env.API_TIMEOUT) || 30000
  },

  // Execution Limits
  execution: {
    timeLimit: parseInt(process.env.TIME_LIMIT) || 10, // seconds
    memoryLimit: process.env.MEMORY_LIMIT || '128m',
    outputLimit: process.env.OUTPUT_LIMIT || '64k',
    compileTimeLimit: parseInt(process.env.COMPILE_TIME_LIMIT) || 30, // seconds
    maxCodeSize: parseInt(process.env.MAX_CODE_SIZE) || 64 * 1024, // 64KB
    maxInputSize: parseInt(process.env.MAX_INPUT_SIZE) || 1024 // 1KB
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    file: process.env.LOG_FILE || null,
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
    maxSize: process.env.LOG_MAX_SIZE || '10m'
  },

  // Health Check Configuration
  health: {
    port: parseInt(process.env.HEALTH_PORT) || 3002,
    timeout: parseInt(process.env.HEALTH_TIMEOUT) || 5000
  },

  // Metrics Configuration
  metrics: {
    enabled: process.env.METRICS_ENABLED === 'true',
    port: parseInt(process.env.METRICS_PORT) || 9090,
    path: process.env.METRICS_PATH || '/metrics'
  }
};

module.exports = config; 