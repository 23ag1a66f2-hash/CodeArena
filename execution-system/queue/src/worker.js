const Queue = require('bull');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Configure queue
const codeExecutionQueue = new Queue('code-execution', process.env.REDIS_URL);

// Language configurations
const SUPPORTED_LANGUAGES = ['python', 'javascript', 'typescript', 'java', 'cpp', 'c'];

async function executeCode(code, language, input) {
  // Create temp directory if it doesn't exist
  const tempDir = path.join(__dirname, '../../temp');
  await fs.mkdir(tempDir, { recursive: true });

  // Create files with proper names
  const fileMap = {
    python: '/tmp/code.py',
    javascript: '/tmp/code.js',
    typescript: '/tmp/code.ts',
    java: '/tmp/Solution.java',
    cpp: '/tmp/code.cpp',
    c: '/tmp/code.c'
  };

  const filePath = fileMap[language];
  await fs.writeFile(filePath, code);

  if (input) {
    await fs.writeFile('/tmp/input.txt', input);
  }

  // Execute in appropriate container
  const containerMap = {
    python: 'codearena-python',
    javascript: 'codearena-javascript',
    typescript: 'codearena-javascript',
    java: 'codearena-java',
    cpp: 'codearena-cpp',
    c: 'codearena-c'
  };

  const container = containerMap[language];
  const dockerArgs = [
    'run',
    '--rm',
    '--network=none',
    '--memory=128m',
    '--memory-swap=128m',
    '--cpus=0.5',
    '--pids-limit=64',
    '--ulimit', 'nofile=64:64',
    '--ulimit', 'nproc=32:32',
    '--ulimit', 'fsize=1000000:1000000',
    '--user', '1000:1000',
    '--read-only',
    '--security-opt=no-new-privileges',
    '--cap-drop=ALL',
    '-v', `${tempDir}:/tmp:rw`,
    container
  ];

  if (input) {
    dockerArgs.push('sh', '-c', `./execute.sh ${filePath} < /tmp/input.txt`);
  } else {
    dockerArgs.push('./execute.sh', filePath);
  }

  return new Promise((resolve, reject) => {
    const docker = spawn('docker', dockerArgs);
    let stdout = '';
    let stderr = '';

    docker.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    docker.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    docker.on('close', (code) => {
      resolve({
        output: stdout,
        error: stderr,
        exitCode: code
      });
    });

    docker.on('error', reject);
  });
}

// Process jobs from the queue
codeExecutionQueue.process(async (job) => {
  const { code, language, input } = job.data;

  try {
    console.log(`[WORKER] Processing ${language} code execution request`);
    const result = await executeCode(code, language, input);
    console.log(`[WORKER] Execution completed with code ${result.exitCode}`);
    return result;
  } catch (error) {
    console.error(`[WORKER] Execution failed:`, error);
    throw error;
  }
});

// Handle queue events
codeExecutionQueue.on('completed', (job, result) => {
  console.log(`[QUEUE] Job ${job.id} completed successfully`);
});

codeExecutionQueue.on('failed', (job, error) => {
  console.error(`[QUEUE] Job ${job.id} failed:`, error);
});

console.log('[WORKER] Code execution worker started'); 