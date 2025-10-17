const express = require('express');
const Docker = require('dockerode');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Supported languages and their Docker images
const LANGUAGE_IMAGES = {
  python: 'codearena/executor-python:latest',
  javascript: 'codearena/executor-javascript:latest',
  c: 'codearena/executor-c:latest',
  cpp: 'codearena/executor-cpp:latest',
  java: 'codearena/executor-java:latest'
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    docker: true,
    languages: Object.keys(LANGUAGE_IMAGES)
  });
});

// Execute code endpoint
app.post('/api/execute', async (req, res) => {
  try {
    const { code, language, input = '' } = req.body;
    
    if (!code || !language) {
      return res.status(400).json({
        error: 'Code and language are required'
      });
    }

    const imageName = LANGUAGE_IMAGES[language.toLowerCase()];
    if (!imageName) {
      return res.status(400).json({
        error: `Unsupported language: ${language}. Supported languages: ${Object.keys(LANGUAGE_IMAGES).join(', ')}`
      });
    }

    console.log(`[DOCKER-API] Executing ${language} code`);

    // Create container
    const container = await docker.createContainer({
      Image: imageName,
      Cmd: ['/bin/sh', '-c', `echo '${code.replace(/'/g, "'\"'\"'")}' > /tmp/code && echo '${input.replace(/'/g, "'\"'\"'")}' > /tmp/input && cd /tmp && /app/execute.sh`],
      HostConfig: {
        Memory: 128 * 1024 * 1024, // 128MB
        MemorySwap: 128 * 1024 * 1024,
        CpuPeriod: 100000,
        CpuQuota: 50000, // 0.5 CPU
        PidsLimit: 64,
        Ulimits: [
          { Name: 'nofile', Soft: 1024, Hard: 1024 },
          { Name: 'nproc', Soft: 64, Hard: 64 }
        ],
        AutoRemove: true
      },
      Env: [
        'CODE=' + code,
        'INPUT=' + input,
        'TIME_LIMIT=10',
        'MEMORY_LIMIT=128m',
        'OUTPUT_LIMIT=64k'
      ]
    });

    const startTime = Date.now();
    
    // Start container
    await container.start();
    
    // Wait for container to finish
    const result = await container.wait();
    
    const endTime = Date.now();
    const runtime = endTime - startTime;

    // Get container logs
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: 1000
    });

    const output = logs.toString('utf8').trim();
    
    // Check if execution was successful
    if (result.StatusCode === 0) {
      res.json({
        output: output,
        runtime: runtime,
        memory: 0, // We'll get this from the container later
        error: null
      });
    } else {
      res.json({
        output: '',
        runtime: runtime,
        memory: 0,
        error: output || 'Execution failed'
      });
    }

  } catch (error) {
    console.error('[DOCKER-API] Error:', error);
    res.status(500).json({
      error: 'Internal server error: ' + error.message
    });
  }
});

// Get supported languages
app.get('/api/languages', (req, res) => {
  res.json({
    languages: Object.keys(LANGUAGE_IMAGES),
    images: LANGUAGE_IMAGES
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Simple Docker API running on port ${PORT}`);
  console.log(`📦 Supported languages: ${Object.keys(LANGUAGE_IMAGES).join(', ')}`);
}); 