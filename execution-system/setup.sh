#!/bin/bash

# Create temp directory if it doesn't exist
mkdir -p temp

# Set permissions for temp directory (readable/writable by all users)
chmod 777 temp

# Build Docker images
docker-compose build

# Start services
docker-compose up -d

echo "Setup complete! The code execution system is ready." 