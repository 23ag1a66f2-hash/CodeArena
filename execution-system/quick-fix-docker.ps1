# 🚨 QUICK FIX - Docker Execution System
# This script fixes the issue where CodeArena is not using Docker for code execution

Write-Host "🚨 FIXING DOCKER EXECUTION SYSTEM ISSUE..." -ForegroundColor Red
Write-Host ""

# Step 1: Add Docker to PATH
Write-Host "📦 Adding Docker to PATH..." -ForegroundColor Yellow
$env:PATH += ";C:\Program Files\Docker\Docker\resources\bin"

# Step 2: Check if Docker is accessible
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker not found. Please install Docker Desktop first." -ForegroundColor Red
    Write-Host "   Download from: https://www.docker.com/products/docker-desktop/" -ForegroundColor Cyan
    exit 1
}

# Step 3: Navigate to execution system
Write-Host "📁 Navigating to execution system..." -ForegroundColor Yellow
Set-Location "E:\CodeArena\execution-system"

# Step 4: Check if docker-compose.yml exists
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "❌ docker-compose.yml not found. Please run the build script first." -ForegroundColor Red
    Write-Host "   Run: .\scripts\build.sh" -ForegroundColor Cyan
    exit 1
}

# Step 5: Start the execution system
Write-Host "🚀 Starting execution system..." -ForegroundColor Yellow
docker compose up -d

# Step 6: Wait for services to be ready
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Step 7: Check if services are running
Write-Host "🔍 Checking service status..." -ForegroundColor Yellow
docker compose ps

# Step 8: Test API health
Write-Host "🧪 Testing API health..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET -TimeoutSec 10
    Write-Host "✅ API is healthy: $($healthResponse.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ API health check failed. Services may still be starting..." -ForegroundColor Red
    Write-Host "   Wait a few more seconds and try again." -ForegroundColor Yellow
}

# Step 9: Set environment variable
Write-Host "⚙️ Setting EXECUTION_MODE=queue..." -ForegroundColor Yellow
$env:EXECUTION_MODE = "queue"

# Step 10: Instructions for CodeArena server
Write-Host ""
Write-Host "🎯 NEXT STEPS:" -ForegroundColor Green
Write-Host "1. Open a NEW terminal window" -ForegroundColor White
Write-Host "2. Navigate to CodeArena: cd E:\CodeArena" -ForegroundColor White
Write-Host "3. Set environment variable: `$env:EXECUTION_MODE = 'queue'" -ForegroundColor White
Write-Host "4. Start the server: npm run dev" -ForegroundColor White
Write-Host "5. Test code execution in assignments/courses" -ForegroundColor White
Write-Host ""

Write-Host "✅ Docker execution system is now running!" -ForegroundColor Green
Write-Host "🔗 API available at: http://localhost:3001" -ForegroundColor Cyan
Write-Host "📊 Queue stats at: http://localhost:3001/api/queue/stats" -ForegroundColor Cyan 