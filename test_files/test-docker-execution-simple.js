// Simple test to verify Docker execution with CodeArena
const { spawn } = require('child_process');

console.log('🧪 Testing Docker Integration with CodeArena');
console.log('===========================================\n');

// Test 1: Check if Docker is available
console.log('1. Testing Docker availability...');
const docker = spawn('docker', ['--version']);

docker.stdout.on('data', (data) => {
  console.log('✅ Docker is available:', data.toString().trim());
  testDirectDockerExecution();
});

docker.stderr.on('data', (data) => {
  console.log('❌ Docker error:', data.toString().trim());
});

docker.on('error', (error) => {
  console.log('❌ Docker not found. Please ensure Docker Desktop is installed and running.');
  console.log('   Error:', error.message);
});

// Test 2: Test direct Docker execution
function testDirectDockerExecution() {
  console.log('\n2. Testing direct Docker execution...');
  
  const testCommand = [
    'run', '--rm', '--memory=128m', '--cpus=0.5', '--network=none',
    'python:3.11-alpine', 'python3', '-c', "print('Hello from Docker!')"
  ];
  
  const dockerRun = spawn('docker', testCommand);
  let output = '';
  let errorOutput = '';
  
  dockerRun.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  dockerRun.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });
  
  dockerRun.on('close', (code) => {
    if (code === 0 && output.includes('Hello from Docker!')) {
      console.log('✅ Direct Docker execution successful!');
      console.log('   Output:', output.trim());
      console.log('\n🎯 RESULT: Docker is working and ready for CodeArena!');
      console.log('\n📋 Next steps:');
      console.log('   1. Start CodeArena: npm run dev');
      console.log('   2. Go to any assignment/course problem');
      console.log('   3. Click "Run Code" - it will use Docker containers!');
      console.log('   4. Check server logs for Docker execution messages');
    } else {
      console.log('❌ Direct Docker execution failed');
      console.log('   Exit code:', code);
      console.log('   Output:', output);
      console.log('   Error:', errorOutput);
    }
  });
  
  dockerRun.on('error', (error) => {
    console.log('❌ Docker execution error:', error.message);
  });
} 