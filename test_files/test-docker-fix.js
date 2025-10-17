// Test to verify Docker path fix
const axios = require('axios');

async function testDockerFix() {
  console.log('🧪 Testing Docker Path Fix');
  console.log('==========================\n');

  try {
    console.log('Testing /api/execute endpoint...');
    
    const response = await axios.post('http://localhost:3000/api/execute', {
      code: "print('Docker fix test!')",
      language: 'python'
    }, {
      timeout: 30000
    });

    console.log('✅ SUCCESS! Docker execution working!');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.log('❌ Still failing:', error.response?.data || error.message);
  }
}

testDockerFix(); 