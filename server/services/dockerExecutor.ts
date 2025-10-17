import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { randomBytes } from 'crypto';

// Language configurations
const SUPPORTED_LANGUAGES = ['python', 'javascript', 'typescript', 'java', 'cpp', 'c'] as const;
type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

const DOCKER_IMAGES: Record<SupportedLanguage, string> = {
  python: 'codearena-python:latest',
  javascript: 'codearena-javascript:latest',
  typescript: 'codearena-javascript:latest', // Uses Node
  java: 'codearena-java:latest',
  cpp: 'codearena-cpp:latest',
  c: 'codearena-c:latest'
};

const FILE_EXTENSIONS: Record<SupportedLanguage, string> = {
  python: '.py',
  javascript: '.js',
  typescript: '.ts',
  java: '.java',
  cpp: '.cpp',
  c: '.c'
};

const EXECUTION_COMMANDS: Record<SupportedLanguage, (filename: string) => string[]> = {
  python: (filename: string) => ['python3', `/tmp/${filename}`],
  javascript: (filename: string) => ['node', `/tmp/${filename}`],
  typescript: (filename: string) => ['ts-node', `/tmp/${filename}`],
  java: (filename: string) => {
    const className = 'Solution';
    return ['java', className];
  },
  cpp: (filename: string) => [`/tmp/${filename.replace('.cpp', '')}`],
  c: (filename: string) => [`/tmp/${filename.replace('.c', '')}`]
};

// Execution result interface
interface DockerExecutionResult {
  output: string;
  runtime: number;
  memory: number;
  error?: string;
  exitCode?: number;
}

export class DockerExecutor {
  private dockerPath: string | null = null;
  private readonly MAX_OUTPUT_SIZE = 1024 * 1024; // 1MB
  private readonly EXECUTION_TIMEOUT = 15000; // 15 seconds
  private readonly MAX_CODE_SIZE = 64 * 1024; // 64KB

  constructor() {
    this.initializeDocker();
  }

  private async initializeDocker() {
    try {
      // Find Docker path
      const isWindows = process.platform === 'win32';
      this.dockerPath = isWindows ? 'docker.exe' : 'docker';
    } catch (error) {
      console.error('[DOCKER-EXECUTOR] Failed to initialize Docker:', error);
      this.dockerPath = null;
    }
  }

  private async isDockerAvailable(): Promise<boolean> {
    if (!this.dockerPath) return false;
    
    try {
      const docker = spawn(this.dockerPath, ['version']);
      return new Promise((resolve) => {
        docker.on('close', (code) => resolve(code === 0));
      });
    } catch {
      return false;
    }
  }

  async executeCode(code: string, language: string, input?: string): Promise<DockerExecutionResult> {
    // Validate code size
    if (code.length > this.MAX_CODE_SIZE) {
      throw new Error(`Code size exceeds maximum limit of ${this.MAX_CODE_SIZE} bytes`);
    }

    // Check Docker availability
    const dockerAvailable = await this.isDockerAvailable();
    if (!dockerAvailable) {
      throw new Error('Docker is not available. Please ensure Docker Desktop is installed and running.');
    }

    const normalizedLanguage = language.toLowerCase() as SupportedLanguage;
    if (!SUPPORTED_LANGUAGES.includes(normalizedLanguage)) {
      throw new Error(`Unsupported language: ${language}. Supported languages are: ${SUPPORTED_LANGUAGES.join(', ')}`);
    }

    const tempId = randomBytes(8).toString('hex');
    const filename = `code_${tempId}${FILE_EXTENSIONS[normalizedLanguage]}`;
    const inputFilename = input ? `input_${tempId}.txt` : undefined;

    console.log(`[DOCKER-EXECUTOR] 📝 Creating temporary files: ${filename}`);

    try {
      // Setup temp directory
      const tempDir = join(process.cwd(), 'temp');
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true });
      }

      // Write files
      const codePath = join(tempDir, filename);
      const inputPath = inputFilename ? join(tempDir, inputFilename) : null;
      
      writeFileSync(codePath, code);
      if (input && inputPath) {
        writeFileSync(inputPath, input);
      }

      console.log(`[DOCKER-EXECUTOR] 🚀 Executing in Docker container...`);
      
      const startTime = Date.now();
      const result = await this.runInDocker(
        normalizedLanguage, 
        filename, 
        inputFilename
      );
      const endTime = Date.now();

      // Cleanup
      try {
        if (existsSync(codePath)) unlinkSync(codePath);
        if (inputPath && existsSync(inputPath)) unlinkSync(inputPath);
      } catch (cleanupError) {
        console.warn('[DOCKER-EXECUTOR] Cleanup warning:', cleanupError);
      }

      console.log(`[DOCKER-EXECUTOR] ✅ Execution completed in ${endTime - startTime}ms`);
      
      return {
        ...result,
        runtime: endTime - startTime
      };

    } catch (error) {
      console.error('[DOCKER-EXECUTOR] ❌ Execution failed:', error);
      throw error;
    }
  }

  private runInDocker(language: SupportedLanguage, filename: string, inputFilename?: string): Promise<DockerExecutionResult> {
    return new Promise((resolve, reject) => {
      const image = DOCKER_IMAGES[language];
      const command = EXECUTION_COMMANDS[language](filename);
      
      if (!this.dockerPath) {
        reject(new Error('Docker path not found'));
        return;
      }

      // Enhanced security options with fixed tmp mount
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
        '-v', `${join(process.cwd(), 'temp')}:/tmp:rw`, // Mount temp directory with write access
        image
      ];

      // Add code file and input redirection
      if (inputFilename) {
        dockerArgs.push('sh', '-c', `${command.join(' ')} < /tmp/${inputFilename}`);
      } else {
        dockerArgs.push(...command);
      }

      console.log(`[DOCKER-EXECUTOR] Running command: ${this.dockerPath} ${dockerArgs.join(' ')}`);

      let stdout = '';
      let stderr = '';
      let killed = false;

      const docker = spawn(this.dockerPath, dockerArgs, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: this.EXECUTION_TIMEOUT
      });

      // Handle output streams
      docker.stdout.on('data', (data) => {
        if (stdout.length + data.length <= this.MAX_OUTPUT_SIZE) {
          stdout += data;
        } else if (!killed) {
          killed = true;
          docker.kill();
          reject(new Error('Output size limit exceeded'));
        }
      });

      docker.stderr.on('data', (data) => {
        if (stderr.length + data.length <= this.MAX_OUTPUT_SIZE) {
          stderr += data;
        }
      });

      // Handle process exit
      docker.on('close', (code) => {
        if (killed) return;

        resolve({
          output: stdout,
          error: stderr || undefined,
          exitCode: code || 0,
          memory: 0, // Memory usage tracking to be implemented
          runtime: 0 // Runtime will be calculated by the caller
        });
      });

      // Handle errors
      docker.on('error', (error) => {
        if (!killed) {
          reject(new Error(`Docker execution failed: ${error.message}`));
        }
      });

      // Set timeout
      setTimeout(() => {
        if (!killed) {
          killed = true;
          docker.kill();
          reject(new Error('Execution timeout'));
        }
      }, this.EXECUTION_TIMEOUT);
    });
  }
}

export const dockerExecutor = new DockerExecutor(); 