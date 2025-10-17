# 🗑️ CodeArena Execution System - Kubernetes Cleanup Script
# This script removes the complete execution system from Kubernetes

Write-Host "🗑️ Cleaning up CodeArena Execution System from Kubernetes..." -ForegroundColor Yellow

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
    Write-Host "ℹ️  Namespace $NAMESPACE does not exist. Nothing to clean up." -ForegroundColor Blue
    exit 0
}

# Confirm deletion
Write-Host "⚠️  This will delete ALL resources in namespace: $NAMESPACE" -ForegroundColor Red
$confirmation = Read-Host "Are you sure you want to continue? (y/N)"
if ($confirmation -ne "y" -and $confirmation -ne "Y") {
    Write-Host "❌ Cleanup cancelled." -ForegroundColor Yellow
    exit 0
}

# Delete all resources in namespace
Write-Host "🗑️ Deleting all resources in namespace: $NAMESPACE" -ForegroundColor Yellow
kubectl delete all --all -n $NAMESPACE

# Delete configmaps and secrets
Write-Host "🗑️ Deleting configmaps and secrets..." -ForegroundColor Yellow
kubectl delete configmap --all -n $NAMESPACE
kubectl delete secret --all -n $NAMESPACE

# Delete namespace
Write-Host "🗑️ Deleting namespace: $NAMESPACE" -ForegroundColor Yellow
kubectl delete namespace $NAMESPACE

Write-Host "✅ Cleanup completed successfully!" -ForegroundColor Green
Write-Host "ℹ️  All CodeArena execution system resources have been removed." -ForegroundColor Blue 