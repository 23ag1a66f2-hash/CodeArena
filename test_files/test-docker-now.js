// Immediate test to verify Docker execution with running CodeArena server
const axios = require('axios');

const SERVER_URL = 'http://localhost:3000';

async function testDockerExecution() {
  console.log('🧪 TESTING DOCKER EXECUTION WITH RUNNING SERVER');
  console.log('===============================================\n');

  // Test 1: Test the /api/execute endpoint (direct)
  console.log('1. Testing /api/execute endpoint...');
  try {
    const testCode = {
      code: "print('Hello from Docker!')",
      language: 'python'
    };

    const response = await axios.post(`${SERVER_URL}/api/execute`, testCode, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    console.log('✅ /api/execute successful!');
    console.log(`   Output: ${response.data.output}`);
    console.log(`   Runtime: ${response.data.runtime}ms`);
    console.log(`   Memory: ${response.data.memory}MB`);
  } catch (error) {
    console.log('❌ /api/execute failed:');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 2: Test the /api/problems/run endpoint (with dummy data)
  console.log('\n2. Testing /api/problems/run endpoint...');
  try {
    const testCode = {
      problemId: 1, // Dummy problem ID
      code: "print('Hello from Docker Problem Run!')",
      language: 'python'
    };

    const response = await axios.post(`${SERVER_URL}/api/problems/run`, testCode, {
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dummy-token' // This might fail due to auth
      },
      timeout: 30000
    });

    console.log('✅ /api/problems/run successful!');
    console.log(`   Status: ${response.data.status}`);
    console.log(`   Output: ${response.data.output}`);
    console.log(`   Runtime: ${response.data.runtime}ms`);
  } catch (error) {
    console.log('❌ /api/problems/run failed:');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Error: ${error.response?.data?.message || error.message}`);
    
    if (error.response?.status === 401) {
      console.log('   ℹ️  This is expected - authentication required');
    }
  }

  console.log('\n===============================================');
  console.log('🎯 SUMMARY:');
  console.log('   - If /api/execute works, Docker is functioning!');
  console.log('   - The /api/problems/run needs authentication');
  console.log('   - Check server logs for Docker execution messages');
  console.log('===============================================');
}

// Run the test
testDockerExecution().catch(console.error); 