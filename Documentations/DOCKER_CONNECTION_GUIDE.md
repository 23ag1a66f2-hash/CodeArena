# 🐳 Docker Connection Guide for CodeArena Execution System

## 🎯 **Overview**

This guide explains how to connect to Docker from within containers to enable the CodeArena execution system to spawn language-specific containers for code execution.

---

## 📋 **Available Docker Connection Methods**

### **1. Docker Socket Mounting (Recommended for Development)**

**How it works:** Mount the host Docker socket into the container

**Advantages:**
- ✅ Simple setup
- ✅ Direct access to Docker daemon
- ✅ No additional containers needed
- ✅ Fast performance

**Disadvantages:**
- ⚠️ Security risk (container has full Docker access)
- ⚠️ Host dependency
- ⚠️ Not portable across different Docker setups

### **2. Docker-in-Docker (DinD)**

**How it works:** Run a separate Docker daemon inside the container

**Advantages:**
- ✅ Isolated Docker environment
- ✅ No host Docker socket access
- ✅ Better security isolation

**Disadvantages:**
- ⚠️ More complex setup
- ⚠️ Higher resource usage
- ⚠️ Potential networking issues

### **3. Remote Docker API**

**How it works:** Connect to Docker daemon via TCP API

**Advantages:**
- ✅ Works across network
- ✅ Can connect to remote Docker hosts
- ✅ API-based access

**Disadvantages:**
- ⚠️ Network latency
- ⚠️ Security configuration needed
- ⚠️ Firewall considerations

---

## 🔧 **Implementation Examples**

### **Method 1: Docker Socket Mounting (Current Implementation)**

#### **Dockerfile for Worker**
```dockerfile
# Dockerfile.worker
FROM node:18-alpine

# Install Docker CLI
RUN apk add --no-cache docker-cli curl bash tini

WORKDIR /app
COPY queue/package*.json ./
RUN npm ci --only=production

COPY queue/src ./src

# Create user with Docker access
RUN addgroup -g 1001 -S worker && \
    adduser -S worker -u 1001 -G worker && \
    adduser worker docker

USER worker
EXPOSE 3002
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/worker.js"]
```

#### **Docker Compose Configuration**
```yaml
version: '3.8'
services:
  worker:
    build:
      dockerfile: Dockerfile.worker
    volumes:
      # Mount Docker socket
      - /var/run/docker.sock:/var/run/docker.sock:rw
    environment:
      - DOCKER_HOST=unix:///var/run/docker.sock
    privileged: true  # Required for Docker operations
```

#### **Kubernetes Configuration**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: execution-worker
spec:
  template:
    spec:
      containers:
      - name: worker
        image: codearena/execution-worker
        volumeMounts:
        - name: docker-sock
          mountPath: /var/run/docker.sock
        securityContext:
          privileged: true
          runAsUser: 0  # Root required for Docker socket access
      volumes:
      - name: docker-sock
        hostPath:
          path: /var/run/docker.sock
          type: Socket
```

---

### **Method 2: Docker-in-Docker (DinD)**

#### **Dockerfile for DinD Worker**
```dockerfile
# Dockerfile.worker-dind
FROM docker:20.10-dind

# Install Node.js
RUN apk add --no-cache nodejs npm curl bash tini

WORKDIR /app
COPY queue/package*.json ./
RUN npm ci --only=production

COPY queue/src ./src

# Start Docker daemon and app
COPY start-dind.sh /start-dind.sh
RUN chmod +x /start-dind.sh

EXPOSE 3002
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/start-dind.sh"]
```

#### **Start Script for DinD**
```bash
#!/bin/bash
# start-dind.sh

# Start Docker daemon in background
dockerd &

# Wait for Docker to be ready
echo "Waiting for Docker daemon..."
while ! docker info >/dev/null 2>&1; do
    sleep 1
done

echo "Docker daemon ready, starting worker..."
# Start the worker application
exec node src/worker.js
```

#### **Docker Compose for DinD**
```yaml
version: '3.8'
services:
  worker-dind:
    build:
      dockerfile: Dockerfile.worker-dind
    privileged: true  # Required for DinD
    environment:
      - DOCKER_TLS_CERTDIR=""  # Disable TLS for simplicity
    volumes:
      - worker_docker:/var/lib/docker

volumes:
  worker_docker:
```

---

### **Method 3: Remote Docker API**

#### **Dockerfile for Remote API**
```dockerfile
# Dockerfile.worker-remote
FROM node:18-alpine

RUN apk add --no-cache curl bash tini

WORKDIR /app
COPY queue/package*.json ./
RUN npm ci --only=production

# Install dockerode for remote API access
RUN npm install dockerode

COPY queue/src ./src

USER 1001
EXPOSE 3002
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/worker.js"]
```

#### **Worker Configuration for Remote API**
```javascript
// In worker.js
const Docker = require('dockerode');

// Connect to remote Docker daemon
const docker = new Docker({
  host: process.env.DOCKER_HOST || 'localhost',
  port: process.env.DOCKER_PORT || 2376,
  protocol: 'http'
});

// Or with TLS
const dockerTLS = new Docker({
  host: 'remote-docker-host',
  port: 2376,
  ca: fs.readFileSync('ca.pem'),
  cert: fs.readFileSync('cert.pem'),
  key: fs.readFileSync('key.pem')
});
```

---

## 🛡️ **Security Considerations**

### **Docker Socket Mounting Risks**
```yaml
# ❌ INSECURE - Full Docker access
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:rw

# ✅ BETTER - Read-only socket (if possible)
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro

# ✅ BEST - Use specific capabilities
security_opt:
  - apparmor:unconfined
cap_add:
  - SYS_ADMIN
cap_drop:
  - ALL
```

### **Kubernetes Security Context**
```yaml
securityContext:
  # Limit privileges
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  runAsNonRoot: false  # Required for Docker socket
  runAsUser: 0
  capabilities:
    add:
      - SYS_ADMIN
    drop:
      - ALL
```

### **Network Security**
```yaml
# Limit network access
networkPolicy:
  podSelector:
    matchLabels:
      app: execution-worker
  policyTypes:
  - Ingress
  - Egress
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 6379  # Redis only
```

---

## 🚀 **Quick Setup Instructions**

### **For Local Development**

**1. Using Docker Compose (Recommended)**
```bash
# Navigate to execution system
cd execution-system

# Start with Docker socket mounting
docker-compose up -d

# Verify worker can access Docker
docker-compose exec worker docker ps
```

**2. Manual Docker Run**
```bash
# Build worker image
docker build -f Dockerfile.worker -t execution-worker .

# Run with Docker socket
docker run -d \
  --name execution-worker \
  -v /var/run/docker.sock:/var/run/docker.sock:rw \
  --privileged \
  execution-worker
```

### **For Kubernetes Production**

**1. Apply Worker Deployment**
```bash
# Deploy with proper RBAC and security context
kubectl apply -f k8s/worker.yaml

# Check pods
kubectl get pods -n codearena-execution

# Check worker logs
kubectl logs -f deployment/execution-worker -n codearena-execution
```

**2. Verify Docker Connectivity**
```bash
# Test Docker access from worker pod
kubectl exec -it deployment/execution-worker -n codearena-execution -- docker ps

# Should show running containers or empty list
```

---

## 🔍 **Testing Docker Connection**

### **Test Script**
```bash
#!/bin/bash
# test-docker-connection.sh

echo "🐳 Testing Docker connection from worker..."

# Test 1: Docker version
echo "1. Testing Docker version..."
docker --version

# Test 2: Docker daemon connection
echo "2. Testing Docker daemon connection..."
docker info

# Test 3: Pull test image
echo "3. Testing image pull..."
docker pull hello-world

# Test 4: Run test container
echo "4. Testing container execution..."
docker run --rm hello-world

# Test 5: List containers
echo "5. Testing container listing..."
docker ps -a

echo "✅ Docker connection test complete!"
```

### **Worker Health Check**
```javascript
// In worker.js - Add health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test Docker connection
    await docker.ping();
    
    // Test Redis connection
    await queue.isReady();
    
    res.json({
      status: 'healthy',
      docker: 'connected',
      redis: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
```

---

## 📊 **Monitoring Docker Connection**

### **Metrics to Track**
```javascript
// Docker connection metrics
const dockerMetrics = {
  containersRunning: await docker.listContainers().length,
  imagesCount: await docker.listImages().length,
  dockerVersion: await docker.version(),
  dockerInfo: await docker.info()
};
```

### **Health Monitoring**
```bash
# Monitor Docker daemon health
watch -n 5 'docker system df'

# Monitor container resource usage
watch -n 5 'docker stats --no-stream'

# Monitor worker logs for Docker errors
kubectl logs -f deployment/execution-worker -n codearena-execution | grep -i docker
```

---

## 🎯 **Troubleshooting Common Issues**

### **1. Permission Denied Errors**
```bash
# Add user to docker group
usermod -aG docker worker

# Or run as root (less secure)
USER root
```

### **2. Socket Not Found**
```bash
# Verify Docker socket exists
ls -la /var/run/docker.sock

# Check Docker daemon is running
systemctl status docker
```

### **3. Kubernetes Pod Security Issues**
```yaml
# Add security context
securityContext:
  privileged: true
  runAsUser: 0
```

### **4. Network Connectivity Issues**
```bash
# Test from inside container
docker exec -it worker-container ping docker-daemon-host

# Check firewall rules
iptables -L
```

---

## ✅ **Verification Checklist**

- [ ] **Docker CLI installed** in worker container
- [ ] **Docker socket mounted** correctly
- [ ] **Privileged mode enabled** (if required)
- [ ] **User permissions** configured for Docker access
- [ ] **Health checks** verify Docker connectivity
- [ ] **Security context** properly configured for Kubernetes
- [ ] **Network policies** allow required connections
- [ ] **Monitoring** tracks Docker daemon health
- [ ] **Error handling** manages Docker failures gracefully

---

## 🎉 **Success Verification**

**Your Docker connection is working when:**

```bash
# From within worker container
docker ps                    # Shows containers
docker pull alpine          # Can pull images  
docker run --rm alpine echo "test"  # Can run containers
curl http://localhost:3002/health    # Health check passes
```

**Expected health check response:**
```json
{
  "status": "healthy",
  "docker": "connected",
  "redis": "connected",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

This setup enables your CodeArena execution system to securely spawn and manage Docker containers for code execution while maintaining proper isolation and security! 🚀 