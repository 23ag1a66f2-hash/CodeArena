# Start CodeArena with Docker properly configured
Write-Host "🚀 Starting CodeArena with Docker..."

# 1. Start Docker Desktop and verify it's running
Write-Host "Step 1: Starting Docker..."
& .\start-docker-service.ps1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start Docker. Please start Docker Desktop manually and try again."
    exit 1
}

# 2. Set environment variables
Write-Host "Step 2: Setting environment variables..."
$env:EXECUTION_MODE = "docker"
$env:DOCKER_ENABLED = "true"
$env:PATH += ";C:\Program Files\Docker\Docker\resources\bin"

# 3. Start the server
Write-Host "Step 3: Starting CodeArena server..."
Write-Host "Server starting with Docker execution enabled..."
npm run dev 