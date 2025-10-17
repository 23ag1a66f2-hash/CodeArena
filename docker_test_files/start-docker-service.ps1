# Ensure Docker service is running
Write-Host "🔄 Starting Docker service..."

# Try to start Docker Desktop first (preferred method)
$dockerDesktopPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
if (Test-Path $dockerDesktopPath) {
    Write-Host "📦 Found Docker Desktop, starting..."
    Start-Process $dockerDesktopPath
    Write-Host "⏳ Waiting for Docker to start (30s)..."
    Start-Sleep -Seconds 30
}

# Add Docker to PATH
$dockerPath = "C:\Program Files\Docker\Docker\resources\bin"
if ($env:PATH -notlike "*$dockerPath*") {
    Write-Host "🔧 Adding Docker to PATH..."
    $env:PATH += ";$dockerPath"
}

# Test Docker
Write-Host "🧪 Testing Docker..."
docker version
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Docker is running!"
} else {
    Write-Host "❌ Docker is not running. Please:"
    Write-Host "1. Open Docker Desktop manually"
    Write-Host "2. Wait for it to start completely"
    Write-Host "3. Try running this script again"
    exit 1
}

# Pull necessary images
Write-Host "📥 Pulling necessary Docker images..."
docker pull python:3.11-alpine
docker pull node:18-alpine
docker pull gcc:latest
docker pull openjdk:11-alpine

Write-Host "🚀 Docker is ready!" 