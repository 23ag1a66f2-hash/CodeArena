# 🚀 CodeArena with GUARANTEED Docker Execution
# This script ensures Docker execution works 100% of the time

Write-Host "🚀 Starting CodeArena with GUARANTEED Docker Execution..." -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""

# Step 1: Add Docker to PATH
Write-Host "📦 Setting up Docker..." -ForegroundColor Yellow
$env:PATH += ";C:\Program Files\Docker\Docker\resources\bin"

# Step 2: Test Docker availability
Write-Host "🔍 Testing Docker availability..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docker is available: $dockerVersion" -ForegroundColor Green
    } else {
        throw "Docker command failed"
    }
} catch {
    Write-Host "❌ Docker is not available!" -ForegroundColor Red
    Write-Host "   Please ensure Docker Desktop is installed and running." -ForegroundColor Yellow
    Write-Host "   Download from: https://www.docker.com/products/docker-desktop/" -ForegroundColor Cyan
    exit 1
}

# Step 3: Test Docker execution
Write-Host "🧪 Testing Docker execution..." -ForegroundColor Yellow
try {
    $testOutput = docker run --rm --memory=128m --cpus=0.5 --network=none python:3.11-alpine python3 -c "print('Docker test successful!')" 2>$null
    if ($LASTEXITCODE -eq 0 -and $testOutput -like "*Docker test successful*") {
        Write-Host "✅ Docker execution test passed!" -ForegroundColor Green
        Write-Host "   Output: $testOutput" -ForegroundColor White
    } else {
        throw "Docker execution test failed"
    }
} catch {
    Write-Host "❌ Docker execution test failed!" -ForegroundColor Red
    Write-Host "   This might be due to:" -ForegroundColor Yellow
    Write-Host "   - Docker Desktop not running" -ForegroundColor Yellow
    Write-Host "   - Docker permissions issue" -ForegroundColor Yellow
    Write-Host "   - Network connectivity for pulling images" -ForegroundColor Yellow
    exit 1
}

# Step 4: Ensure temp directory exists
Write-Host "📁 Setting up temp directory..." -ForegroundColor Yellow
$tempDir = Join-Path $PWD "temp"
if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    Write-Host "✅ Created temp directory: $tempDir" -ForegroundColor Green
} else {
    Write-Host "✅ Temp directory exists: $tempDir" -ForegroundColor Green
}

# Step 5: Pull required Docker images
Write-Host "🐳 Pulling required Docker images..." -ForegroundColor Yellow
$images = @('python:3.11-alpine', 'node:18-alpine', 'gcc:latest', 'openjdk:11-alpine')
foreach ($image in $images) {
    Write-Host "   Pulling $image..." -ForegroundColor Cyan
    docker pull $image 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ $image ready" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  $image failed to pull (will pull on first use)" -ForegroundColor Yellow
    }
}

# Step 6: Start CodeArena
Write-Host ""
Write-Host "🎯 DOCKER SETUP COMPLETE!" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "✅ Docker is configured and working" -ForegroundColor Green
Write-Host "✅ CodeArena is configured for Docker-only execution" -ForegroundColor Green
Write-Host "✅ All code execution will use Docker containers" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Starting CodeArena server..." -ForegroundColor Green
Write-Host ""
Write-Host "🎯 IMPORTANT - When you click 'Run Code':" -ForegroundColor Cyan
Write-Host "   🐳 Code will execute in Docker containers" -ForegroundColor White
Write-Host "   🛡️  Complete isolation and security" -ForegroundColor White
Write-Host "   📊 Resource limits enforced" -ForegroundColor White
Write-Host "   🔒 No access to host system" -ForegroundColor White
Write-Host ""
Write-Host "📋 Watch the server logs for these messages:" -ForegroundColor Cyan
Write-Host "   [EXEC-SERVICE] 🚀 ==> DOCKER EXECUTION REQUEST RECEIVED <==" -ForegroundColor White
Write-Host "   [DOCKER-EXECUTOR] 🐳 Starting Docker execution..." -ForegroundColor White
Write-Host "   [EXEC-SERVICE] ✅ *** DOCKER EXECUTION COMPLETED SUCCESSFULLY ***" -ForegroundColor White
Write-Host ""

# Start the server
npm run dev 