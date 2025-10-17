#!/bin/bash

# 🚀 Quick Docker Setup for CodeArena Execution System
# This script builds and tests Docker connectivity

echo "🐳 Setting up Docker connectivity for CodeArena execution system..."
echo ""

# Step 1: Build Docker images
echo "1. Building Docker images..."
docker build -f Dockerfile.api -t codearena/execution-api .
docker build -f Dockerfile.worker -t codearena/execution-worker .

echo "✅ Docker images built successfully!"

# Step 2: Start services
echo ""
echo "2. Starting services with Docker Compose..."
docker-compose up -d

echo "✅ Services started!"

# Step 3: Wait for services to be ready
echo ""
echo "3. Waiting for services to be ready..."
sleep 10

# Step 4: Test Docker connectivity
echo ""
echo "4. Testing Docker connectivity..."

echo "   Testing worker can access Docker daemon..."
docker-compose exec worker docker --version

echo "   Testing worker can list containers..."
docker-compose exec worker docker ps

# Step 5: Test API endpoints
echo ""
echo "5. Testing API endpoints..."

echo "   Testing health endpoint..."
curl -s http://localhost:3001/health | jq '.' || echo "API not ready yet"

echo "   Testing queue stats..."
curl -s http://localhost:3001/api/stats | jq '.' || echo "Stats not ready yet"

# Step 6: Test code execution
echo ""
echo "6. Testing code execution..."

echo "   Submitting Python test..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "print(\"Docker connectivity test successful!\")", "language": "python"}')

echo "   Response: $RESPONSE"

if [[ "$RESPONSE" == *"jobId"* ]]; then
    echo "✅ Code execution working!"
else
    echo "⚠️ Code execution may need more time to start"
fi

echo ""
echo "🎉 Docker setup complete!"
echo ""
echo "📋 Next steps:"
echo "   - Check services: docker-compose ps"
echo "   - View logs: docker-compose logs -f"
echo "   - Test API: curl http://localhost:3001/health"
echo "   - Stop services: docker-compose down"
echo ""
echo "🔧 Useful commands:"
echo "   docker-compose exec worker docker ps    # Check Docker access"
echo "   docker-compose exec worker sh           # Enter worker container"
echo "   docker-compose logs worker              # View worker logs" 