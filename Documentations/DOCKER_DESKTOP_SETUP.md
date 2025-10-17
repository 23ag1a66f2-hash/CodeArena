# 🐳 Docker Desktop Setup Guide for CodeArena Execution System

## 🎯 **Step-by-Step Docker Desktop Setup**

This guide will help you run the CodeArena execution system using Docker Desktop and make problem compilation work perfectly.

---

## 📋 **Prerequisites**

### **1. Install Docker Desktop**
- Download from: https://www.docker.com/products/docker-desktop/
- Install and restart your computer
- Ensure Docker Desktop is running (whale icon in system tray)

### **2. Configure Docker Desktop**
1. **Open Docker Desktop**
2. **Go to Settings** (gear icon)
3. **Resources → Advanced:**
   - CPU: At least 4 cores
   - Memory: At least 8GB (16GB recommended)
   - Disk: At least 20GB free space

4. **Docker Engine → Features:**
   - Enable "Use Docker Compose V2"
   - Enable "Use containerd for pulling and storing images"

5. **Apply & Restart**

---

## 🚀 **Step 1: Prepare Your System**

### **Open PowerShell as Administrator**
```powershell
# Check Docker is running
docker --version
docker info

# Should show Docker version and system info
```

### **Navigate to Your Project**
```powershell
cd E:\CodeArena\execution-system
```

---

## 🏗️ **Step 2: Build Docker Images**

### **Build All Required Images**

**Option A: Using the Build Script**
```powershell
# Run the automated build script
bash scripts/build.sh

# If bash is not available, use PowerShell equivalent:
# See Step 2B below
```

**Option B: Manual Build (PowerShell)**
```powershell
# Build language execution containers
cd docker\python
docker build -t codearena/executor-python:latest .

cd ..\javascript  
docker build -t codearena/executor-javascript:latest .

cd ..\c
docker build -t codearena/executor-c:latest .

cd ..\cpp
docker build -t codearena/executor-cpp:latest .

cd ..\java
docker build -t codearena/executor-java:latest .

# Go back to execution-system root
cd ..\..

# Build API and Worker services
docker build -f Dockerfile.api -t codearena/execution-api:latest .
docker build -f Dockerfile.worker -t codearena/execution-worker:latest .
```

### **Verify Images Are Built**
```powershell
docker images | Select-String "codearena"
```

**Expected Output:**
```
codearena/executor-python     latest    abc123    2 minutes ago    150MB
codearena/executor-javascript latest    def456    2 minutes ago    180MB
codearena/executor-c          latest    ghi789    2 minutes ago    120MB
codearena/executor-cpp        latest    jkl012    2 minutes ago    130MB
codearena/executor-java       latest    mno345    2 minutes ago    250MB
codearena/execution-api       latest    pqr678    1 minute ago     200MB
codearena/execution-worker    latest    stu901    1 minute ago     220MB
```

---

## 🏃 **Step 3: Start the Execution System**

### **Using Docker Compose (Recommended)**
```powershell
# Start all services in background
docker-compose up -d

# Check services are running
docker-compose ps

# View logs in real-time
docker-compose logs -f
```

### **Using Docker Desktop UI**
1. **Open Docker Desktop**
2. **Go to "Containers" tab**
3. **You should see:**
   - `execution-redis` (Redis database)
   - `execution-api` (API service)
   - `execution-worker` (Code execution worker)

4. **All should show "Running" status with green indicators**

---

## 🧪 **Step 4: Test the System**

### **Test Health Endpoints**
```powershell
# Test API health
curl http://localhost:3001/health

# Test queue statistics
curl http://localhost:3001/api/stats

# Test supported languages
curl http://localhost:3001/api/languages
```

### **Test Code Execution**
```powershell
# Test Python execution
$pythonTest = @{
    code = "print('Hello from Python!')"
    language = "python"
} | ConvertTo-Json

curl -X POST http://localhost:3001/api/execute `
     -H "Content-Type: application/json" `
     -Body $pythonTest

# Test JavaScript execution  
$jsTest = @{
    code = "console.log('Hello from JavaScript!');"
    language = "javascript"
} | ConvertTo-Json

curl -X POST http://localhost:3001/api/execute `
     -H "Content-Type: application/json" `
     -Body $jsTest
```

### **Test Compilation Languages**
```powershell
# Test C compilation
$cTest = @{
    code = "#include <stdio.h>`nint main() { printf(`"Hello from C!`"); return 0; }"
    language = "c"
} | ConvertTo-Json

curl -X POST http://localhost:3001/api/execute `
     -H "Content-Type: application/json" `
     -Body $cTest

# Test C++ compilation
$cppTest = @{
    code = "#include <iostream>`nint main() { std::cout << `"Hello from C++!`"; return 0; }"
    language = "cpp"
} | ConvertTo-Json

curl -X POST http://localhost:3001/api/execute `
     -H "Content-Type: application/json" `
     -Body $cppTest

# Test Java compilation
$javaTest = @{
    code = "public class Main { public static void main(String[] args) { System.out.println(`"Hello from Java!`"); } }"
    language = "java"
} | ConvertTo-Json

curl -X POST http://localhost:3001/api/execute `
     -H "Content-Type: application/json" `
     -Body $javaTest
```

---

## 🔍 **Step 5: Monitor in Docker Desktop**

### **View Container Logs**
1. **Open Docker Desktop**
2. **Go to "Containers" tab**
3. **Click on any container name**
4. **Go to "Logs" tab to see output**

### **Check Resource Usage**
1. **In Docker Desktop, click on running containers**
2. **Go to "Stats" tab**
3. **Monitor CPU, Memory, and Network usage**

### **Useful Docker Desktop Actions**
- **Start/Stop containers:** Use the play/stop buttons
- **Restart containers:** Right-click → Restart
- **View files:** Go to "Files" tab in container details
- **Open terminal:** Click "CLI" button for container shell

---

## 🔗 **Step 6: Connect to Your CodeArena Server**

### **Update Your CodeArena Environment**
```powershell
# In your CodeArena server directory
cd E:\CodeArena\server

# Set environment variables
$env:EXECUTION_MODE = "queue"
$env:EXECUTION_QUEUE_URL = "http://localhost:3001"

# Start your CodeArena server
npm start
```

### **Test Integration**
```powershell
# In another PowerShell window
cd E:\CodeArena

# Run integration test
node test-execution-integration.js
```

---

## 📊 **Step 7: Verify Everything Works**

### **Check All Services**
```powershell
# Check Docker containers
docker ps

# Check CodeArena health
curl http://localhost:5000/api/health

# Check execution system health  
curl http://localhost:3001/health
```

### **Test Problem Compilation**
```powershell
# Test through CodeArena API (replace YOUR_TOKEN with actual auth token)
$problemTest = @{
    code = "def solution(n): return n * 2`nprint(solution(5))"
    language = "python"
} | ConvertTo-Json

curl -X POST http://localhost:5000/api/execute `
     -H "Content-Type: application/json" `
     -H "Authorization: Bearer YOUR_TOKEN" `
     -Body $problemTest
```

**Expected Response:**
```json
{
  "output": "10",
  "runtime": 245,
  "memory": 12
}
```

---

## 🚨 **Troubleshooting Common Issues**

### **1. Docker Desktop Not Starting**
```powershell
# Restart Docker Desktop service
Restart-Service com.docker.service

# Or restart Docker Desktop completely
# Close Docker Desktop → Restart as Administrator
```

### **2. Images Failed to Build**
```powershell
# Clean Docker cache
docker system prune -f

# Rebuild with no cache
docker build --no-cache -f Dockerfile.api -t codearena/execution-api .
```

### **3. Containers Won't Start**
```powershell
# Check logs for errors
docker-compose logs worker
docker-compose logs api
docker-compose logs redis

# Common fix: Restart services
docker-compose down
docker-compose up -d
```

### **4. Port Already in Use**
```powershell
# Check what's using port 3001
netstat -ano | Select-String "3001"

# Kill process using port (replace PID)
taskkill /PID 1234 /F

# Or change ports in docker-compose.yml
```

### **5. Docker Socket Permission Issues**
- **Solution:** Ensure Docker Desktop is running as Administrator
- **Alternative:** Use Docker Desktop's built-in Linux VM (recommended)

### **6. Memory/CPU Issues**
- **Go to Docker Desktop Settings → Resources**
- **Increase Memory to 8GB minimum**
- **Increase CPU to 4 cores minimum**

---

## 🔧 **Docker Desktop UI Management**

### **Container Management**
1. **Containers Tab:**
   - View all running containers
   - Start/stop/restart containers
   - View logs and stats
   - Access container shell

2. **Images Tab:**
   - See all built images
   - Delete unused images
   - Pull new images

3. **Volumes Tab:**
   - Manage persistent data
   - Clean up unused volumes

### **Useful Commands in Container Terminal**
```bash
# From Docker Desktop, click CLI button on worker container

# Test Docker access
docker --version
docker ps

# Test Redis connection
redis-cli -h redis ping

# Check Node.js app
ps aux | grep node
```

---

## ✅ **Success Checklist**

- [ ] **Docker Desktop running** with adequate resources
- [ ] **All 7 images built** successfully
- [ ] **3 containers running** (redis, api, worker)
- [ ] **Health endpoints responding** (port 3001)
- [ ] **All 5 languages working** (Python, JS, C, C++, Java)
- [ ] **CodeArena integration** working (port 5000)
- [ ] **Problem compilation** successful
- [ ] **No errors in container logs**

---

## 🎉 **Final Verification**

### **Run This Complete Test**
```powershell
# Complete system test
Write-Host "🧪 Testing complete Docker setup..."

# Test 1: Docker Desktop status
docker info | Select-String "Server Version"

# Test 2: All containers running
docker ps --format "table {{.Names}}\t{{.Status}}"

# Test 3: Health checks
curl http://localhost:3001/health

# Test 4: Language execution
$testCode = @{
    code = "print('🎉 Docker setup successful!')"  
    language = "python"
} | ConvertTo-Json

$response = curl -X POST http://localhost:3001/api/execute `
                 -H "Content-Type: application/json" `
                 -Body $testCode

Write-Host "Response: $response"

Write-Host "✅ Docker Desktop setup complete!"
```

---

## 📱 **Quick Actions in Docker Desktop**

### **Daily Operations**
1. **Start System:** Docker Desktop → Containers → Click play on stopped containers
2. **Stop System:** Docker Desktop → Containers → Click stop on all containers  
3. **View Logs:** Click container name → Logs tab
4. **Monitor Resources:** Click container name → Stats tab
5. **Clean Up:** Images tab → Remove unused images

### **Emergency Commands**
```powershell
# Nuclear reset (if everything is broken)
docker-compose down
docker system prune -f
docker-compose up -d --build

# Quick restart
docker-compose restart

# Check everything
docker-compose ps && curl http://localhost:3001/health
```

---

**🚀 Your Docker Desktop setup is now complete and ready to handle problem compilation for thousands of users!**

The system will automatically:
- ✅ Compile C/C++/Java code
- ✅ Execute Python/JavaScript code  
- ✅ Handle concurrent requests
- ✅ Scale based on load
- ✅ Provide detailed execution results

**Next step:** Test with real problems from your CodeArena platform! 