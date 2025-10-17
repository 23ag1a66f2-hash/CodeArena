#!/usr/bin/env node

/**
 * Test script to verify CodeArena execution system integration
 * Run this to make sure the integration works properly
 */

import axios from 'axios';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-test-token-here';

// Test cases
const testCases = [
  {
    name: 'Python Hello World',
    code: 'print("Hello from Python!")',
    language: 'python',
    expectedOutput: 'Hello from Python!'
  },
  {
    name: 'JavaScript Console Log',
    code: 'console.log("Hello from JavaScript!");',
    language: 'javascript',
    expectedOutput: 'Hello from JavaScript!'
  },
  {
    name: 'C++ Hello World',
    code: '#include <iostream>\nint main() { std::cout << "Hello from C++!" << std::endl; return 0; }',
    language: 'cpp',
    expectedOutput: 'Hello from C++!'
  }
];

async function testExecution() {
  console.log('🧪 Testing CodeArena Execution Integration\n');

  // Test health endpoint
  try {
    console.log('📊 Checking system health...');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Health check passed');
    console.log(`   Mode: ${healthResponse.data.services?.execution?.mode || 'unknown'}`);
    console.log(`   Queue Available: ${healthResponse.data.services?.execution?.queueServiceAvailable || false}\n`);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    console.log('   Make sure your server is running on', BASE_URL, '\n');
  }

  // Test execution endpoints
  for (const testCase of testCases) {
    try {
      console.log(`🔧 Testing: ${testCase.name}`);
      
      const response = await axios.post(`${BASE_URL}/api/execute`, {
        code: testCase.code,
        language: testCase.language
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        timeout: 30000
      });

      const result = response.data;
      
      if (result.error) {
        console.log(`❌ ${testCase.name} failed with error:`, result.error);
      } else if (result.output && result.output.trim().includes(testCase.expectedOutput)) {
        console.log(`✅ ${testCase.name} passed`);
        console.log(`   Output: "${result.output.trim()}"`);
        console.log(`   Runtime: ${result.runtime}ms`);
      } else {
        console.log(`⚠️  ${testCase.name} unexpected output:`);
        console.log(`   Expected: "${testCase.expectedOutput}"`);
        console.log(`   Got: "${result.output || 'no output'}"`);
      }
    } catch (error) {
      console.log(`❌ ${testCase.name} failed:`, error.message);
      if (error.response?.status === 401) {
        console.log('   💡 Tip: Set AUTH_TOKEN environment variable with a valid JWT token');
      }
    }
    console.log('');
  }

  console.log('🎯 Integration test complete!');
  console.log('\n📋 Next steps:');
  console.log('   1. If all tests passed: Your integration is working! ✅');
  console.log('   2. To test queue mode: Start execution-system and set EXECUTION_MODE=queue');
  console.log('   3. Check logs for execution mode: [EXEC-WRAPPER] Using execution service in X mode');
}

// Run tests
testExecution().catch(console.error); 