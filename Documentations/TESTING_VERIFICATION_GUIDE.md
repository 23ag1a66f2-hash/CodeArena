# 🧪 CodeArena Execution System Testing & Verification Guide

## 🎯 **Complete Testing Checklist**

This guide will help you verify that Docker, Kubernetes, and the execution system are working perfectly with your CodeArena platform.

---

## 📋 **Prerequisites Check**

### **1. Docker Installation**
```bash
# Check Docker version
docker --version
# Expected: Docker version 20.10.0 or higher

# Check Docker is running
docker ps
# Should show running containers (if any)

# Test Docker basic functionality
docker run hello-world
# Should download and run successfully
```

### **2. Kubernetes Installation (if using K8s)**
```bash
# Check kubectl version
kubectl version --client
# Expected: Client version info

# Check cluster connection
kubectl cluster-info
# Should show cluster information

# Check nodes
kubectl get nodes
# Should show available nodes
```

### **3. Node.js and Dependencies**
```bash
# Check Node.js version
node --version
# Expected: v16.0.0 or higher

# Install dependencies
cd server
npm install

# Verify axios is installed
npm list axios
# Should show axios@1.11.0
```

---

## 🐳 **Step 1: Test Docker Images Locally**

### **Build and Test Language Images**

```bash
# Navigate to execution system
cd execution-system

# Build all Docker images
bash scripts/build.sh

# Test each language container individually
echo 'Testing Python...'
docker run --rm codearena/executor-python:latest python3 -c "print('Hello Python')"

echo 'Testing JavaScript...'
docker run --rm codearena/executor-javascript:latest node -e "console.log('Hello JavaScript')"

echo 'Testing C...'
docker run --rm codearena/executor-c:latest /app/execute.sh 'int main(){printf("Hello C"); return 0;}' '' '64m' '5'

echo 'Testing C++...'
docker run --rm codearena/executor-cpp:latest /app/execute.sh '#include<iostream>
int main(){std::cout<<"Hello C++"; return 0;}' '' '64m' '5'

echo 'Testing Java...'
docker run --rm codearena/executor-java:latest /app/execute.sh 'public class Main{public static void main(String[] args){System.out.println("Hello Java");}}' '' '64m' '5'
```

**Expected Output:**
```
Hello Python
Hello JavaScript
{"success":true,"output":"Hello C","executionTime":123,"memoryUsed":1024}
{"success":true,"output":"Hello C++","executionTime":156,"memoryUsed":1024}
{"success":true,"output":"Hello Java","executionTime":234,"memoryUsed":2048}
```

---

## 🔄 **Step 2: Test Local Docker Compose**

### **Start the Execution System Locally**

```bash
# Navigate to execution system
cd execution-system

# Start all services
docker-compose up -d

# Check all services are running
docker-compose ps
```

**Expected Output:**
```
NAME                    IMAGE                     STATUS
execution-redis         redis:7.0-alpine          Up
execution-api           codearena/execution-api   Up
execution-worker        codearena/execution-worker Up
```

### **Test API Endpoints**

```bash
# Test health endpoint
curl http://localhost:3001/health

# Test queue stats
curl http://localhost:3001/api/stats

# Test code execution
curl -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(\"Hello from Queue!\")",
    "language": "python"
  }'
```

**Expected Responses:**
```json
// Health check
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "redis": "connected",
    "workers": "active"
  }
}

// Queue stats
{
  "waiting": 0,
  "active": 0,
  "completed": 5,
  "failed": 0
}

// Code execution
{
  "jobId": "job_123456789",
  "message": "Job queued successfully"
}
```

### **Monitor Job Execution**

```bash
# Get job status (replace with actual jobId from above)
curl http://localhost:3001/api/jobs/job_123456789

# Watch logs in real-time
docker-compose logs -f execution-worker
```

---

## ☸️ **Step 3: Test Kubernetes Deployment**

### **Deploy to Kubernetes**

```bash
# Navigate to execution system
cd execution-system

# Apply Kubernetes manifests
kubectl apply -f k8s/generated/

# Or use the generated deploy script
bash k8s/generated/deploy.sh
```

### **Verify Kubernetes Deployment**

```bash
# Check namespace
kubectl get namespace codearena-execution

# Check all resources
kubectl get all -n codearena-execution

# Check pods are running
kubectl get pods -n codearena-execution -o wide

# Check services
kubectl get services -n codearena-execution

# Check configmaps and secrets
kubectl get configmaps,secrets -n codearena-execution
```

**Expected Output:**
```
NAME                                 READY   STATUS    RESTARTS   AGE
pod/execution-api-xxx                1/1     Running   0          2m
pod/execution-worker-xxx             1/1     Running   0          2m
pod/redis-xxx                        1/1     Running   0          2m

NAME                           TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)
service/execution-api-service  ClusterIP   10.96.123.45    <none>        3001/TCP
service/redis-service          ClusterIP   10.96.123.46    <none>        6379/TCP
```

### **Test Kubernetes Services**

```bash
# Port forward to test API
kubectl port-forward -n codearena-execution service/execution-api-service 3001:3001

# In another terminal, test the API
curl http://localhost:3001/health

# Test code execution through K8s
curl -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "console.log(\"Hello from Kubernetes!\")",
    "language": "javascript"
  }'
```

### **Check Horizontal Pod Autoscaling**

```bash
# Check HPA status
kubectl get hpa -n codearena-execution

# Generate load to test autoscaling
for i in {1..50}; do
  curl -X POST http://localhost:3001/api/execute \
    -H "Content-Type: application/json" \
    -d "{\"code\":\"import time; time.sleep(2); print('Load test $i')\",\"language\":\"python\"}" &
done

# Watch pods scale up
kubectl get pods -n codearena-execution -w
```

---

## 🔗 **Step 4: Test CodeArena Integration**

### **Test Direct Mode (Current System)**

```bash
# Make sure your server is in direct mode
export EXECUTION_MODE=direct

# Start your CodeArena server
cd server
npm start

# In another terminal, test integration
node test-execution-integration.js
```

### **Test Queue Mode Integration**

```bash
# Set queue mode
export EXECUTION_MODE=queue
export EXECUTION_QUEUE_URL=http://localhost:3001

# Restart your CodeArena server
cd server
npm start

# Test integration with queue system
node test-execution-integration.js
```

### **Test Fallback Mechanism**

```bash
# Stop the queue system
docker-compose down

# Keep EXECUTION_MODE=queue
# The system should automatically fallback to direct execution
node test-execution-integration.js

# Check logs for fallback messages
# Should see: "Queue service unavailable, falling back to direct execution"
```

---

## 🎯 **Step 5: End-to-End Problem Testing**

### **Test All Languages**

```bash
# Create comprehensive test script
cat > comprehensive-test.js << 'EOF'
import axios from 'axios';

const BASE_URL = 'http://localhost:5000';
const AUTH_TOKEN = 'your-token-here'; // Get from login

const tests = [
  {
    name: 'Python - Simple Print',
    code: 'print("Hello World")',
    language: 'python',
    expected: 'Hello World'
  },
  {
    name: 'Python - Math Operations',
    code: 'result = 2 + 3 * 4\nprint(f"Result: {result}")',
    language: 'python',
    expected: 'Result: 14'
  },
  {
    name: 'JavaScript - Console Log',
    code: 'console.log("JavaScript works!");',
    language: 'javascript',
    expected: 'JavaScript works!'
  },
  {
    name: 'JavaScript - Variables',
    code: 'let x = 10; let y = 20; console.log(`Sum: ${x + y}`);',
    language: 'javascript',
    expected: 'Sum: 30'
  },
  {
    name: 'C - Hello World',
    code: '#include <stdio.h>\nint main() {\n    printf("Hello from C!");\n    return 0;\n}',
    language: 'c',
    expected: 'Hello from C!'
  },
  {
    name: 'C++ - Hello World',
    code: '#include <iostream>\nint main() {\n    std::cout << "Hello from C++!" << std::endl;\n    return 0;\n}',
    language: 'cpp',
    expected: 'Hello from C++!'
  },
  {
    name: 'Java - Hello World',
    code: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java!");\n    }\n}',
    language: 'java',
    expected: 'Hello from Java!'
  }
];

async function runTests() {
  console.log('🚀 Running comprehensive execution tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      console.log(`🔧 Testing: ${test.name}`);
      
      const response = await axios.post(`${BASE_URL}/api/execute`, {
        code: test.code,
        language: test.language
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        timeout: 30000
      });
      
      const result = response.data;
      
      if (result.error) {
        console.log(`❌ FAILED: ${result.error}`);
        failed++;
      } else if (result.output && result.output.trim().includes(test.expected)) {
        console.log(`✅ PASSED: "${result.output.trim()}" (${result.runtime}ms)`);
        passed++;
      } else {
        console.log(`⚠️  UNEXPECTED: Expected "${test.expected}", got "${result.output || 'no output'}"`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      failed++;
    }
    console.log('');
  }
  
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log(failed === 0 ? '🎉 All tests passed!' : '⚠️  Some tests failed');
}

runTests().catch(console.error);
EOF

# Run comprehensive tests
node comprehensive-test.js
```

### **Test Problem Solving Flow**

```bash
# Test the complete problem-solving workflow
curl -X POST http://localhost:5000/api/problems/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "problemId": "1",
    "code": "def solution(nums):\n    return sum(nums)\n\nprint(solution([1, 2, 3, 4, 5]))",
    "language": "python"
  }'
```

---

## 📊 **Step 6: Performance and Load Testing**

### **Load Test the Queue System**

```bash
# Create load test script
cat > load-test.js << 'EOF'
import axios from 'axios';

const CONCURRENT_REQUESTS = 100;
const BASE_URL = 'http://localhost:3001';

async function loadTest() {
  console.log(`🚀 Starting load test with ${CONCURRENT_REQUESTS} concurrent requests...`);
  
  const startTime = Date.now();
  const promises = [];
  
  for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
    const promise = axios.post(`${BASE_URL}/api/execute`, {
      code: `print(f"Load test request {i + 1}")`,
      language: 'python'
    }).then(() => ({ success: true, id: i + 1 }))
      .catch(error => ({ success: false, id: i + 1, error: error.message }));
    
    promises.push(promise);
  }
  
  const results = await Promise.all(promises);
  const endTime = Date.now();
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\n📊 Load Test Results:`);
  console.log(`   Total Requests: ${CONCURRENT_REQUESTS}`);
  console.log(`   Successful: ${successful}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total Time: ${endTime - startTime}ms`);
  console.log(`   Average Time: ${(endTime - startTime) / CONCURRENT_REQUESTS}ms per request`);
}

loadTest().catch(console.error);
EOF

# Run load test
node load-test.js
```

### **Monitor System During Load**

```bash
# Monitor Docker containers
docker stats

# Monitor Kubernetes pods
kubectl top pods -n codearena-execution

# Check queue metrics
curl http://localhost:3001/api/stats

# Monitor Redis
docker exec -it execution-redis redis-cli info stats
```

---

## 🔍 **Step 7: Troubleshooting & Debugging**

### **Common Issues and Solutions**

#### **1. Docker Images Not Building**
```bash
# Check Docker daemon
sudo systemctl status docker

# Clean Docker cache
docker system prune -f

# Rebuild with no cache
docker build --no-cache -t test-image .
```

#### **2. Kubernetes Pods Not Starting**
```bash
# Describe pod to see events
kubectl describe pod POD_NAME -n codearena-execution

# Check logs
kubectl logs POD_NAME -n codearena-execution

# Check resource limits
kubectl get limitrange -n codearena-execution
```

#### **3. Queue System Not Working**
```bash
# Check Redis connection
docker exec -it execution-redis redis-cli ping

# Check worker logs
docker-compose logs execution-worker

# Test Redis directly
docker exec -it execution-redis redis-cli
> KEYS *
> GET bull:execution:waiting
```

#### **4. Code Execution Failures**
```bash
# Check worker container
docker exec -it execution-worker sh
> docker images
> docker ps

# Test language containers directly
docker run --rm codearena/executor-python:latest python3 --version

# Check execution logs
docker-compose logs -f execution-worker | grep "ERROR"
```

---

## ✅ **Step 8: Verification Checklist**

### **Before Production Deployment:**

- [ ] **Docker Images Built**: All 5 language images build successfully
- [ ] **Local Docker Compose**: All services start and respond to health checks
- [ ] **Kubernetes Deployment**: All pods running, services accessible
- [ ] **Queue System**: Jobs process correctly, Redis working
- [ ] **API Integration**: CodeArena server connects to execution system
- [ ] **Language Support**: All 5 languages (Python, JS, C, C++, Java) work
- [ ] **Fallback System**: Direct execution works when queue is down
- [ ] **Performance**: Load testing shows acceptable response times
- [ ] **Autoscaling**: HPA scales pods based on load
- [ ] **Monitoring**: Health endpoints return correct status
- [ ] **Error Handling**: Failed executions handled gracefully

### **Success Criteria:**

✅ **All tests pass**  
✅ **Response time < 5 seconds for simple code**  
✅ **Can handle 100+ concurrent requests**  
✅ **Zero data loss during failures**  
✅ **Automatic recovery from errors**  

---

## 🎉 **Final Verification Command**

```bash
# Run this single command to verify everything works
bash -c "
echo '🧪 Final Verification Test'
echo '========================='
echo ''

echo '1. Testing Docker...'
docker --version && echo '✅ Docker OK' || echo '❌ Docker FAILED'

echo '2. Testing Kubernetes...'
kubectl version --client &>/dev/null && echo '✅ Kubernetes OK' || echo '❌ Kubernetes FAILED'

echo '3. Testing Queue System...'
curl -s http://localhost:3001/health &>/dev/null && echo '✅ Queue System OK' || echo '❌ Queue System FAILED'

echo '4. Testing CodeArena Integration...'
curl -s http://localhost:5000/api/health &>/dev/null && echo '✅ CodeArena OK' || echo '❌ CodeArena FAILED'

echo ''
echo '🎯 Verification Complete!'
"
```

**If all show ✅, your system is production-ready! 🚀**

---

**Next Step:** Use this guide to systematically verify each component, and you'll have confidence that your Docker, Kubernetes, and execution system are working perfectly together! 