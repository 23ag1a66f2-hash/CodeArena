#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const v8 = require('v8');
const { performance } = require('perf_hooks');

// Set memory limit to 128MB
const MEMORY_LIMIT = 128 * 1024 * 1024;
v8.setFlagsFromString('--max_old_space_size=128');

// Default code file path
const DEFAULT_CODE_FILE = '/tmp/code.js';

// Get initial memory usage
const getMemoryUsage = () => {
    const used = process.memoryUsage();
    return used.heapUsed + used.external;
};

async function executeCode(codePath) {
    try {
        // Use provided path or default
        const codeFile = codePath || DEFAULT_CODE_FILE;

        // Check if file exists
        if (!fs.existsSync(codeFile)) {
            console.error(`Error: Code file not found at ${codeFile}`);
            process.exit(1);
        }

        const startTime = performance.now();
        const startMemory = getMemoryUsage();

        // Read the code file
        const code = fs.readFileSync(codeFile, 'utf8');

        // Create a new context for execution
        const context = {
            console: {
                log: (...args) => {
                    console.log(...args);
                },
                error: (...args) => {
                    console.error(...args);
                }
            },
            process,
            require,
            setTimeout,
            setInterval,
            clearTimeout,
            clearInterval,
            Buffer,
            URL,
            Error,
            Date,
            Math,
            JSON,
            // Add any other required globals
        };

        // Set execution timeout
        const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                reject(new Error('Execution timeout'));
            }, 5000); // 5 seconds timeout
        });

        // Execute the code
        const executionPromise = new Promise(async (resolve) => {
            try {
                // Create function from code
                const fn = new Function('context', `
                    with (context) {
                        ${code}
                        // If Solution class exists, try to run it
                        if (typeof Solution !== 'undefined') {
                            const solution = new Solution();
                            if (typeof solution.main === 'function') {
                                solution.main();
                            }
                        }
                    }
                `);

                // Execute in context
                fn(context);
                resolve();
            } catch (error) {
                throw error;
            }
        });

        // Race between execution and timeout
        await Promise.race([executionPromise, timeoutPromise]);

        // Calculate resource usage
        const endTime = performance.now();
        const endMemory = getMemoryUsage();

        // Print execution stats
        const stats = {
            runtime_ms: Math.round(endTime - startTime),
            memory_bytes: endMemory - startMemory,
            success: true
        };
        console.error(`\n__EXECUTION_STATS__:${JSON.stringify(stats)}`);

    } catch (error) {
        if (error.message === 'Execution timeout') {
            console.error('Error: Code execution timed out');
        } else {
            console.error(`Error: ${error.message}`);
            console.error('Stacktrace:');
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// Get code file path from arguments or use default
const codePath = process.argv[2] || DEFAULT_CODE_FILE;
executeCode(codePath).catch(error => {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
}); 