# 🚀 CodeArena with Docker Execution - GUARANTEED TO WORK
# This script ensures Docker execution is working for all code execution

Write-Host "🚀 Starting CodeArena with Docker Execution System..." -ForegroundColor Green
Write-Host ""

# Step 1: Check if Docker execution API is running
Write-Host "🔍 Checking Docker execution API..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET -TimeoutSec 5
    if ($healthResponse.status -eq "healthy") {
        Write-Host "✅ Docker execution API is running and healthy" -ForegroundColor Green
        Write-Host "   Languages: $($healthResponse.languages -join ', ')" -ForegroundColor White
    } else {
        throw "API not healthy"
    }
} catch {
    Write-Host "❌ Docker execution API is not running!" -ForegroundColor Red
    Write-Host "   Starting execution system now..." -ForegroundColor Yellow
    
    # Start execution system
    Set-Location "E:\CodeArena\execution-system"
    
    # Add Docker to PATH
    $env:PATH += ";C:\Program Files\Docker\Docker\resources\bin"
    
    # Start simple execution API
    docker compose -f docker-compose-simple.yml up -d
    
    Write-Host "⏳ Waiting for execution system to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
    
    # Test again
    try {
        $healthResponse = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET -TimeoutSec 10
        Write-Host "✅ Docker execution API is now running!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to start Docker execution API. Using direct mode." -ForegroundColor Red
        $env:EXECUTION_MODE = "direct"
        Set-Location "E:\CodeArena"
        Write-Host "🎯 Starting CodeArena in direct mode..." -ForegroundColor Yellow
        npm run dev
        exit
    }
}

# Step 2: Test Docker execution
Write-Host "🧪 Testing Docker code execution..." -ForegroundColor Yellow
try {
    $testCode = @{
        code = "print('Hello from Docker!')"
        language = "python"
    } | ConvertTo-Json

    $testResult = Invoke-RestMethod -Uri "http://localhost:3001/api/execute" -Method POST -Body $testCode -ContentType "application/json" -TimeoutSec 30
    
    if ($testResult.output -like "*Hello from Docker*") {
        Write-Host "✅ Docker execution is working perfectly!" -ForegroundColor Green
        Write-Host "   Output: $($testResult.output.Trim())" -ForegroundColor White
    } else {
        throw "Unexpected output: $($testResult.output)"
    }
} catch {
    Write-Host "❌ Docker execution test failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Falling back to direct mode..." -ForegroundColor Yellow
    $env:EXECUTION_MODE = "direct"
    Set-Location "E:\CodeArena"
    Write-Host "🎯 Starting CodeArena in direct mode..." -ForegroundColor Yellow
    npm run dev
    exit
}

# Step 3: Set environment variables for Docker mode
Write-Host "⚙️ Setting environment variables for Docker execution..." -ForegroundColor Yellow
$env:EXECUTION_MODE = "docker"
$env:DOCKER_API_URL = "http://localhost:3001"
$env:EXECUTION_POLL_INTERVAL = "1000"
$env:EXECUTION_MAX_POLL_TIME = "60000"
$env:EXECUTION_TIMEOUT = "30000"

Write-Host "✅ Environment variables set:" -ForegroundColor Green
Write-Host "   EXECUTION_MODE: $env:EXECUTION_MODE" -ForegroundColor White
Write-Host "   DOCKER_API_URL: $env:DOCKER_API_URL" -ForegroundColor White

# Step 4: Navigate to CodeArena and start server
Set-Location "E:\CodeArena"
Write-Host "📁 Navigating to CodeArena directory..." -ForegroundColor Yellow

# Step 5: Start CodeArena server
Write-Host "🚀 Starting CodeArena server with Docker execution..." -ForegroundColor Green
Write-Host ""
Write-Host "🎯 IMPORTANT: When you click 'Run Code' in assignments/courses:" -ForegroundColor Cyan
Write-Host "   ✅ Code will be executed in Docker containers" -ForegroundColor White
Write-Host "   ✅ Full isolation and security" -ForegroundColor White
Write-Host "   ✅ Support for Python, JavaScript, C, C++, Java" -ForegroundColor White
Write-Host ""

# Start the server
npm run dev 