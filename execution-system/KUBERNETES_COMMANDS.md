# 🚀 Kubernetes Commands for Docker Desktop - CodeArena Execution System

## 📋 Prerequisites Setup

### 1. Install kubectl for Windows
```powershell
# Download kubectl for Windows
Invoke-WebRequest -Uri "https://dl.k8s.io/release/v1.28.0/bin/windows/amd64/kubectl.exe" -OutFile "kubectl.exe"

# Move to System32 (or add to PATH)
Move-Item kubectl.exe "C:\Windows\System32\kubectl.exe"

# Verify installation
kubectl version --client
```

### 2. Enable Kubernetes in Docker Desktop
- Open Docker Desktop
- Go to Settings → Kubernetes
- Check "Enable Kubernetes"
- Click "Apply & Restart"

### 3. Verify Kubernetes is running
```powershell
kubectl cluster-info
kubectl get nodes
```

## 🚀 Quick Deployment

### Option 1: Use PowerShell Scripts (Recommended)
```powershell
# Navigate to execution system
cd E:\CodeArena\execution-system

# Deploy everything
.\deploy-k8s.ps1

# Cleanup everything
.\cleanup-k8s.ps1
```

### Option 2: Manual Commands
```powershell
# Navigate to execution system
cd E:\CodeArena\execution-system

# Create namespace
kubectl apply -f k8s/namespace.yaml

# Apply configuration
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml

# Deploy Redis
kubectl apply -f k8s/redis.yaml

# Wait for Redis
kubectl wait --for=condition=ready pod -l app=redis -n codearena-execution --timeout=120s

# Deploy API and Worker
kubectl apply -f k8s/api.yaml
kubectl apply -f k8s/worker.yaml

# Wait for deployments
kubectl wait --for=condition=available deployment/execution-api -n codearena-execution --timeout=300s
kubectl wait --for=condition=available deployment/execution-worker -n codearena-execution --timeout=300s
```

## 📊 Monitoring Commands

### Check Deployment Status
```powershell
# View all resources
kubectl get all -n codearena-execution

# View pods with details
kubectl get pods -n codearena-execution -o wide

# View services
kubectl get services -n codearena-execution

# View deployments
kubectl get deployments -n codearena-execution

# View autoscaling
kubectl get hpa -n codearena-execution
```

### Check Resource Usage
```powershell
# Pod resource usage
kubectl top pods -n codearena-execution

# Node resource usage
kubectl top nodes

# Resource quotas
kubectl get resourcequota -n codearena-execution
```

### View Logs
```powershell
# API logs
kubectl logs -f deployment/execution-api -n codearena-execution

# Worker logs
kubectl logs -f deployment/execution-worker -n codearena-execution

# Redis logs
kubectl logs -f deployment/redis -n codearena-execution

# Specific pod logs
kubectl logs -f <pod-name> -n codearena-execution
```

## 🔧 Troubleshooting Commands

### Describe Resources
```powershell
# Describe pod
kubectl describe pod <pod-name> -n codearena-execution

# Describe service
kubectl describe service execution-api -n codearena-execution

# Describe deployment
kubectl describe deployment execution-api -n codearena-execution

# Describe events
kubectl get events -n codearena-execution --sort-by='.lastTimestamp'
```

### Execute Commands in Pods
```powershell
# Access API pod
kubectl exec -it deployment/execution-api -n codearena-execution -- /bin/sh

# Access worker pod
kubectl exec -it deployment/execution-worker -n codearena-execution -- /bin/sh

# Access Redis pod
kubectl exec -it deployment/redis -n codearena-execution -- redis-cli

# Run specific command
kubectl exec deployment/execution-api -n codearena-execution -- curl -f http://localhost:3001/health
```

### Check Configuration
```powershell
# View configmaps
kubectl get configmap -n codearena-execution
kubectl describe configmap execution-config -n codearena-execution

# View secrets
kubectl get secret -n codearena-execution
kubectl describe secret execution-secrets -n codearena-execution

# View environment variables
kubectl exec deployment/execution-api -n codearena-execution -- env | grep REDIS
```

## 🌐 Access Services

### Port Forwarding
```powershell
# Forward API service
kubectl port-forward service/execution-api 3001:3001 -n codearena-execution

# Forward Redis service (for debugging)
kubectl port-forward service/redis 6379:6379 -n codearena-execution

# Forward Prometheus (if deployed)
kubectl port-forward service/prometheus 9090:9090 -n codearena-execution
```

### Test API
```powershell
# Health check
curl http://localhost:3001/health

# Queue stats
curl http://localhost:3001/api/queue/stats

# Execute code
$testCode = @{
    code = "print('Hello from Kubernetes!')"
    language = "python"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/execute" -Method POST -Body $testCode -ContentType "application/json"
```

## 🔄 Scaling Commands

### Manual Scaling
```powershell
# Scale API replicas
kubectl scale deployment execution-api --replicas=3 -n codearena-execution

# Scale worker replicas
kubectl scale deployment execution-worker --replicas=5 -n codearena-execution

# Check scaling status
kubectl get pods -l app=execution-api -n codearena-execution
kubectl get pods -l app=execution-worker -n codearena-execution
```

### Autoscaling
```powershell
# Check HPA status
kubectl get hpa -n codearena-execution

# Describe HPA
kubectl describe hpa execution-api-hpa -n codearena-execution
kubectl describe hpa execution-worker-hpa -n codearena-execution

# View HPA metrics
kubectl top pods -n codearena-execution
```

## 🗑️ Cleanup Commands

### Selective Cleanup
```powershell
# Delete specific deployments
kubectl delete deployment execution-api -n codearena-execution
kubectl delete deployment execution-worker -n codearena-execution
kubectl delete deployment redis -n codearena-execution

# Delete services
kubectl delete service execution-api -n codearena-execution
kubectl delete service execution-worker -n codearena-execution
kubectl delete service redis -n codearena-execution

# Delete configmaps and secrets
kubectl delete configmap --all -n codearena-execution
kubectl delete secret --all -n codearena-execution
```

### Complete Cleanup
```powershell
# Delete all resources in namespace
kubectl delete all --all -n codearena-execution

# Delete namespace (removes everything)
kubectl delete namespace codearena-execution

# Verify cleanup
kubectl get namespace codearena-execution
```

## 🔍 Debugging Commands

### Check Pod Status
```powershell
# Get pod status
kubectl get pods -n codearena-execution

# Get pod details
kubectl describe pod <pod-name> -n codearena-execution

# Check pod logs
kubectl logs <pod-name> -n codearena-execution

# Check previous logs (if pod restarted)
kubectl logs <pod-name> --previous -n codearena-execution
```

### Check Network
```powershell
# Test service connectivity
kubectl exec deployment/execution-api -n codearena-execution -- curl -f http://redis:6379

# Check DNS resolution
kubectl exec deployment/execution-api -n codearena-execution -- nslookup redis

# Check network policies
kubectl get networkpolicy -n codearena-execution
```

### Check Storage
```powershell
# Check persistent volumes
kubectl get pv -n codearena-execution

# Check persistent volume claims
kubectl get pvc -n codearena-execution

# Describe storage
kubectl describe pvc <pvc-name> -n codearena-execution
```

## 📈 Performance Monitoring

### Resource Monitoring
```powershell
# Monitor pod resources
kubectl top pods -n codearena-execution --containers

# Monitor node resources
kubectl top nodes

# Check resource limits
kubectl describe pod <pod-name> -n codearena-execution | Select-String -Pattern "Limits|Requests"
```

### Queue Monitoring
```powershell
# Check queue stats via API
curl http://localhost:3001/api/queue/stats

# Check Redis directly
kubectl exec deployment/redis -n codearena-execution -- redis-cli info memory
kubectl exec deployment/redis -n codearena-execution -- redis-cli info keyspace
```

## 🚨 Emergency Commands

### Force Delete
```powershell
# Force delete stuck pods
kubectl delete pod <pod-name> --force --grace-period=0 -n codearena-execution

# Force delete stuck deployments
kubectl delete deployment <deployment-name> --force --grace-period=0 -n codearena-execution
```

### Restart Services
```powershell
# Restart API deployment
kubectl rollout restart deployment/execution-api -n codearena-execution

# Restart worker deployment
kubectl rollout restart deployment/execution-worker -n codearena-execution

# Check rollout status
kubectl rollout status deployment/execution-api -n codearena-execution
```

### Emergency Access
```powershell
# Access pod with root (if needed)
kubectl exec -it <pod-name> -n codearena-execution -- /bin/sh -c "su -"

# Check system resources in pod
kubectl exec <pod-name> -n codearena-execution -- df -h
kubectl exec <pod-name> -n codearena-execution -- free -h
```

## 📝 Useful Aliases

Add these to your PowerShell profile for convenience:
```powershell
# Set alias for namespace
Set-Alias -Name k -Value kubectl
$env:KUBECTL_NAMESPACE = "codearena-execution"

# Quick commands
function kpods { kubectl get pods -n codearena-execution }
function klogs { kubectl logs -f deployment/execution-api -n codearena-execution }
function kstatus { kubectl get all -n codearena-execution }
function kclean { kubectl delete all --all -n codearena-execution }
```

## 🎯 Quick Reference

### Most Used Commands
```powershell
# Deploy everything
.\deploy-k8s.ps1

# Check status
kubectl get all -n codearena-execution

# View logs
kubectl logs -f deployment/execution-api -n codearena-execution

# Access API
kubectl port-forward service/execution-api 3001:3001 -n codearena-execution

# Cleanup everything
.\cleanup-k8s.ps1
```

### Troubleshooting Flow
1. `kubectl get pods -n codearena-execution` - Check pod status
2. `kubectl describe pod <pod-name> -n codearena-execution` - Get detailed info
3. `kubectl logs <pod-name> -n codearena-execution` - Check logs
4. `kubectl exec -it <pod-name> -n codearena-execution -- /bin/sh` - Debug inside pod
5. `kubectl get events -n codearena-execution` - Check recent events 