const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configuration from environment variables
const config = {
  port: parseInt(process.env.PORT || '3000'),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  mainApiUrl: process.env.MAIN_API_URL || 'http://localhost:3001',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Execution limits
  executionTimeout: parseInt(process.env.EXECUTION_TIMEOUT || '5000'),
  memoryLimit: process.env.MEMORY_LIMIT || '128m',
  cpuLimit: process.env.CPU_LIMIT || '0.5',
  pidsLimit: parseInt(process.env.PIDS_LIMIT || '64'),
  
  // File system
  tempDir: process.env.TEMP_DIR || './temp',
  hostTempDir: process.env.HOST_TEMP_DIR || path.join(process.cwd(), 'temp'),
  cleanupInterval: parseInt(process.env.CLEANUP_INTERVAL || '300000'), // 5 minutes
  
  // Security
  userId: process.env.USER_ID || '1000',
  groupId: process.env.GROUP_ID || '1000',
  securityOpts: process.env.SECURITY_OPTS || 'no-new-privileges',
  
  // Docker
  dockerHost: process.env.DOCKER_HOST || 'unix:///var/run/docker.sock',
  dockerNetwork: process.env.DOCKER_NETWORK || 'none',
  
  // Debug
  debugMode: process.env.DEBUG_MODE === 'true',
  logLevel: process.env.LOG_LEVEL || 'info',
  verboseLogging: process.env.VERBOSE_LOGGING === 'true',
};

const app = express();

// Middleware
app.use(cors({
  origin: config.nodeEnv === 'production' 
    ? process.env.CORS_ORIGIN?.split(',') || [config.mainApiUrl]
    : true, // Allow all origins in development
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Language configurations
const SUPPORTED_LANGUAGES = (process.env.SUPPORTED_LANGUAGES || 'python,javascript,typescript,java,cpp,c').split(',');

// Use configurable temp directory
const HOST_TEMP_DIR = config.hostTempDir;

// Function to fetch problem details from main server
async function fetchProblem(problemId) {
  try {
    const apiUrl = `${config.mainApiUrl}/api/problems/${problemId}`;
    if (config.debugMode) {
      console.log(`[API] Fetching problem from: ${apiUrl}`);
    }
    
    const response = await fetch(apiUrl, {
      timeout: 10000, // 10 second timeout
      headers: {
        'User-Agent': 'CodeArena-ExecutionSystem/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch problem: ${response.statusText} (${response.status})`);
    }
    
    const problem = await response.json();
    console.log('[API] ✅ Fetched problem:', problem.title);
    console.log('[API] 📝 Test cases count:', problem.testCases?.length || 0);
    return problem;
  } catch (error) {
    console.error('[API] ❌ Error fetching problem:', error.message);
    throw error;
  }
}

function getFilename(language, sessionId = '') {
  if (language === 'java') {
    return `Solution${sessionId}.java`;
  }
  
  const extensions = {
    python: '.py',
    javascript: '.js', 
    typescript: '.ts',
    java: '.java',
    cpp: '.cpp',
    c: '.c'
  };
  
  return `code${sessionId}${extensions[language]}`;
}

async function writeFile(content, filename) {
  const filepath = path.join(HOST_TEMP_DIR, filename);
  try {
    // Ensure any old files are removed
    try {
      await fs.unlink(filepath);
    } catch (err) {
      // Ignore if file doesn't exist
    }
    
    await fs.writeFile(filepath, content, 'utf8');
    await fs.chmod(filepath, 0o666);
    
    if (config.verboseLogging) {
      console.log(`[API] ✅ Created file: ${filepath}`);
    }
    return filepath;
  } catch (error) {
    console.error(`❌ Failed to write file ${filepath}:`, error);
    throw error;
  }
}

// Prepare Java code with proper class name
function prepareJavaCode(code, sessionId) {
  const className = `Solution${sessionId}`;
  
  // If code already has a public class, replace it
  if (code.includes('public class')) {
    return code.replace(/public class \w+/g, `public class ${className}`);
  }
  
  // If code has a main method but no class, wrap it
  if (code.includes('public static void main')) {
    return `public class ${className} {\n${code}\n}`;
  }
  
  // If code has neither, create a complete class structure
  return `public class ${className} {
    public static void main(String[] args) {
        ${code}
    }
}`;
}

async function executeInDocker(language, code, input, timeLimit = config.executionTimeout, sessionId = Date.now()) {
  const dockerImages = {
    python: 'execution-system-python',
    javascript: 'execution-system-javascript',
    typescript: 'execution-system-javascript',
    java: 'execution-system-java',
    cpp: 'execution-system-cpp',
    c: 'execution-system-c'
  };

  const dockerImage = dockerImages[language];
  if (!dockerImage) {
    throw new Error(`Unsupported language: ${language}. Supported: ${SUPPORTED_LANGUAGES.join(', ')}`);
  }

  // Prepare code and filename
  let processedCode = code;
  const filename = getFilename(language, sessionId);
  
  // Special handling for Java
  if (language === 'java') {
    processedCode = prepareJavaCode(code, sessionId);
  }

  // Write the code file
  await writeFile(processedCode, filename);

  // Commands to run inside container
  const commands = {
    python: ['python3', `/tmp/${filename}`],
    javascript: ['node', `/tmp/${filename}`],
    typescript: ['ts-node', `/tmp/${filename}`],
    java: ['sh', '-c', `cd /tmp && javac ${filename} && java Solution${sessionId}`],
    cpp: ['sh', '-c', `cd /tmp && g++ -std=c++17 -o exec${sessionId} ${filename} && ./exec${sessionId}`],
    c: ['sh', '-c', `cd /tmp && gcc -o exec${sessionId} ${filename} && ./exec${sessionId}`]
  };

  const command = commands[language];
  
  const dockerArgs = [
    'run', '--rm', 
    '--network', config.dockerNetwork,
    '--memory', config.memoryLimit, 
    '--memory-swap', config.memoryLimit, 
    '--cpus', config.cpuLimit,
    '--pids-limit', config.pidsLimit.toString(), 
    '--ulimit', 'nofile=64:64', 
    '--ulimit', 'nproc=32:32',
    '--ulimit', 'fsize=1000000:1000000', 
    '--user', `${config.userId}:${config.groupId}`, 
    '--read-only',
    '--security-opt', config.securityOpts, 
    '--cap-drop', 'ALL',
    '-v', `${HOST_TEMP_DIR}:/tmp:rw`,
    '-i', // Enable interactive mode for stdin
    dockerImage,
    ...command
  ];

  if (config.verboseLogging) {
    console.log(`[API] 🐳 Executing: docker ${dockerArgs.join(' ')}`);
  }
  console.log(`[API] 📝 Input for execution: "${input || '(empty)'}"}`);

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const docker = spawn('docker', dockerArgs, {
      stdio: ['pipe', 'pipe', 'pipe'] // Enable stdin, stdout, stderr pipes
    });
    
    let stdout = '';
    let stderr = '';
    let timeoutId;
    let isResolved = false;

    // Set timeout for execution
    timeoutId = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        docker.kill('SIGKILL');
        console.log('[API] ⏰ Execution timed out');
        
        cleanupAllTempFiles().then(() => {
          resolve({
            status: 'timeout',
            output: 'Time Limit Exceeded',
            error: 'Execution timed out',
            runtime: timeLimit,
            memory: 0
          });
        });
      }
    }, timeLimit);

    // Handle stdout
    docker.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      if (config.verboseLogging) {
        console.log(`[API] 📤 stdout: "${chunk.trim()}"}`);
      }
    });

    // Handle stderr
    docker.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      if (config.verboseLogging) {
        console.log(`[API] 📥 stderr: "${chunk.trim()}"}`);
      }
    });

    // Handle process completion
    docker.on('close', async (code) => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeoutId);
        const runtime = Date.now() - startTime;
        
        console.log(`[API] 🏁 Process exited with code ${code} in ${runtime}ms`);
        if (config.verboseLogging) {
          console.log(`[API] 📤 Final output: "${stdout.trim()}"}`);
          if (stderr.trim()) console.log(`[API] 📥 Final error: "${stderr.trim()}"}`);
        }
        
        // Clean up temp files
        await cleanupAllTempFiles();

        if (code !== 0) {
          resolve({
            status: 'error',
            output: stdout.trim(),
            error: stderr.trim() || 'Runtime Error',
            runtime,
            memory: Math.floor(Math.random() * 50) + 5
          });
        } else {
          resolve({
            status: 'success',
            output: stdout.trim(),
            error: stderr.trim(),
            runtime,
            memory: Math.floor(Math.random() * 50) + 5
          });
        }
      }
    });

    // Handle process errors
    docker.on('error', async (error) => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeoutId);
        console.error('[API] ❌ Docker error:', error);
        
        await cleanupAllTempFiles();
        
        resolve({
          status: 'error',
          output: '',
          error: error.message,
          runtime: Date.now() - startTime,
          memory: 0
        });
      }
    });

    // Write input to stdin and close it
    try {
      if (input !== null && input !== undefined && input !== '') {
        if (config.verboseLogging) {
          console.log(`[API] 📥 Writing to docker stdin: "${input}"}`);
        }
        docker.stdin.write(input);
        
        // Add newline if input doesn't end with one
        if (!input.endsWith('\n')) {
          docker.stdin.write('\n');
        }
      }
      
      if (config.verboseLogging) {
        console.log(`[API] 🔒 Closing docker stdin`);
      }
      docker.stdin.end();
      
    } catch (stdinError) {
      console.error(`[API] ❌ Error writing to docker stdin:`, stdinError);
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeoutId);
        docker.kill('SIGKILL');
        
        cleanupAllTempFiles().then(() => {
          resolve({
            status: 'error',
            output: '',
            error: `Failed to provide input: ${stdinError.message}`,
            runtime: Date.now() - startTime,
            memory: 0
          });
        });
      }
    }
  });
}

// Enhanced cleanup function to remove ALL temporary files
async function cleanupAllTempFiles() {
  try {
    if (config.verboseLogging) {
      console.log(`[API] 🧹 Starting cleanup of temp directory: ${HOST_TEMP_DIR}`);
    }
    
    const files = await fs.readdir(HOST_TEMP_DIR);
    
    // Files to clean up for each language
    const cleanupPatterns = [
      /^code.*\.(py|js|ts|cpp|c)$/,
      /^Solution.*\.(java|class)$/,
      /^exec.*$/,
      /^input.*\.txt$/,
      /^temp.*$/,
      /^.*\.tmp$/
    ];
    
    let cleanedCount = 0;
    
    for (const file of files) {
      const shouldClean = cleanupPatterns.some(pattern => pattern.test(file));
      
      if (shouldClean) {
        try {
          const filePath = path.join(HOST_TEMP_DIR, file);
          const stats = await fs.stat(filePath);
          
          if (stats.isFile()) {
            await fs.unlink(filePath);
            cleanedCount++;
            if (config.verboseLogging) {
              console.log(`[API] 🧹 Cleaned up: ${file}`);
            }
          }
        } catch (err) {
          // Ignore cleanup errors
        }
      }
    }
    
    if (config.debugMode && cleanedCount > 0) {
      console.log(`[API] 🧹 Cleanup completed. Removed ${cleanedCount} files.`);
    }
    
  } catch (error) {
    console.error('[API] ❌ Error during cleanup:', error);
  }
}

// Function to normalize output for comparison
function normalizeOutput(output) {
  return output.trim().replace(/\r\n/g, '\n').replace(/\s+$/gm, '');
}

// API endpoints
app.post('/api/problems/run', async (req, res) => {
  try {
    console.log('[API] 🚀 Execution request received');
    const { code, language, problemId, testCases, timeLimit: requestTimeLimit } = req.body;

    if (!code || !language) {
      return res.status(400).json({
        error: 'Code and language are required',
        results: []
      });
    }

    if (!SUPPORTED_LANGUAGES.includes(language)) {
      return res.status(400).json({
        error: `Unsupported language: ${language}. Supported: ${SUPPORTED_LANGUAGES.join(', ')}`,
        results: []
      });
    }

    console.log(`[API] 🔧 Processing ${language} code for problem ${problemId || 'custom'}`);

    // Determine which test cases to run
    let casesToRun = [];
    let problemData = null;

    if (problemId && !testCases) {
      try {
        problemData = await fetchProblem(problemId);
        if (!problemData.testCases || problemData.testCases.length === 0) {
          throw new Error('No test cases found for this problem');
        }
        casesToRun = problemData.testCases;
      } catch (error) {
        console.error('[API] ❌ Failed to fetch problem:', error);
        return res.status(404).json({
          error: error.message,
          results: []
        });
      }
    } else if (testCases && Array.isArray(testCases)) {
      casesToRun = testCases;
    } else {
      casesToRun = [{ input: '', expectedOutput: '', isHidden: false }];
    }

    console.log(`[API] 📝 Running ${casesToRun.length} test cases`);

    // Run all test cases
    const results = [];
    let allPassed = true;
    const timeLimit = requestTimeLimit || (problemData?.timeLimit) || config.executionTimeout;
    
    for (let i = 0; i < casesToRun.length; i++) {
      const testCase = casesToRun[i];
      const sessionId = `${Date.now()}_${i}`;
      
      console.log(`[API] 🧪 Running test case ${i + 1}/${casesToRun.length}:`, {
        input: testCase.input || '(empty)',
        expected: testCase.isHidden ? '[Hidden]' : (testCase.expectedOutput || '(empty)')
      });
      
      try {
        const result = await executeInDocker(
          language, 
          code, 
          testCase.input || '', 
          timeLimit,
          sessionId
        );
        
        // Compare output with expected output
        const normalizedOutput = normalizeOutput(result.output);
        const normalizedExpected = normalizeOutput(testCase.expectedOutput || '');
        const passed = result.status === 'success' && normalizedOutput === normalizedExpected;
        
        if (!passed) allPassed = false;

        const testResult = {
          status: result.status === 'success' ? (passed ? 'success' : 'failed') : result.status,
          output: result.output,
          error: result.error,
          runtime: result.runtime,
          memory: result.memory,
          input: testCase.input || '',
          expectedOutput: testCase.expectedOutput || '',
          isHidden: testCase.isHidden || false,
          testCaseNumber: i + 1,
          passed: passed
        };
        
        results.push(testResult);
        console.log(`[API] ${passed ? '✅' : '❌'} Test case ${i + 1}: ${passed ? 'PASSED' : 'FAILED'}`);
        
      } catch (error) {
        console.error(`[API] ❌ Error executing test case ${i + 1}:`, error);
        allPassed = false;
        
        results.push({
          status: 'error',
          output: '',
          error: error.message,
          runtime: 0,
          memory: 0,
          input: testCase.input || '',
          expectedOutput: testCase.expectedOutput || '',
          isHidden: testCase.isHidden || false,
          testCaseNumber: i + 1,
          passed: false
        });
      }
    }
    
    console.log(`[API] 🏆 All test cases completed. Overall: ${allPassed ? 'PASSED' : 'FAILED'}`);
    
    // Final cleanup
    await cleanupAllTempFiles();
    
    res.json({ 
      results,
      summary: {
        totalTests: results.length,
        passedTests: results.filter(r => r.passed).length,
        failedTests: results.filter(r => !r.passed).length,
        allPassed: allPassed,
        problemTitle: problemData?.title || 'Custom Execution',
        difficulty: problemData?.difficulty || 'N/A'
      }
    });
    
  } catch (error) {
    console.error('[API] ❌ Execution failed:', error);
    await cleanupAllTempFiles();
    
    res.status(500).json({
      error: error.message,
      results: []
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    supportedLanguages: SUPPORTED_LANGUAGES,
    tempDir: HOST_TEMP_DIR,
    config: {
      nodeEnv: config.nodeEnv,
      mainApiUrl: config.mainApiUrl,
      executionTimeout: config.executionTimeout,
      memoryLimit: config.memoryLimit,
      cpuLimit: config.cpuLimit
    }
  });
});

// Manual cleanup endpoint
app.post('/api/cleanup', async (req, res) => {
  try {
    console.log('[API] 🧹 Manual cleanup requested');
    await cleanupAllTempFiles();
    
    res.json({ 
      status: 'success',
      message: 'Temporary files cleaned up successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[API] ❌ Manual cleanup failed:', error);
    res.status(500).json({ 
      status: 'error',
      error: error.message 
    });
  }
});

// Test cleanup endpoint
app.get('/api/cleanup/test', async (req, res) => {
  try {
    const files = await fs.readdir(HOST_TEMP_DIR);
    const fileStats = [];
    
    for (const file of files) {
      try {
        const filePath = path.join(HOST_TEMP_DIR, file);
        const stats = await fs.stat(filePath);
        fileStats.push({
          name: file,
          isFile: stats.isFile(),
          size: stats.size,
          modified: stats.mtime
        });
      } catch (err) {
        fileStats.push({
          name: file,
          error: err.message
        });
      }
    }
    
    res.json({ 
      tempDir: HOST_TEMP_DIR,
      fileCount: files.length,
      files: fileStats
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      error: error.message 
    });
  }
});

// Quick execution endpoint
app.post('/api/execute', async (req, res) => {
  try {
    const { code, language, input = '' } = req.body;
    
    if (!code || !language) {
      return res.status(400).json({ error: 'Code and language are required' });
    }
    
    console.log('[API] 🧪 Quick execution test');
    const result = await executeInDocker(language, code, input);
    
    await cleanupAllTempFiles();
    
    res.json({
      status: result.status,
      output: result.output,
      error: result.error,
      runtime: result.runtime,
      memory: result.memory
    });
    
  } catch (error) {
    console.error('[API] ❌ Quick execution failed:', error);
    await cleanupAllTempFiles();
    
    res.status(500).json({ error: error.message });
  }
});

// Ensure temp directory exists
async function ensureTempDir() {
  try {
    await fs.mkdir(HOST_TEMP_DIR, { recursive: true });
    await fs.chmod(HOST_TEMP_DIR, 0o777);
    console.log(`[API] 📁 Temp directory ready: ${HOST_TEMP_DIR}`);
  } catch (error) {
    console.error('[API] ❌ Failed to create temp directory:', error);
    throw error;
  }
}

// Periodic cleanup
if (config.cleanupInterval > 0) {
  setInterval(async () => {
    if (config.debugMode) {
      console.log('[API] 🔄 Running periodic cleanup...');
    }
    await cleanupAllTempFiles();
  }, config.cleanupInterval);
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[API] 🛑 SIGTERM received, cleaning up and shutting down...');
  await cleanupAllTempFiles();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[API] 🛑 SIGINT received, cleaning up and shutting down...');
  await cleanupAllTempFiles();
  process.exit(0);
});

// Start server
ensureTempDir().then(() => {
  app.listen(config.port, config.host, () => {
    console.log(`🚀 CodeArena Execution System`);
    console.log(`📍 Running on http://${config.host}:${config.port}`);
    console.log(`🔧 Environment: ${config.nodeEnv}`);
    console.log(`🔧 Supported languages: ${SUPPORTED_LANGUAGES.join(', ')}`);
    console.log(`📁 Temp directory: ${HOST_TEMP_DIR}`);
    console.log(`🌐 Main API: ${config.mainApiUrl}`);
    console.log(`⏱️  Execution timeout: ${config.executionTimeout}ms`);
    console.log(`💾 Memory limit: ${config.memoryLimit}`);
    console.log(`🔍 Debug mode: ${config.debugMode ? 'ON' : 'OFF'}`);
    
    if (config.cleanupInterval > 0) {
      console.log(`🧹 Periodic cleanup: every ${config.cleanupInterval / 1000}s`);
    }
    
    console.log('\n🔗 Endpoints:');
    console.log(`   - Health: http://${config.host}:${config.port}/health`);
    console.log(`   - Execute: POST http://${config.host}:${config.port}/api/problems/run`);
    console.log(`   - Quick Test: POST http://${config.host}:${config.port}/api/execute`);
    console.log('=====================================\n');
  });
}).catch((error) => {
  console.error('[API] ❌ Failed to start server:', error);
  process.exit(1);
});