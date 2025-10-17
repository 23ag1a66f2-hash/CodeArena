import axios from 'axios';

const BASE_URL = 'http://localhost:3000'; // CodeArena server
const DOCKER_API_URL = 'http://localhost:3001'; // Docker execution API

async function testDockerExecution() {
  console.log('🧪 Testing Docker Code Execution Integration');
  console.log('============================================\n');

  // Test 1: Check if Docker API is running
  console.log('1. Testing Docker API availability...');
  try {
    const healthResponse = await axios.get(`${DOCKER_API_URL}/health`, { timeout: 5000 });
    console.log('✅ Docker API is running');
    console.log(`   Status: ${healthResponse.data.status}`);
    console.log(`   Languages: ${healthResponse.data.languages.join(', ')}`);
  } catch (error) {
    console.log('❌ Docker API is not running');
    console.log(`   Error: ${error.message}`);
    return;
  }

  // Test 2: Test direct Docker API execution
  console.log('\n2. Testing direct Docker API execution...');
  try {
    const testCode = {
      code: "print('Hello from Docker API!')",
      language: 'python'
    };

    const directResponse = await axios.post(`${DOCKER_API_URL}/api/execute`, testCode, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    console.log('✅ Direct Docker API execution successful');
    console.log(`   Output: ${directResponse.data.output}`);
    console.log(`   Runtime: ${directResponse.data.runtime}ms`);
  } catch (error) {
    console.log('❌ Direct Docker API execution failed');
    console.log(`   Error: ${error.response?.data || error.message}`);
  }

  // Test 3: Test CodeArena server execution
  console.log('\n3. Testing CodeArena server execution...');
  try {
    const testCode = {
      code: "print('Hello from CodeArena!')",
      language: 'python'
    };

    const serverResponse = await axios.post(`${BASE_URL}/api/execute`, testCode, {
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dummy-token' // May need auth
      },
      timeout: 30000
    });

    console.log('✅ CodeArena server execution successful');
    console.log(`   Output: ${serverResponse.data.output}`);
    console.log(`   Runtime: ${serverResponse.data.runtime}ms`);
  } catch (error) {
    console.log('❌ CodeArena server execution failed');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Error: ${error.response?.data?.message || error.message}`);
  }

  // Test 4: Test problem run endpoint
  console.log('\n4. Testing problem run endpoint...');
  try {
    const testCode = {
      problemId: 1,
      code: "print('Hello from Problem Run!')",
      language: 'python'
    };

    const problemResponse = await axios.post(`${BASE_URL}/api/problems/run`, testCode, {
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dummy-token' // May need auth
      },
      timeout: 30000
    });

    console.log('✅ Problem run endpoint successful');
    console.log(`   Status: ${problemResponse.data.status}`);
    console.log(`   Output: ${problemResponse.data.output}`);
  } catch (error) {
    console.log('❌ Problem run endpoint failed');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Error: ${error.response?.data?.message || error.message}`);
  }

  console.log('\n============================================');
  console.log('🔍 Test Summary:');
  console.log('   If all tests pass, Docker execution is working!');
  console.log('   If tests fail, check the server logs for details.');
  console.log('============================================');
}

// Run the test
testDockerExecution().catch(console.error); 