#!/bin/bash

# CodeArena Execution System Build Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REGISTRY=${DOCKER_REGISTRY:-"codearena"}
VERSION=${VERSION:-"latest"}
BUILD_ARGS=${BUILD_ARGS:-""}

echo -e "${GREEN}🚀 Building CodeArena Execution System${NC}"
echo -e "${YELLOW}Registry: ${REGISTRY}${NC}"
echo -e "${YELLOW}Version: ${VERSION}${NC}"

# Function to build and push Docker image
build_image() {
    local context=$1
    local dockerfile=$2
    local image_name=$3
    
    echo -e "${GREEN}📦 Building ${image_name}...${NC}"
    
    docker build \
        --platform linux/amd64,linux/arm64 \
        --file "${dockerfile}" \
        --tag "${REGISTRY}/${image_name}:${VERSION}" \
        --tag "${REGISTRY}/${image_name}:latest" \
        ${BUILD_ARGS} \
        "${context}"
    
    if [ "${PUSH_IMAGES:-true}" = "true" ]; then
        echo -e "${GREEN}🚢 Pushing ${image_name}...${NC}"
        docker push "${REGISTRY}/${image_name}:${VERSION}"
        docker push "${REGISTRY}/${image_name}:latest"
    fi
    
    echo -e "${GREEN}✅ ${image_name} build complete${NC}"
}

# Build language execution images
echo -e "${YELLOW}Building language execution images...${NC}"

build_image "docker/python" "docker/python/Dockerfile" "python-executor"
build_image "docker/javascript" "docker/javascript/Dockerfile" "js-executor"
build_image "docker/c" "docker/c/Dockerfile" "c-executor"
build_image "docker/cpp" "docker/cpp/Dockerfile" "cpp-executor"
build_image "docker/java" "docker/java/Dockerfile" "java-executor"

# Build API image
echo -e "${YELLOW}Building API image...${NC}"
cat > queue/Dockerfile.api << 'EOF'
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime

RUN addgroup -g 1000 app && \
    adduser -u 1000 -G app -s /bin/sh -D app

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=app:app src ./src
COPY --chown=app:app package*.json ./

USER app
EXPOSE 3001 3002 9090

CMD ["node", "src/server.js"]
EOF

build_image "queue" "queue/Dockerfile.api" "execution-api"

# Build Worker image
echo -e "${YELLOW}Building Worker image...${NC}"
cat > workers/Dockerfile << 'EOF'
FROM node:18-alpine AS builder

WORKDIR /app
COPY ../queue/package*.json ./
RUN npm ci --only=production

FROM docker:24-dind AS runtime

# Install Node.js
RUN apk add --no-cache nodejs npm

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY worker.js ./
COPY ../queue/src ./queue/src
COPY ../queue/package*.json ./

EXPOSE 9090

CMD ["node", "worker.js"]
EOF

build_image "workers" "workers/Dockerfile" "execution-worker"

# Generate Kubernetes manifests with correct image names
echo -e "${YELLOW}Generating Kubernetes manifests...${NC}"

mkdir -p k8s/generated

# Update image references in manifests
for file in k8s/*.yaml; do
    if [ -f "$file" ]; then
        output_file="k8s/generated/$(basename "$file")"
        sed "s|codearena/|${REGISTRY}/|g" "$file" | \
        sed "s|:latest|:${VERSION}|g" > "$output_file"
        echo "Generated: $output_file"
    fi
done

# Create deployment script
cat > k8s/generated/deploy.sh << 'EOF'
#!/bin/bash

set -e

echo "🚀 Deploying CodeArena Execution System..."

# Apply manifests in order
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml
kubectl apply -f redis.yaml

# Wait for Redis to be ready
echo "⏳ Waiting for Redis to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/redis -n codearena-execution

# Deploy API and Workers
kubectl apply -f api.yaml
kubectl apply -f worker.yaml

# Wait for deployments
echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/execution-api -n codearena-execution
kubectl wait --for=condition=available --timeout=300s deployment/execution-worker -n codearena-execution

# Deploy monitoring (optional)
if [ "${DEPLOY_MONITORING:-true}" = "true" ]; then
    echo "📊 Deploying monitoring stack..."
    kubectl apply -f prometheus.yaml
    kubectl wait --for=condition=available --timeout=300s deployment/prometheus -n codearena-execution
fi

echo "✅ Deployment complete!"
echo ""
echo "🌐 Access points:"
echo "  API: https://api.codearena.example.com"
echo "  Prometheus: kubectl port-forward svc/prometheus-service 9090:9090 -n codearena-execution"
echo ""
echo "📊 Monitor with:"
echo "  kubectl get pods -n codearena-execution"
echo "  kubectl logs -f deployment/execution-api -n codearena-execution"
echo "  kubectl logs -f deployment/execution-worker -n codearena-execution"
EOF

chmod +x k8s/generated/deploy.sh

# Create uninstall script
cat > k8s/generated/uninstall.sh << 'EOF'
#!/bin/bash

set -e

echo "🗑️  Uninstalling CodeArena Execution System..."

# Delete in reverse order
kubectl delete -f prometheus.yaml --ignore-not-found=true
kubectl delete -f worker.yaml --ignore-not-found=true
kubectl delete -f api.yaml --ignore-not-found=true
kubectl delete -f redis.yaml --ignore-not-found=true
kubectl delete -f secret.yaml --ignore-not-found=true
kubectl delete -f configmap.yaml --ignore-not-found=true
kubectl delete -f namespace.yaml --ignore-not-found=true

echo "✅ Uninstall complete!"
EOF

chmod +x k8s/generated/uninstall.sh

# Generate docker-compose for local development
echo -e "${YELLOW}Generating docker-compose for local development...${NC}"

cat > docker-compose.yml << EOF
version: '3.8'

services:
  redis:
    image: redis:7.0-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  api:
    image: ${REGISTRY}/execution-api:${VERSION}
    ports:
      - "3001:3001"
      - "3002:3002"
      - "9090:9090"
    environment:
      - REDIS_HOST=redis
      - NODE_ENV=development
      - LOG_LEVEL=debug
    depends_on:
      - redis
    volumes:
      - ./queue:/app
    command: npm run dev

  worker:
    image: ${REGISTRY}/execution-worker:${VERSION}
    environment:
      - REDIS_HOST=redis
      - NODE_ENV=development
      - LOG_LEVEL=debug
      - WORKER_CONCURRENCY=2
    depends_on:
      - redis
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./workers:/app
    privileged: true

volumes:
  redis_data:
EOF

echo -e "${GREEN}✅ Build complete!${NC}"
echo ""
echo -e "${YELLOW}📁 Generated files:${NC}"
echo "  - k8s/generated/deploy.sh"
echo "  - k8s/generated/uninstall.sh"
echo "  - docker-compose.yml"
echo ""
echo -e "${YELLOW}🚀 Next steps:${NC}"
echo "  1. Deploy to Kubernetes: cd k8s/generated && ./deploy.sh"
echo "  2. Or run locally: docker-compose up"
echo "  3. Test API: curl http://localhost:3001/health" 