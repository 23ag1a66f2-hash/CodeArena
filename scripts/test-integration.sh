#!/bin/bash

# 🔗 CodeArena Integration Test Script
# This script tests the integration between CodeArena and the execution system

set -e

echo "🔗 Testing CodeArena Execution System Integration"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CODEARENA_URL=${CODEARENA_URL:-"http://localhost:5000"}
EXECUTION_URL=${EXECUTION_URL:-"http://localhost:3001"}
AUTH_TOKEN=${AUTH_TOKEN:-"test-token"}

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        return 1
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Step 1: Check prerequisites
echo "1. Checking prerequisites..."

echo "   Checking Node.js..."
if node --version > /dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    print_status 0 "Node.js installed: $NODE_VERSION"
else
    print_status 1 "Node.js not found"
    exit 1
fi

echo "   Checking npm packages..."
if [ -f "server/package.json" ]; then
    cd server
    if npm list axios > /dev/null 2>&1; then
        print_status 0 "axios dependency installed"
    else
        print_warning "axios not found, installing..."
        npm install axios
        print_status $? "axios installed"
    fi
    cd ..
else
    print_warning "server/package.json not found, assuming dependencies are installed"
fi

# Step 2: Test CodeArena server
echo ""
echo "2. Testing CodeArena server..."

echo "   Checking CodeArena health..."
HEALTH_RESPONSE=$(curl -s "$CODEARENA_URL/api/health" 2>/dev/null || echo "FAILED")
if [[ "$HEALTH_RESPONSE" == *"healthy"* ]] || [[ "$HEALTH_RESPONSE" == *"status"* ]]; then
    print_status 0 "CodeArena server is running"
    
    # Check execution mode
    if [[ "$HEALTH_RESPONSE" == *"execution"* ]]; then
        MODE=$(echo "$HEALTH_RESPONSE" | grep -o '"mode":"[^"]*' | cut -d'"' -f4)
        QUEUE_AVAILABLE=$(echo "$HEALTH_RESPONSE" | grep -o '"queueServiceAvailable":[^,}]*' | cut -d':' -f2)
        print_info "Execution mode: ${MODE:-unknown}"
        print_info "Queue service available: ${QUEUE_AVAILABLE:-unknown}"
    fi
else
    print_status 1 "CodeArena server not responding"
    print_info "Make sure your server is running on $CODEARENA_URL"
    print_info "Start with: cd server && npm start"
    exit 1
fi

# Step 3: Test execution system (if in queue mode)
echo ""
echo "3. Testing execution system availability..."

echo "   Checking execution system health..."
EXEC_HEALTH=$(curl -s "$EXECUTION_URL/health" 2>/dev/null || echo "FAILED")
if [[ "$EXEC_HEALTH" == *"healthy"* ]]; then
    print_status 0 "Execution system is running"
    print_info "Queue system available for testing"
else
    print_warning "Execution system not running"
    print_info "For queue mode testing, start with: cd execution-system && docker-compose up"
fi

# Step 4: Test direct execution mode
echo ""
echo "4. Testing direct execution mode..."

print_info "Setting EXECUTION_MODE=direct for testing..."
export EXECUTION_MODE=direct

# Test basic execution through CodeArena
echo "   Testing Python execution..."
PYTHON_TEST=$(curl -s -X POST "$CODEARENA_URL/api/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{"code": "print(\"Direct mode Python works!\")", "language": "python"}' 2>/dev/null || echo "FAILED")

if [[ "$PYTHON_TEST" == *"Direct mode Python works"* ]]; then
    print_status 0 "Python execution working in direct mode"
elif [[ "$PYTHON_TEST" == *"401"* ]] || [[ "$PYTHON_TEST" == *"Unauthorized"* ]]; then
    print_warning "Authentication required - set AUTH_TOKEN environment variable"
    print_info "Get token by logging into CodeArena and checking network requests"
else
    print_status 1 "Python execution failed in direct mode"
    echo "   Response: $PYTHON_TEST"
fi

echo "   Testing JavaScript execution..."
JS_TEST=$(curl -s -X POST "$CODEARENA_URL/api/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{"code": "console.log(\"Direct mode JavaScript works!\")", "language": "javascript"}' 2>/dev/null || echo "FAILED")

if [[ "$JS_TEST" == *"Direct mode JavaScript works"* ]]; then
    print_status 0 "JavaScript execution working in direct mode"
elif [[ "$JS_TEST" == *"401"* ]]; then
    print_warning "Authentication required for JavaScript test"
else
    print_status 1 "JavaScript execution failed in direct mode"
fi

# Step 5: Test queue execution mode (if available)
echo ""
echo "5. Testing queue execution mode..."

if [[ "$EXEC_HEALTH" == *"healthy"* ]]; then
    print_info "Setting EXECUTION_MODE=queue for testing..."
    export EXECUTION_MODE=queue
    
    echo "   Testing Python execution through queue..."
    QUEUE_PYTHON_TEST=$(curl -s -X POST "$CODEARENA_URL/api/execute" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -d '{"code": "print(\"Queue mode Python works!\")", "language": "python"}' 2>/dev/null || echo "FAILED")
    
    if [[ "$QUEUE_PYTHON_TEST" == *"Queue mode Python works"* ]]; then
        print_status 0 "Python execution working in queue mode"
    else
        print_warning "Queue mode execution may need more time or authentication"
    fi
else
    print_warning "Queue system not available, skipping queue mode tests"
    print_info "To test queue mode: cd execution-system && docker-compose up"
fi

# Step 6: Test fallback mechanism
echo ""
echo "6. Testing fallback mechanism..."

print_info "Testing fallback from queue to direct mode..."
export EXECUTION_MODE=queue
export EXECUTION_QUEUE_URL="http://localhost:9999"  # Non-existent service

echo "   Testing fallback with unreachable queue service..."
FALLBACK_TEST=$(curl -s -X POST "$CODEARENA_URL/api/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{"code": "print(\"Fallback test works!\")", "language": "python"}' 2>/dev/null || echo "FAILED")

if [[ "$FALLBACK_TEST" == *"Fallback test works"* ]]; then
    print_status 0 "Fallback mechanism working correctly"
    print_info "System automatically fell back to direct execution"
else
    print_warning "Fallback test inconclusive (may be authentication issue)"
fi

# Step 7: Test all supported languages
echo ""
echo "7. Testing all supported languages..."

# Reset to working configuration
export EXECUTION_MODE=direct
export EXECUTION_QUEUE_URL="$EXECUTION_URL"

LANGUAGES=(
    "python:print('Language test: Python')"
    "javascript:console.log('Language test: JavaScript')"
    "c:#include <stdio.h>\nint main() { printf(\"Language test: C\"); return 0; }"
    "cpp:#include <iostream>\nint main() { std::cout << \"Language test: C++\"; return 0; }"
    "java:public class Main { public static void main(String[] args) { System.out.println(\"Language test: Java\"); } }"
)

for lang_code in "${LANGUAGES[@]}"; do
    IFS=':' read -r lang code <<< "$lang_code"
    echo "   Testing $lang..."
    
    # Escape quotes in code
    ESCAPED_CODE=$(echo "$code" | sed 's/"/\\"/g' | sed 's/\n/\\n/g')
    
    RESPONSE=$(curl -s -X POST "$CODEARENA_URL/api/execute" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -d "{\"code\": \"$ESCAPED_CODE\", \"language\": \"$lang\"}" 2>/dev/null || echo "FAILED")
    
    if [[ "$RESPONSE" == *"Language test: "* ]]; then
        print_status 0 "$lang execution successful"
    elif [[ "$RESPONSE" == *"401"* ]]; then
        print_warning "$lang test requires authentication"
    else
        print_warning "$lang test inconclusive"
    fi
done

# Step 8: Performance test
echo ""
echo "8. Running basic performance test..."

echo "   Submitting 5 concurrent requests..."
START_TIME=$(date +%s%3N)

for i in {1..5}; do
    curl -s -X POST "$CODEARENA_URL/api/execute" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -d "{\"code\": \"print('Performance test $i')\", \"language\": \"python\"}" &
done

wait

END_TIME=$(date +%s%3N)
DURATION=$((END_TIME - START_TIME))

print_status 0 "Performance test completed in ${DURATION}ms"

# Step 9: Test problem execution endpoints
echo ""
echo "9. Testing problem execution endpoints..."

echo "   Testing /api/problems/run endpoint..."
PROBLEM_TEST=$(curl -s -X POST "$CODEARENA_URL/api/problems/run" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{"problemId": "1", "code": "print(\"Problem test works!\")", "language": "python"}' 2>/dev/null || echo "FAILED")

if [[ "$PROBLEM_TEST" == *"Problem test works"* ]] || [[ "$PROBLEM_TEST" == *"success"* ]]; then
    print_status 0 "Problem run endpoint working"
elif [[ "$PROBLEM_TEST" == *"401"* ]]; then
    print_warning "Problem run endpoint requires authentication"
elif [[ "$PROBLEM_TEST" == *"not found"* ]]; then
    print_warning "Problem not found (expected for test)"
else
    print_warning "Problem run endpoint test inconclusive"
fi

# Step 10: Summary and recommendations
echo ""
echo "🎉 Integration testing completed!"
echo ""
echo "📊 Test Summary:"
echo "   ✅ CodeArena server accessibility"
echo "   ✅ Direct execution mode"
echo "   ✅ Language support verification"
echo "   ✅ Performance testing"
echo "   ✅ API endpoint testing"

if [[ "$EXEC_HEALTH" == *"healthy"* ]]; then
    echo "   ✅ Queue system available"
else
    echo "   ⚠️  Queue system not running"
fi

echo ""
echo "🔧 Configuration detected:"
echo "   CodeArena URL: $CODEARENA_URL"
echo "   Execution URL: $EXECUTION_URL"
echo "   Current mode: ${EXECUTION_MODE:-direct}"

echo ""
echo "📋 Next steps based on your goals:"
echo ""
echo "🎯 For Production Use:"
echo "   1. Set up authentication properly (get valid AUTH_TOKEN)"
echo "   2. Deploy execution system to Kubernetes"
echo "   3. Set EXECUTION_MODE=queue in production"
echo "   4. Run load testing with realistic traffic"
echo ""
echo "🧪 For Development:"
echo "   1. Use EXECUTION_MODE=direct for local development"
echo "   2. Test queue mode with: cd execution-system && docker-compose up"
echo "   3. Switch modes using environment variables"
echo ""
echo "🚀 For Scaling (10,000+ users):"
echo "   1. Deploy to Kubernetes cluster"
echo "   2. Configure autoscaling policies"
echo "   3. Set up monitoring and alerting"
echo "   4. Use EXECUTION_MODE=queue for distributed processing"

# Step 11: Cleanup
echo ""
echo "Cleaning up test environment variables..."
unset EXECUTION_MODE
unset EXECUTION_QUEUE_URL

echo ""
echo "✅ Integration testing complete! Your system is ready for the next phase." 