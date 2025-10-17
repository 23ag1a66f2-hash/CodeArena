const Queue = require('bull');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

// Configure queue
const codeExecutionQueue = new Queue('code-execution', process.env.REDIS_URL);

// Language configurations
const SUPPORTED_LANGUAGES = ['python', 'javascript', 'typescript', 'java', 'cpp', 'c'];

// Execution timeout (15 seconds)
const EXECUTION_TIMEOUT = 15000;

// Create temp directory if it doesn't exist
const TEMP_DIR = path.join(__dirname, '..', 'temp');
fs.mkdir(TEMP_DIR, { recursive: true }).catch(console.error);

/**
 * Clean up temporary files
 */
async function cleanup(files) {
    for (const file of files) {
        try {
            await fs.unlink(file);
        } catch (error) {
            console.error(`Failed to delete ${file}:`, error);
        }
    }
}

/**
 * Execute code in a Docker container
 */
async function executeInDocker(code, language, input) {
    // Validate language
    if (!SUPPORTED_LANGUAGES.includes(language)) {
        throw new Error(`Unsupported language: ${language}`);
    }

    // Generate unique filenames
    const tempId = crypto.randomBytes(8).toString('hex');
    const codeFile = `code_${tempId}${getFileExtension(language)}`;
    const inputFile = input ? `input_${tempId}.txt` : null;
    const codePath = path.join(TEMP_DIR, codeFile);
    const inputPath = inputFile ? path.join(TEMP_DIR, inputFile) : null;

    try {
        // Write code and input files
        await fs.writeFile(codePath, code);
        if (input && inputPath) {
            await fs.writeFile(inputPath, input);
        }

        // Build Docker command
        const dockerImage = `codearena-${language}:latest`;
        const dockerArgs = [
            'run',
            '--rm',                                    // Remove container after execution
            '--network=none',                          // No network access
            '--memory=128m',                          // Memory limit
            '--memory-swap=128m',                     // Swap limit
            '--cpus=0.5',                             // CPU limit
            '--pids-limit=64',                        // Process limit
            '--ulimit', 'nofile=64:64',               // File descriptor limit
            '--ulimit', 'nproc=32:32',                // Process limit
            '--ulimit', 'fsize=1000000:1000000',      // File size limit (1MB)
            '--user', '1000:1000',                    // Non-root user
            '--read-only',                            // Read-only filesystem
            '--security-opt=no-new-privileges',        // Prevent privilege escalation
            '--cap-drop=ALL',                         // Drop all capabilities
            '--tmpfs', '/tmp:exec,size=10m,mode=777', // Writable temp directory
            '-v', `${TEMP_DIR}:/tmp:ro`,              // Mount code files
            dockerImage
        ];

        // Add code file and input redirection
        if (inputFile) {
            dockerArgs.push('sh', '-c', `./execute.sh /tmp/${codeFile} < /tmp/${inputFile}`);
        } else {
            dockerArgs.push('./execute.sh', `/tmp/${codeFile}`);
        }

        // Execute Docker command
    const startTime = Date.now();
        const { stdout, stderr } = await new Promise((resolve, reject) => {
            let output = '';
            let error = '';
            
            const docker = spawn('docker', dockerArgs, {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            docker.stdout.on('data', (data) => {
                output += data.toString();
            });

            docker.stderr.on('data', (data) => {
                error += data.toString();
            });

            docker.on('close', (code) => {
                resolve({ stdout: output, stderr: error, code });
            });

            docker.on('error', reject);

            // Set timeout
            const timeout = setTimeout(() => {
                docker.kill();
                reject(new Error('Execution timeout'));
            }, EXECUTION_TIMEOUT);

            docker.on('close', () => clearTimeout(timeout));
        });

        const endTime = Date.now();

        // Parse execution stats from stderr
        const statsMatch = stderr.match(/__EXECUTION_STATS__:(\{.*\})/);
        const stats = statsMatch ? JSON.parse(statsMatch[1]) : {
            runtime_ms: endTime - startTime,
            memory_bytes: 0,
            success: false
        };

        return {
            output: stdout.trim(),
            error: stderr.trim(),
            ...stats
      };

    } finally {
        // Clean up temporary files
        const filesToClean = [codePath];
        if (inputPath) filesToClean.push(inputPath);
        await cleanup(filesToClean);
    }
}

/**
 * Get file extension for language
 */
function getFileExtension(language) {
    const extensions = {
        python: '.py',
        javascript: '.js',
        typescript: '.ts',
        java: '.java',
        cpp: '.cpp',
        c: '.c'
    };
    return extensions[language] || '.txt';
}

/**
 * Process jobs from the queue
 */
codeExecutionQueue.process(async (job) => {
    const { code, language, input } = job.data;

    try {
        console.log(`[WORKER] Processing ${language} code execution request`);
        const result = await executeInDocker(code, language, input);
        console.log(`[WORKER] Execution completed successfully`);
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