# 🚀 CodeArena Execution System - Kubernetes Deployment Script
# This script deploys the complete execution system to Kubernetes

Write-Host "🚀 Deploying CodeArena Execution System to Kubernetes..." -ForegroundColor Green

# Set namespace
$NAMESPACE = "codearena-execution"

# Check if kubectl is available
try {
    kubectl version --client | Out-Null
    Write-Host "✅ kubectl is available" -ForegroundColor Green
} catch {
    Write-Host "❌ kubectl not found. Please install kubectl first." -ForegroundColor Red
    exit 1
}

# Check if namespace exists
$namespaceExists = kubectl get namespace $NAMESPACE 2>$null
if (-not $namespaceExists) {
    Write-Host "📦 Creating namespace: $NAMESPACE" -ForegroundColor Yellow
    kubectl apply -f k8s/namespace.yaml
} else {
    Write-Host "✅ Namespace $NAMESPACE already exists" -ForegroundColor Green
}

# Apply configuration
Write-Host "⚙️  Applying configuration..." -ForegroundColor Yellow
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml

# Deploy Redis
Write-Host "🔴 Deploying Redis..." -ForegroundColor Yellow
kubectl apply -f k8s/redis.yaml

# Wait for Redis to be ready
Write-Host "⏳ Waiting for Redis to be ready..." -ForegroundColor Yellow
kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=120s

# Deploy API service
Write-Host "🌐 Deploying API service..." -ForegroundColor Yellow
kubectl apply -f k8s/api.yaml

# Deploy Worker service
Write-Host "🔧 Deploying Worker service..." -ForegroundColor Yellow
kubectl apply -f k8s/worker.yaml

# Wait for deployments to be ready
Write-Host "⏳ Waiting for deployments to be ready..." -ForegroundColor Yellow
kubectl wait --for=condition=available deployment/execution-api -n $NAMESPACE --timeout=300s
kubectl wait --for=condition=available deployment/execution-worker -n $NAMESPACE --timeout=300s

# Show deployment status
Write-Host "📊 Deployment Status:" -ForegroundColor Green
kubectl get all -n $NAMESPACE

Write-Host "✅ Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 To access the API locally, run:" -ForegroundColor Cyan
Write-Host "kubectl port-forward service/execution-api 3001:3001 -n $NAMESPACE" -ForegroundColor White
Write-Host ""
Write-Host "🧪 To test the API, run:" -ForegroundColor Cyan
Write-Host "curl http://localhost:3001/health" -ForegroundColor White
Write-Host ""
Write-Host "📋 To view logs, run:" -ForegroundColor Cyan
Write-Host "kubectl logs -f deployment/execution-api -n $NAMESPACE" -ForegroundColor White 