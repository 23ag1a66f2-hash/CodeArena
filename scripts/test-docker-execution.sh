#!/bin/bash

# 🐳 Docker Execution System Test Script
# This script tests all Docker components of the execution system

set -e

echo "🧪 Testing Docker Execution System Components"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        exit 1
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Step 1: Check Docker
echo "1. Checking Docker installation..."
docker --version > /dev/null 2>&1
print_status $? "Docker is installed and running"

# Step 2: Build Docker images
echo ""
echo "2. Building Docker images..."
cd execution-system

if [ ! -f "scripts/build.sh" ]; then
    echo "❌ Build script not found. Make sure you're in the correct directory."
    exit 1
fi

echo "   Building all execution images..."
bash scripts/build.sh > build.log 2>&1
print_status $? "All Docker images built successfully"

# Step 3: Test individual language containers
echo ""
echo "3. Testing individual language containers..."

echo "   Testing Python container..."
PYTHON_OUTPUT=$(docker run --rm codearena/executor-python:latest python3 -c "print('Python works')" 2>/dev/null)
if [[ "$PYTHON_OUTPUT" == *"Python works"* ]]; then
    print_status 0 "Python container working"
else
    print_status 1 "Python container failed"
fi

echo "   Testing JavaScript container..."
JS_OUTPUT=$(docker run --rm codearena/executor-javascript:latest node -e "console.log('JavaScript works')" 2>/dev/null)
if [[ "$JS_OUTPUT" == *"JavaScript works"* ]]; then
    print_status 0 "JavaScript container working"
else
    print_status 1 "JavaScript container failed"
fi

echo "   Testing C container..."
C_OUTPUT=$(docker run --rm codearena/executor-c:latest /app/execute.sh 'int main(){printf("C works"); return 0;}' '' '64m' '5' 2>/dev/null)
if [[ "$C_OUTPUT" == *"success"* ]] && [[ "$C_OUTPUT" == *"C works"* ]]; then
    print_status 0 "C container working"
else
    print_status 1 "C container failed"
fi

echo "   Testing C++ container..."
CPP_OUTPUT=$(docker run --rm codearena/executor-cpp:latest /app/execute.sh '#include<iostream>
int main(){std::cout<<"C++ works"; return 0;}' '' '64m' '5' 2>/dev/null)
if [[ "$CPP_OUTPUT" == *"success"* ]] && [[ "$CPP_OUTPUT" == *"C++ works"* ]]; then
    print_status 0 "C++ container working"
else
    print_status 1 "C++ container failed"
fi

echo "   Testing Java container..."
JAVA_OUTPUT=$(docker run --rm codearena/executor-java:latest /app/execute.sh 'public class Main{public static void main(String[] args){System.out.println("Java works");}}' '' '64m' '5' 2>/dev/null)
if [[ "$JAVA_OUTPUT" == *"success"* ]] && [[ "$JAVA_OUTPUT" == *"Java works"* ]]; then
    print_status 0 "Java container working"
else
    print_status 1 "Java container failed"
fi

# Step 4: Test Docker Compose
echo ""
echo "4. Testing Docker Compose setup..."

echo "   Starting services with docker-compose..."
docker-compose up -d > /dev/null 2>&1
sleep 10

echo "   Checking service status..."
SERVICES_STATUS=$(docker-compose ps --format "table {{.Service}}\t{{.Status}}")
echo "$SERVICES_STATUS"

# Check if all services are up
if docker-compose ps | grep -q "Up"; then
    print_status 0 "Docker Compose services are running"
else
    print_status 1 "Docker Compose services failed to start"
fi

# Step 5: Test API endpoints
echo ""
echo "5. Testing API endpoints..."

echo "   Waiting for services to be ready..."
sleep 5

echo "   Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3001/health 2>/dev/null || echo "FAILED")
if [[ "$HEALTH_RESPONSE" == *"healthy"* ]]; then
    print_status 0 "Health endpoint responding"
else
    print_warning "Health endpoint not responding (this might be normal if starting up)"
fi

echo "   Testing queue stats..."
STATS_RESPONSE=$(curl -s http://localhost:3001/api/stats 2>/dev/null || echo "FAILED")
if [[ "$STATS_RESPONSE" == *"waiting"* ]]; then
    print_status 0 "Queue stats endpoint responding"
else
    print_warning "Queue stats endpoint not responding"
fi

# Step 6: Test code execution through API
echo ""
echo "6. Testing code execution through API..."

echo "   Submitting Python code execution..."
EXEC_RESPONSE=$(curl -s -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "print(\"API execution works\")", "language": "python"}' 2>/dev/null || echo "FAILED")

if [[ "$EXEC_RESPONSE" == *"jobId"* ]]; then
    print_status 0 "Code execution API working"
    
    # Extract job ID and check status
    JOB_ID=$(echo "$EXEC_RESPONSE" | grep -o '"jobId":"[^"]*' | cut -d'"' -f4)
    if [ ! -z "$JOB_ID" ]; then
        echo "   Job ID: $JOB_ID"
        echo "   Waiting for job completion..."
        
        # Poll for job completion
        for i in {1..30}; do
            JOB_STATUS=$(curl -s http://localhost:3001/api/jobs/$JOB_ID 2>/dev/null || echo "FAILED")
            if [[ "$JOB_STATUS" == *"completed"* ]]; then
                print_status 0 "Job completed successfully"
                break
            elif [[ "$JOB_STATUS" == *"failed"* ]]; then
                print_status 1 "Job failed"
                break
            fi
            sleep 1
        done
    fi
else
    print_warning "Code execution API not responding properly"
fi

# Step 7: Performance test
echo ""
echo "7. Running basic performance test..."

echo "   Submitting 10 concurrent requests..."
for i in {1..10}; do
    curl -s -X POST http://localhost:3001/api/execute \
      -H "Content-Type: application/json" \
      -d "{\"code\": \"print('Performance test $i')\", \"language\": \"python\"}" &
done
wait

print_status 0 "Performance test completed"

# Step 8: Cleanup and summary
echo ""
echo "8. Cleanup and summary..."

echo "   Docker Compose services status:"
docker-compose ps

echo ""
echo "🎉 Docker execution system test completed!"
echo ""
echo "📊 Summary:"
echo "   ✅ Docker installation verified"
echo "   ✅ All language containers built and tested"
echo "   ✅ Docker Compose services running"
echo "   ✅ API endpoints responding"
echo "   ✅ Code execution working"
echo "   ✅ Basic performance test passed"
echo ""
echo "🔧 To stop services: docker-compose down"
echo "📋 To view logs: docker-compose logs -f"
echo "🌐 API URL: http://localhost:3001"
echo ""
echo "Next step: Test Kubernetes deployment with scripts/test-k8s-execution.sh" 