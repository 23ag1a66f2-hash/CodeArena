# 🚀 CodeArena with Docker Execution System
# This script starts CodeArena with the Docker-based execution system

Write-Host "🚀 Starting CodeArena with Docker Execution System..." -ForegroundColor Green
Write-Host ""

# Check if execution system is running
Write-Host "🔍 Checking if execution system is running..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET -TimeoutSec 5
    Write-Host "✅ Execution system is running: $($healthResponse.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Execution system is not running!" -ForegroundColor Red
    Write-Host "   Please start the execution system first:" -ForegroundColor Yellow
    Write-Host "   1. Open a new terminal" -ForegroundColor White
    Write-Host "   2. Run: cd E:\CodeArena\execution-system" -ForegroundColor White
    Write-Host "   3. Run: .\quick-fix-docker.ps1" -ForegroundColor White
    Write-Host "   4. Wait for it to complete, then run this script again" -ForegroundColor White
    exit 1
}

# Set environment variables for Docker execution
Write-Host "⚙️ Setting environment variables..." -ForegroundColor Yellow
$env:EXECUTION_MODE = "queue"
$env:EXECUTION_QUEUE_URL = "http://localhost:3001"
$env:EXECUTION_POLL_INTERVAL = "1000"
$env:EXECUTION_MAX_POLL_TIME = "60000"
$env:EXECUTION_TIMEOUT = "30000"

Write-Host "✅ Environment variables set:" -ForegroundColor Green
Write-Host "   EXECUTION_MODE: $env:EXECUTION_MODE" -ForegroundColor White
Write-Host "   EXECUTION_QUEUE_URL: $env:EXECUTION_QUEUE_URL" -ForegroundColor White

# Navigate to CodeArena directory
Write-Host "📁 Navigating to CodeArena..." -ForegroundColor Yellow
Set-Location "E:\CodeArena"

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Start the server
Write-Host "🚀 Starting CodeArena server..." -ForegroundColor Yellow
Write-Host "   The server will now use Docker containers for code execution!" -ForegroundColor Green
Write-Host ""

npm run dev 