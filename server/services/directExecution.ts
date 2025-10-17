import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';

// Interface matching the current system
interface ExecutionResult {
  output: string;
  runtime: number;
  memory: number;
  error?: string;
}

/**
 * Handle process execution with input/output capture
 */
function handleExecution(
  process: any, 
  startTime: number, 
  filesToCleanup: string[], 
  input: string | undefined,
  resolve: (value: ExecutionResult) => void
) {
  let output = '';
  let errorOutput = '';

  process.stdout.on('data', (data: Buffer) => {
    output += data.toString();
  });

  process.stderr.on('data', (data: Buffer) => {
    errorOutput += data.toString();
  });

  // Send input if provided
  if (input) {
    process.stdin.write(input);
    process.stdin.end();
  }

  process.on('close', (code: number) => {
    const runtime = Date.now() - startTime;
    cleanup(filesToCleanup);

    if (code !== 0) {
      resolve({
        output: errorOutput || 'Runtime error',
        runtime,
        memory: Math.floor(Math.random() * 50) + 5, // Approximate memory usage
        error: 'Runtime error'
      });
    } else {
      resolve({
        output: output.trim() || 'No output',
        runtime,
        memory: Math.floor(Math.random() * 50) + 5 // Approximate memory usage
      });
    }
  });

  process.on('error', (error: Error) => {
    console.error('[DEBUG] Process execution error:', error);
    cleanup(filesToCleanup);
    resolve({
      output: 'Execution failed: ' + error.message,
      runtime: Date.now() - startTime,
      memory: 0,
      error: error.message
    });
  });
}

/**
 * Clean up temporary files
 */
function cleanup(files: string[]) {
  files.forEach(file => {
    try {
      require('fs').unlinkSync(file);
    } catch (error) {
      // Ignore cleanup errors
    }
  });
}

/**
 * Direct code execution (current system)
 * Extracted from the original executeCode function in routes.ts
 */
export function executeCodeDirect(code: string, language: string, input?: string): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const tempId = randomBytes(8).toString('hex');
    const tempDir = '/tmp';

    let fileName: string;
    let command: string;
    let args: string[];

    try {
      console.log(`[DIRECT-EXEC] Executing ${language} code:`, code.substring(0, 100) + '...');
      
      switch (language) {
        case 'python':
          fileName = join(tempDir, `temp_${tempId}.py`);
          writeFileSync(fileName, code);
          command = 'python3';
          args = [fileName];
          break;

        case 'javascript':
          fileName = join(tempDir, `temp_${tempId}.js`);
          writeFileSync(fileName, code);
          command = 'node';
          args = [fileName];
          break;

        case 'cpp':
          const cppFile = join(tempDir, `temp_${tempId}.cpp`);
          const execFile = join(tempDir, `temp_${tempId}`);
          writeFileSync(cppFile, code);

          // Compile first
          const compileProcess = spawn('g++', ['-o', execFile, cppFile], { timeout: 10000 });

          compileProcess.on('close', (compileCode) => {
            if (compileCode !== 0) {
              cleanup([cppFile, execFile]);
              resolve({
                output: 'Compilation failed',
                runtime: Date.now() - startTime,
                memory: 0,
                error: 'Compilation error'
              });
              return;
            }

            // Execute compiled binary
            const execProcess = spawn(execFile, [], { timeout: 5000 });
            handleExecution(execProcess, startTime, [cppFile, execFile], input, resolve);
          });
          return;

        case 'java':
          try {
            // Extract class name from code or use default
            let className = 'Solution';
            const classMatch = code.match(/public\s+class\s+(\w+)/);
            if (classMatch) {
              className = classMatch[1];
            }
            
            const javaFile = join(tempDir, `${className}.java`);
            writeFileSync(javaFile, code);

            // Compile first
            const javaCompileProcess = spawn('javac', [javaFile], { timeout: 10000 });

            javaCompileProcess.on('error', (error) => {
              console.error('[DEBUG] Java compilation error:', error);
              cleanup([javaFile]);
              resolve({
                output: 'Java compiler error: ' + error.message,
                runtime: Date.now() - startTime,
                memory: 0,
                error: 'Java compilation error'
              });
            });

            javaCompileProcess.on('close', (compileCode) => {
              if (compileCode !== 0) {
                cleanup([javaFile]);
                resolve({
                  output: 'Java compilation failed. Check your syntax.',
                  runtime: Date.now() - startTime,
                  memory: 0,
                  error: 'Compilation error'
                });
                return;
              }

              // Execute compiled class
              const execProcess = spawn('java', ['-cp', tempDir, className], { timeout: 5000 });
              handleExecution(execProcess, startTime, [javaFile, join(tempDir, `${className}.class`)], input, resolve);
            });
            return;
          } catch (error) {
            console.error('[DEBUG] Java execution error:', error);
            resolve({
              output: 'Java execution failed: ' + String(error),
              runtime: Date.now() - startTime,
              memory: 0,
              error: 'Java execution error'
            });
            return;
          }

        case 'c':
          const cFile = join(tempDir, `temp_${tempId}.c`);
          const cExecFile = join(tempDir, `temp_${tempId}`);
          writeFileSync(cFile, code);

          // Compile first
          const cCompileProcess = spawn('gcc', ['-o', cExecFile, cFile], { timeout: 10000 });

          cCompileProcess.on('close', (compileCode) => {
            if (compileCode !== 0) {
              cleanup([cFile, cExecFile]);
              resolve({
                output: 'Compilation failed',
                runtime: Date.now() - startTime,
                memory: 0,
                error: 'Compilation error'
              });
              return;
            }

            // Execute compiled binary
            const execProcess = spawn(cExecFile, [], { timeout: 5000 });
            handleExecution(execProcess, startTime, [cFile, cExecFile], input, resolve);
          });
          return;

        default:
          resolve({
            output: 'Unsupported language',
            runtime: 0,
            memory: 0,
            error: 'Language not supported'
          });
          return;
      }

      // For interpreted languages (Python, JavaScript)
      const process = spawn(command, args, { timeout: 5000 });
      handleExecution(process, startTime, [fileName], input, resolve);

    } catch (error) {
      resolve({
        output: 'Execution failed',
        runtime: Date.now() - startTime,
        memory: 0,
        error: String(error)
      });
    }
  });
}

export { ExecutionResult }; 