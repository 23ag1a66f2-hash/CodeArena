import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ExecutionResult {
  output: string;
  error: string | null;
  runtime: number;
  memory: number;
}

interface TestCaseResult {
  passed: boolean;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  runtime: number;
  memory: number;
  error: string | null;
  isHidden?: boolean;
}

export class ExecutionService {
  private readonly TEMP_DIR = path.resolve('/tmp', 'execution-system-temp');
  private readonly FILE_EXTENSIONS: Record<string, string> = {
    'python': '.py',
    'javascript': '.js',
    'typescript': '.ts',
    'java': '.java',
    'cpp': '.cpp',
    'c': '.c'
  };

  private readonly DOCKER_CONTAINERS: Record<string, string> = {
    'python': 'execution-system-python-executor-1',
    'javascript': 'execution-system-javascript-executor-1',
    'typescript': 'execution-system-javascript-executor-1',
    'java': 'execution-system-java-executor-1',
    'cpp': 'execution-system-cpp-executor-1',
    'c': 'execution-system-c-executor-1'
  };

  // Static initialization method that returns the instance
  public static async init(): Promise<ExecutionService> {
    const service = new ExecutionService();
    // This is the CRITICAL part - we await the setup here.
    await service.ensureTempDir();
    await service.cleanupExistingFiles();
    return service;
  }

  // The constructor should not perform async operations.
  private constructor() {
    console.log(`[EXEC-SERVICE] 🗂️ Temp directory path: ${this.TEMP_DIR}`);
  }

  private async ensureTempDir() {
    try {
      console.log(`[EXEC-SERVICE] 🗂️ Attempting to use temp directory: ${this.TEMP_DIR}`);
      
      await fs.mkdir(this.TEMP_DIR, { recursive: true });
      // Set permissions to allow Docker containers to write
      await fs.chmod(this.TEMP_DIR, 0o777);
      
      console.log(`[EXEC-SERVICE] ✅ Temp directory ready: ${this.TEMP_DIR}`);
    } catch (error: any) {
      console.error(`[EXEC-SERVICE] ❌ Failed to create/access temp directory: ${this.TEMP_DIR}`, error);
      throw new Error(`Failed to create temp directory: ${error.message}`);
    }
  }

  private async cleanupExistingFiles() {
    try {
      const tempFiles = await fs.readdir(this.TEMP_DIR);
      const filesToRemove = tempFiles.filter(file => 
        file.startsWith('code.') || 
        file.startsWith('input') || 
        file.endsWith('.py') || 
        file.endsWith('.js') || 
        file.endsWith('.java') || 
        file.endsWith('.cpp') || 
        file.endsWith('.c') ||
        file.startsWith('.class')
      );
      
      if (filesToRemove.length > 0) {
        console.log(`[EXEC-SERVICE] 🧹 Cleaning up ${filesToRemove.length} leftover files on startup`);
        for (const file of filesToRemove) {
          try {
            await fs.unlink(path.join(this.TEMP_DIR, file));
            console.log(`[EXEC-SERVICE] 🧹 Cleaned up: ${file}`);
          } catch (error) {
            // Ignore cleanup errors
          }
        }
      }
    } catch (error) {
      // Ignore errors reading temp directory
    }
  }

  private getFilename(language: string): string {
    const ext = this.FILE_EXTENSIONS[language];
    if (!ext) {
      throw new Error(`Unsupported language: ${language}`);
    }

    if (language === 'java') {
      return 'Solution.java';
    }

    return `code${ext}`;
  }

  private async writeFile(content: string, filename: string): Promise<void> {
    const filepath = path.join(this.TEMP_DIR, filename);
    try {
      await fs.writeFile(filepath, content);
      // Set permissions to allow Docker containers to read
      await fs.chmod(filepath, 0o666);
    } catch (error: any) {
      console.error(`Failed to write file ${filepath}:`, error);
      throw new Error(`Failed to write file ${filepath}: ${error.message}`);
    }
  }

  private async cleanupFiles(files: string[]): Promise<void> {
    for (const filename of files) {
      try {
        const filepath = path.join(this.TEMP_DIR, filename);
        await fs.unlink(filepath);
        console.log(`[EXEC-SERVICE] 🧹 Cleaned up: ${filename}`);
      } catch (error: any) {
        // Ignore cleanup errors - file might not exist
        console.warn(`[EXEC-SERVICE] Cleanup warning for ${filename}:`, error.message);
      }
    }
  }

  public async cleanupAllTempFiles(): Promise<void> {
    try {
      console.log(`[EXEC-SERVICE] 🧹 Starting comprehensive temp directory cleanup...`);
      console.log(`[EXEC-SERVICE] 🧹 Target directory: ${this.TEMP_DIR}`);
      
      const files = await fs.readdir(this.TEMP_DIR);
      console.log(`[EXEC-SERVICE] 🧹 Found ${files.length} files in temp directory:`, files);
      
      const cleanupPatterns = [
        /^code.*\.py$/, /^code.*\.js$/, /^code.*\.ts$/,
        /^Solution.*\.java$/, /^Solution.*\.class$/,
        /^code.*\.cpp$/, /^code.*\.c$/,
        /^exec.*$/, 
        /^input.*\.txt$/,
        /^temp.*$/, /^.*\.tmp$/
      ];
      
      let cleanedCount = 0;
      
      for (const file of files) {
        const shouldClean = cleanupPatterns.some(pattern => pattern.test(file));
        
        if (shouldClean) {
          try {
            const filePath = path.join(this.TEMP_DIR, file);
            const stats = await fs.stat(filePath);
            
            if (stats.isFile()) {
              await fs.unlink(filePath);
              console.log(`[EXEC-SERVICE] 🧹 Cleaned up: ${file}`);
              cleanedCount++;
            } else {
              console.log(`[EXEC-SERVICE] ⚠️ Skipping directory: ${file}`);
            }
          } catch (err: any) {
            console.log(`[EXEC-SERVICE] ⚠️ Could not clean up ${file}:`, err.message);
          }
        } else {
          console.log(`[EXEC-SERVICE] ℹ️ Skipping file (doesn't match patterns): ${file}`);
        }
      }
      
      console.log(`[EXEC-SERVICE] 🧹 Cleanup completed. Removed ${cleanedCount} temporary files.`);
      
    } catch (error: any) {
      console.error('[EXEC-SERVICE] ❌ Error during cleanup:', error);
    }
  }

  private async executeInDocker(language: string, filename: string, input?: string): Promise<ExecutionResult> {
    const containerName = this.DOCKER_CONTAINERS[language];
    if (!containerName) {
      throw new Error(`Unsupported language: ${language}`);
    }

    const copyArgs = ['cp', `${this.TEMP_DIR}/${filename}`, `${containerName}:/tmp/${filename}`];
    console.log(`[DOCKER-EXECUTOR] 📋 Copying file to container: docker ${copyArgs.join(' ')}`);
    
    try {
      const copyProcess = spawn('docker', copyArgs);
      await new Promise((resolve, reject) => {
        copyProcess.on('close', (code) => {
          if (code === 0) {
            console.log(`[DOCKER-EXECUTOR] ✅ File copied successfully`);
            resolve(null);
          } else {
            reject(new Error(`Failed to copy file to container: exit code ${code}`));
          }
        });
        copyProcess.on('error', reject);
      });
    } catch (error) {
      console.error(`[DOCKER-EXECUTOR] ❌ Failed to copy file:`, error);
      throw error;
    }

    const dockerArgs = [
      'exec',
      containerName
    ];

    const commands = {
      python: ['python3', `/tmp/${filename}`],
      javascript: ['node', `/tmp/${filename}`],
      typescript: ['ts-node', `/tmp/${filename}`],
      java: ['sh', '-c', `cd /tmp && javac ${filename} && java Solution`],
      cpp: ['sh', '-c', `cd /tmp && g++ -std=c++17 -o exec ${filename} && ./exec`],
      c: ['sh', '-c', `cd /tmp && gcc -o exec ${filename} && ./exec`]
    };

    const command = commands[language as keyof typeof commands];
    
    console.log(`[DOCKER-EXECUTOR] 📥 Input check: "${input || 'none'}"`);
    if (input) {
      const inputFile = `input-${Date.now()}.txt`;
      console.log(`[DOCKER-EXECUTOR] 📄 Creating input file: ${inputFile}`);
      await this.writeFile(input, inputFile);
      
      const copyInputArgs = ['cp', `${this.TEMP_DIR}/${inputFile}`, `${containerName}:/tmp/${inputFile}`];
      console.log(`[DOCKER-EXECUTOR] 📋 Copying input file: docker ${copyInputArgs.join(' ')}`);
      
      const copyInputProcess = spawn('docker', copyInputArgs);
      await new Promise((resolve, reject) => {
        copyInputProcess.on('close', (code) => {
          if (code === 0) {
            console.log(`[DOCKER-EXECUTOR] ✅ Input file copied successfully`);
            resolve(null);
          } else {
            reject(new Error(`Failed to copy input file: exit code ${code}`));
          }
        });
        copyInputProcess.on('error', reject);
      });
      
      if (language === 'python' || language === 'javascript' || language === 'typescript') {
        dockerArgs.push('sh', '-c', `${command.join(' ')} < /tmp/${inputFile}`);
      } else {
        dockerArgs.push('sh', '-c', `cd /tmp && ${command.join(' ')} < /tmp/${inputFile}`);
      }
    } else {
        console.log(`[DOCKER-EXECUTOR] ⚠️ No input provided, running without input`);
        dockerArgs.push(...command);
      }

    console.log(`[DOCKER-EXECUTOR] 🐳 Running Docker command: docker ${dockerArgs.join(' ')}`);
    console.log(`[DOCKER-EXECUTOR] 📁 Using container: ${containerName}`);
    console.log(`[DOCKER-EXECUTOR] 📄 Code file: ${filename}`);

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
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
        const runtime = Date.now() - startTime;
        const memory = 0; 

        console.log(`[DOCKER-EXECUTOR] ✅ Docker execution completed in ${runtime}ms with exit code: ${code}`);
        console.log(`[DOCKER-EXECUTOR] 📤 STDOUT:`, stdout.slice(0, 200));
        console.log(`[DOCKER-EXECUTOR] 📤 STDERR:`, stderr.slice(0, 200));

        if (code === 0) {
          console.log(`[DOCKER-EXECUTOR] 🎉 DOCKER EXECUTION SUCCESSFUL`);
          resolve({
            output: stdout.trim(),
            error: null,
            runtime,
            memory
          });
        } else {
          console.log(`[DOCKER-EXECUTOR] ❌ DOCKER EXECUTION FAILED`);
          resolve({
            output: '',
            error: stderr.trim() || `Process exited with code ${code}`,
            runtime,
            memory
          });
        }
      });

      docker.on('error', (err) => {
        console.error(`[DOCKER-EXECUTOR] 💥 Docker spawn error:`, err);
        reject(err);
      });

      setTimeout(() => {
        console.log(`[DOCKER-EXECUTOR] ⏰ Docker execution timed out after 15s`);
        docker.kill();
        reject(new Error('Execution timed out'));
      }, 15000);
    });
  }

  private async executeInDockerOptimized(language: string, filename: string, input?: string): Promise<ExecutionResult> {
    const containerName = this.DOCKER_CONTAINERS[language];
    if (!containerName) {
      throw new Error(`Unsupported language: ${language}`);
    }

    const copyArgs = ['cp', `${this.TEMP_DIR}/${filename}`, `${containerName}:/tmp/${filename}`];
    console.log(`[DOCKER-EXECUTOR] 📋 Copying file to container (OPTIMIZED): docker ${copyArgs.join(' ')}`);
    
    try {
      const copyProcess = spawn('docker', copyArgs);
      await new Promise((resolve, reject) => {
        copyProcess.on('close', (code) => {
          if (code === 0) {
            console.log(`[DOCKER-EXECUTOR] ✅ File copied successfully (OPTIMIZED)`);
            resolve(null);
          } else {
            reject(new Error(`Failed to copy file to container: exit code ${code}`));
          }
        });
        copyProcess.on('error', reject);
      });
    } catch (error) {
      console.error(`[DOCKER-EXECUTOR] ❌ Failed to copy file (OPTIMIZED):`, error);
      throw error;
    }

    const dockerArgs = [
      'exec',
      containerName
    ];

    const commands = {
      python: ['python3', `/tmp/${filename}`],
      javascript: ['node', `/tmp/${filename}`],
      typescript: ['ts-node', `/tmp/${filename}`],
      java: ['sh', '-c', `cd /tmp && javac ${filename} && java Solution`],
      cpp: ['sh', '-c', `cd /tmp && g++ -std=c++17 -o exec ${filename} && ./exec`],
      c: ['sh', '-c', `cd /tmp && gcc -o exec ${filename} && ./exec`]
    };

    const command = commands[language as keyof typeof commands];
    
    const inputFile = 'input.txt';
    
    if (input !== undefined && input !== null) {
      await this.writeFile(input, inputFile);
      
      const copyInputArgs = ['cp', `${this.TEMP_DIR}/${inputFile}`, `${containerName}:/tmp/${inputFile}`];
      console.log(`[DOCKER-EXECUTOR] 📋 Copying input file (OPTIMIZED): docker ${copyInputArgs.join(' ')}`);
      
      const copyInputProcess = spawn('docker', copyInputArgs);
      await new Promise((resolve, reject) => {
        copyInputProcess.on('close', (code) => {
          if (code === 0) {
            console.log(`[DOCKER-EXECUTOR] ✅ Input file copied successfully (OPTIMIZED)`);
            resolve(null);
          } else {
            reject(new Error(`Failed to copy input file: exit code ${code}`));
          }
        });
        copyInputProcess.on('error', reject);
      });
      
      if (language === 'python' || language === 'javascript' || language === 'typescript') {
        dockerArgs.push('sh', '-c', `${command.join(' ')} < /tmp/${inputFile}`);
      } else {
        dockerArgs.push('sh', '-c', `cd /tmp && ${command.join(' ')} < /tmp/${inputFile}`);
      }
    } else {
      dockerArgs.push(...command);
    }

    console.log(`[DOCKER-EXECUTOR] 🐳 Running Docker command (OPTIMIZED): docker ${dockerArgs.join(' ')}`);
    console.log(`[DOCKER-EXECUTOR] 📁 Using container: ${containerName}`);
    console.log(`[DOCKER-EXECUTOR] 📄 Code file: ${filename}`);

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      try {
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
          const runtime = Date.now() - startTime;
          const memory = 0;

          console.log(`[DOCKER-EXECUTOR] ✅ Docker execution completed in ${runtime}ms with exit code: ${code}`);
          console.log(`[DOCKER-EXECUTOR] 📤 STDOUT:`, stdout.slice(0, 200));
          console.log(`[DOCKER-EXECUTOR] 📤 STDERR:`, stderr.slice(0, 200));

          if (code === 0) {
            console.log(`[DOCKER-EXECUTOR] 🎉 DOCKER EXECUTION SUCCESSFUL`);
            resolve({
              output: stdout.trim(),
              error: null,
              runtime,
              memory
            });
          } else {
            console.log(`[DOCKER-EXECUTOR] ❌ DOCKER EXECUTION FAILED`);
            resolve({
              output: '',
              error: stderr.trim() || `Process exited with code ${code}`,
              runtime,
              memory
            });
          }
        });

        docker.on('error', (err) => {
          console.error(`[DOCKER-EXECUTOR] 💥 Docker spawn error (OPTIMIZED):`, err);
          reject(err);
        });

        setTimeout(() => {
          console.log(`[DOCKER-EXECUTOR] ⏰ Docker execution timed out after 15s (OPTIMIZED)`);
          docker.kill();
          reject(new Error('Execution timed out'));
        }, 15000);
      } catch (error) {
        console.error(`[DOCKER-EXECUTOR] 💥 Docker spawn failed (OPTIMIZED):`, error);
        reject(error);
      }
    });
  }

  private async executeRemote(language: string, code: string, input?: string): Promise<ExecutionResult> {
    const base = process.env.EXECUTION_API_URL;
    if (!base) {
      throw new Error('EXECUTION_API_URL not set');
    }

    const url = `${base.replace(/\/$/, '')}/api/execute`;
    const started = Date.now();
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, language, input: input ?? '' })
      } as any);

      const data: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = data?.error || `Remote executor responded with ${res.status}`;
        throw new Error(message);
      }

      return {
        output: data.output || '',
        error: data.error || null,
        runtime: typeof data.runtime === 'number' ? data.runtime : Date.now() - started,
        memory: typeof data.memory === 'number' ? data.memory : 0
      };
    } catch (err: any) {
      console.error('[EXEC-SERVICE] ❌ Remote execution failed:', err);
      return {
        output: '',
        error: `Remote execution failed: ${err.message || String(err)}`,
        runtime: 0,
        memory: 0
      };
    }
  }

  async executeCode(code: string, language: string, input?: string): Promise<ExecutionResult> {
    console.log(`[EXEC-SERVICE] 🚀 Executing ${language} code...`);
    console.log(`[EXEC-SERVICE] 🔍 Attempting Docker execution...`);
    console.log(`[EXEC-SERVICE] 📥 Input received: "${input || 'none'}"`);
    console.log(`[EXEC-SERVICE] 📥 Input type: ${typeof input}`);
    console.log(`[EXEC-SERVICE] 📥 Input length: ${input ? input.length : 0}`);
    
    const filename = this.getFilename(language);
    const filesToCleanup = [filename];

    if (process.env.EXECUTION_API_URL) {
      return this.executeRemote(language, code, input);
    }
    
    try {
      await this.writeFile(code, filename);
      
      const result = await this.executeInDocker(language, filename, input);
      console.log(`[EXEC-SERVICE] ✅ Docker execution completed successfully:`, result);
      return result;
    } catch (error: any) {
      console.error(`[EXEC-SERVICE] ❌ Docker execution failed:`, error);
      console.error(`[EXEC-SERVICE] 🔍 Error details:`, {
        message: error.message,
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        path: error.path
      });
      
      return {
        output: '',
        error: `Docker execution failed: ${error.message}`,
        runtime: 0,
        memory: 0
      };
    } finally {
      await this.cleanupAllTempFiles();
      console.log(`[EXEC-SERVICE] 🧹 Cleaned up ALL temp files after single execution`);
      
      try {
        const tempFiles = await fs.readdir(this.TEMP_DIR);
        const filesToRemove = tempFiles.filter((file: string) => 
          file.startsWith('code.') || 
          file.startsWith('input') || 
          file.startsWith('exec') ||
          file.endsWith('.py') || 
          file.endsWith('.js') || 
          file.endsWith('.java') || 
          file.endsWith('.cpp') || 
          file.endsWith('.c') ||
          file.endsWith('.class')
        );
        
        if (filesToRemove.length > 0) {
          for (const file of filesToRemove) {
            try {
              await fs.unlink(path.join(this.TEMP_DIR, file));
              console.log(`[EXEC-SERVICE] 🧹 Cleaned up leftover file: ${file}`);
            } catch (error) {
              // Ignore cleanup errors for leftover files
            }
          }
        }
      } catch (error) {
        // Ignore errors reading temp directory
      }
    }
  }

  async executeWithTestCases(
    code: string,
    language: string,
    testCases: Array<{ input: string; expectedOutput: string; isHidden?: boolean }>
  ): Promise<{
    testResults: TestCaseResult[];
    allTestsPassed: boolean;
    visibleTestsPassed: boolean;
    hiddenTestsPassed: boolean;
    runtime: number;
    memory: number;
  }> {
    console.log(`[EXEC-SERVICE] 🧪 Running test cases...`);
    console.log(`[EXEC-SERVICE] Number of test cases:`, testCases.length);
    
    if (process.env.EXECUTION_API_URL) {
      const testResults: TestCaseResult[] = [];
      let maxRuntime = 0;
      let maxMemory = 0;
      let visiblePassed = 0;
      let visibleTotal = 0;
      let hiddenPassed = 0;
      let hiddenTotal = 0;

      for (const testCase of testCases) {
        try {
          const result = await this.executeRemote(language, code, testCase.input);
          const actualOutput = (result.output || '').trim();
          const expectedOutput = (testCase.expectedOutput || '').trim();
          const passed = !result.error && actualOutput === expectedOutput;

          if (testCase.isHidden) {
            hiddenTotal++;
            if (passed) hiddenPassed++;
          } else {
            visibleTotal++;
            if (passed) visiblePassed++;
          }

          maxRuntime = Math.max(maxRuntime, result.runtime);
          maxMemory = Math.max(maxMemory, result.memory);

          testResults.push({
            passed,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput,
            runtime: result.runtime,
            memory: result.memory,
            error: result.error,
            isHidden: testCase.isHidden
          });
        } catch (err: any) {
          testResults.push({
            passed: false,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput: '',
            runtime: 0,
            memory: 0,
            error: err?.message || String(err),
            isHidden: testCase.isHidden
          });

          if (testCase.isHidden) {
            hiddenTotal++;
          } else {
            visibleTotal++;
          }
        }
      }

      const allTestsPassed = testResults.every(r => r.passed);
      const visibleTestsPassed = visiblePassed === visibleTotal;
      const hiddenTestsPassed = hiddenPassed === hiddenTotal;

      return {
        testResults,
        allTestsPassed,
        visibleTestsPassed,
        hiddenTestsPassed,
        runtime: maxRuntime,
        memory: maxMemory
      };
    }

    const filename = this.getFilename(language);
    await this.writeFile(code, filename);

    const testResults: TestCaseResult[] = [];
    let maxRuntime = 0;
    let maxMemory = 0;
    let visiblePassed = 0;
    let visibleTotal = 0;
    let hiddenPassed = 0;
    let hiddenTotal = 0;

    try {
      for (const testCase of testCases) {
        try {
          console.log(`[EXEC-SERVICE] Running test case with input:`, testCase.input);
          const result = await this.executeInDockerOptimized(language, filename, testCase.input);
          
          if (result.error) {
            console.error(`[EXEC-SERVICE] ❌ Docker execution failed for test case:`, result.error);
            throw new Error(`Docker execution failed: ${result.error}`);
          }
          
          const actualOutput = (result.output || '').trim();
          const expectedOutput = (testCase.expectedOutput || '').trim();
          const passed = actualOutput === expectedOutput;

          console.log(`[EXEC-SERVICE] Test case result:`, {
            passed,
            actualOutput,
            expectedOutput,
            error: result.error
          });

          if (testCase.isHidden) {
            hiddenTotal++;
            if (passed) hiddenPassed++;
          } else {
            visibleTotal++;
            if (passed) visiblePassed++;
          }

          maxRuntime = Math.max(maxRuntime, result.runtime);
          maxMemory = Math.max(maxMemory, result.memory);

          testResults.push({
            passed,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput,
            runtime: result.runtime,
            memory: result.memory,
            error: result.error,
            isHidden: testCase.isHidden
          });
        } catch (error: any) {
          console.error(`[EXEC-SERVICE] ❌ Test case failed:`, error);
          
          testResults.push({
            passed: false,
            input: testCase.input,
            expectedOutput: testCase.expectedOutput,
            actualOutput: '',
            runtime: 0,
            memory: 0,
            error: error.message,
            isHidden: testCase.isHidden
          });

          if (testCase.isHidden) {
            hiddenTotal++;
          } else {
            visibleTotal++;
          }
        }
      }
    } finally {
      await this.cleanupAllTempFiles();
      console.log(`[EXEC-SERVICE] 🧹 Cleaned up ALL temp files after submission`);
      
      try {
        const tempFiles = await fs.readdir(this.TEMP_DIR);
        const filesToRemove = tempFiles.filter(file => 
          file.startsWith('code.') || 
          file.startsWith('input') || 
          file.startsWith('exec') ||
          file.endsWith('.py') || 
          file.endsWith('.js') || 
          file.endsWith('.java') || 
          file.endsWith('.cpp') || 
          file.endsWith('.c')
        );
        
        if (filesToRemove.length > 0) {
          for (const file of filesToRemove) {
            try {
              await fs.unlink(path.join(this.TEMP_DIR, file));
              console.log(`[EXEC-SERVICE] 🧹 Cleaned up leftover file: ${file}`);
            } catch (error) {
              // Ignore cleanup errors for leftover files
            }
          }
        }
      } catch (error) {
        // Ignore errors reading temp directory
      }
    }

    const allTestsPassed = testResults.every(r => r.passed);
    const visibleTestsPassed = visiblePassed === visibleTotal;
    const hiddenTestsPassed = hiddenPassed === hiddenTotal;

    console.log(`[EXEC-SERVICE] Test execution summary:`, {
      allTestsPassed,
      visibleTestsPassed,
      hiddenTestsPassed,
      visibleStats: `${visiblePassed}/${visibleTotal}`,
      hiddenStats: `${hiddenPassed}/${hiddenTotal}`
    });

    return {
      testResults,
      allTestsPassed,
      visibleTestsPassed,
      hiddenTestsPassed,
      runtime: maxRuntime,
      memory: maxMemory
    };
  }

  async executeWithCustomInput(
    code: string,
    language: string,
    customInput: string
  ): Promise<{
    output: string;
    error: string | null;
    runtime: number;
    memory: number;
    input: string;
  }> {
    console.log(`[EXEC-SERVICE] 🎯 Executing code with custom input for ${language}`);
    
    if (process.env.EXECUTION_API_URL) {
      const result = await this.executeRemote(language, code, customInput);
      return {
        output: result.output,
        error: result.error,
        runtime: result.runtime,
        memory: result.memory,
        input: customInput
      };
    }
    
    try {
      const filename = this.getFilename(language);
      await this.writeFile(code, filename);
      
      const result = await this.executeInDocker(language, filename, customInput);
      
      return {
        output: result.output,
        error: result.error,
        runtime: result.runtime,
        memory: result.memory,
        input: customInput
      };
    } catch (error: any) {
      console.error(`[EXEC-SERVICE] ❌ Custom input execution failed:`, error);
      throw error;
    } finally {
      await this.cleanupAllTempFiles();
      console.log(`[EXEC-SERVICE] 🧹 Cleaned up ALL temp files after custom input execution`);
    }
  }
} 

const executionServicePromise = ExecutionService.init();

export { executionServicePromise };
export default executionServicePromise;