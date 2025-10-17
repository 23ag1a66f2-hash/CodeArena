# Create temp directory if it doesn't exist
$tempDir = Join-Path $PSScriptRoot "temp"
if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir
}

# Set permissions for temp directory
$acl = Get-Acl $tempDir
$accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule("Everyone", "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
$acl.SetAccessRule($accessRule)
Set-Acl $tempDir $acl

Write-Host "Created temp directory with proper permissions at: $tempDir"

# Stop any running containers
docker-compose down

# Remove old images
docker rmi codearena-python codearena-javascript codearena-java codearena-cpp codearena-c execution-system-api execution-system-worker -f

# Build images
docker-compose build --no-cache

# Start services
docker-compose up -d

Write-Host "Setup complete! Services are starting..." 