# Environment Setup Guide

This guide will help you properly configure environment variables for the CodeArena project, removing all hardcoded values and ensuring secure deployment.

## 🔒 Security Notice

**CRITICAL**: The previous configuration contained exposed credentials that have been removed:
- MongoDB connection string with credentials
- SMTP credentials in plain text
- Hardcoded session secrets

**If you were using the old configuration, please:**
1. Change your MongoDB password immediately
2. Regenerate your SMTP app password
3. Update any deployed instances with new credentials

## 📁 Project Structure

CodeArena uses environment variables across three main services:
- **Server** (`server/`): Express.js API backend
- **Client** (`client/`): React frontend application  
- **Execution System** (`execution-system/`): Docker-based code execution

## 🚀 Quick Setup

### 1. Copy Environment Files

```bash
# Server environment
cp server/.env.example server/.env

# Client environment
cp client/.env.example client/.env

# Execution system environment
cp execution-system/.env.example execution-system/.env

# Global development environment (optional)
cp .env.development .env
```

### 2. Configure Each Service

Edit each `.env` file with your specific values:

#### Server Configuration (`server/.env`)

```bash
# Required - Database connection
MONGODB_URL=mongodb://localhost:27017/codearena
# For MongoDB Atlas:
# MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/codearena

# Required - Security
SESSION_SECRET=your-super-secret-session-key-at-least-32-characters-long

# Required - Basic configuration
PORT=3001
HOST=0.0.0.0
FRONTEND_URL=http://localhost:5000

# Optional - Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Optional - Email notifications
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
```

#### Client Configuration (`client/.env`)

```bash
# API connection
VITE_API_URL=http://localhost:3001
VITE_FRONTEND_URL=http://localhost:5000

# Optional - Google OAuth (must match server)
VITE_GOOGLE_CLIENT_ID=your-google-client-id

# Optional - Feature flags
VITE_ENABLE_CONTESTS=true
VITE_ENABLE_COURSES=true
```

#### Execution System (`execution-system/.env`)

```bash
# Basic configuration
PORT=3000
MAIN_API_URL=http://localhost:3001

# File system
TEMP_DIR=./temp

# Performance
EXECUTION_TIMEOUT=5000
MEMORY_LIMIT=128m
CPU_LIMIT=0.5
```

## 🔧 Development Setup

### Option 1: Individual Service Configuration (Recommended)

Configure each service individually using the steps above. This provides the most flexibility.

### Option 2: Global Environment File

Use the global `.env.development` template:

```bash
cp .env.development .env
# Edit .env with your values
```

This sets defaults that individual services will inherit.

### 3. Generate Secure Secrets

```bash
# Generate a secure session secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate a JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Set Up Local Database

#### MongoDB Local Installation
```bash
# Install MongoDB locally
# Ubuntu/Debian:
sudo apt-get install mongodb

# macOS:
brew install mongodb-community

# Windows: Download from MongoDB website
```

#### Or use MongoDB Atlas (Cloud)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get connection string
4. Replace `MONGODB_URL` in `server/.env`

### 5. Install Dependencies

```bash
# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install

# Install execution system dependencies
cd ../execution-system && npm install
```

## 🌐 Production Deployment

### Environment Variables for Production

Never commit production values to version control. Instead, set them in your deployment platform:

#### Required Production Variables

```bash
# Server
NODE_ENV=production
PORT=3001
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/codearena
SESSION_SECRET=your-production-session-secret-64-chars-minimum
JWT_SECRET=your-production-jwt-secret
FRONTEND_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com

# Client
VITE_API_URL=https://api.yourdomain.com
VITE_FRONTEND_URL=https://yourdomain.com

# Execution System
MAIN_API_URL=https://api.yourdomain.com
EXECUTION_PORT=3000
TEMP_DIR=/tmp/codearena
```

#### Platform-Specific Instructions

**Vercel (Client)**
```bash
# Set in Vercel dashboard or CLI
vercel env add VITE_API_URL
vercel env add VITE_FRONTEND_URL
```

**Railway (Server)**
```bash
# Set in Railway dashboard or CLI
railway variables set MONGODB_URL=your-atlas-url
railway variables set SESSION_SECRET=your-secret
```

**Docker (Execution System)**
```bash
# Use environment variables in docker-compose.yml
version: '3.8'
services:
  execution-api:
    environment:
      - MAIN_API_URL=${MAIN_API_URL}
      - EXECUTION_PORT=${EXECUTION_PORT}
```

## 🔍 Validation & Testing

### 1. Check Configuration

```bash
# Test server configuration
cd server && npm run dev
# Should show: "✅ MongoDB connected successfully"

# Test client configuration
cd client && npm run dev
# Should connect to API without errors

# Test execution system
cd execution-system && node simple-api.js
# Should show: "🚀 CodeArena Execution System"
```

### 2. Health Checks

Visit these URLs to verify each service:

- Server: `http://localhost:3001/health`
- Client: `http://localhost:5000`
- Execution: `http://localhost:3000/health`

### 3. Integration Test

1. Start all services
2. Create an account on the frontend
3. Try running code execution
4. Check logs for any configuration errors

## 🐛 Troubleshooting

### Common Issues

**"MONGODB_URL environment variable is required"**
- Ensure `MONGODB_URL` is set in `server/.env`
- Check that `.env` file is in the correct location
- Verify MongoDB is running (local) or connection string is correct (Atlas)

**"CORS Error" when client tries to connect to API**
- Check `FRONTEND_URL` in `server/.env` matches client URL
- Verify `VITE_API_URL` in `client/.env` points to server
- Ensure both services are running

**"Session secret should be at least 32 characters long"**
- Generate a longer session secret using crypto
- Update `SESSION_SECRET` in `server/.env`

**Execution system can't reach main API**
- Check `MAIN_API_URL` in `execution-system/.env`
- Ensure server is running on the specified port
- Verify network connectivity between services

### Environment Variables Not Loading

```bash
# Check if .env file exists
ls -la server/.env client/.env execution-system/.env

# Verify .env file format (no spaces around =)
cat server/.env | grep -E '^[A-Z_]+=.+$'

# Test environment loading
node -e "require('dotenv').config(); console.log(process.env.MONGODB_URL)"
```

### Service-Specific Debugging

**Server Debug Mode**
```bash
# Enable debug logging
echo "DEBUG_MODE=true" >> server/.env
echo "LOG_LEVEL=debug" >> server/.env
```

**Client Debug Mode**
```bash
# Enable client debugging
echo "VITE_DEBUG_MODE=true" >> client/.env
echo "VITE_LOG_LEVEL=debug" >> client/.env
```

**Execution System Debug Mode**
```bash
# Enable execution debugging
echo "DEBUG_MODE=true" >> execution-system/.env
echo "VERBOSE_LOGGING=true" >> execution-system/.env
```

## 📋 Environment Variables Reference

### Server Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | development | Environment mode |
| `PORT` | No | 3001 | Server port |
| `HOST` | No | 0.0.0.0 | Server host |
| `MONGODB_URL` | **Yes** | - | Database connection |
| `SESSION_SECRET` | **Yes** | - | Session encryption key |
| `FRONTEND_URL` | No | http://localhost:5000 | Client URL for CORS |
| `CORS_ORIGIN` | No | FRONTEND_URL | Allowed CORS origins |
| `GOOGLE_CLIENT_ID` | No | - | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | - | OAuth client secret |
| `SMTP_USER` | No | - | Email service user |
| `SMTP_PASS` | No | - | Email service password |

### Client Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | Auto-detected | API server URL |
| `VITE_FRONTEND_URL` | No | Auto-detected | Frontend URL |
| `VITE_DEBUG_MODE` | No | false | Debug logging |
| `VITE_GOOGLE_CLIENT_ID` | No | - | OAuth client ID |
| `VITE_ENABLE_CONTESTS` | No | true | Contest feature |
| `VITE_ENABLE_COURSES` | No | true | Courses feature |

### Execution System Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | Execution API port |
| `MAIN_API_URL` | No | http://localhost:3001 | Main API URL |
| `TEMP_DIR` | No | ./temp | Temporary files |
| `EXECUTION_TIMEOUT` | No | 5000 | Max execution time (ms) |
| `MEMORY_LIMIT` | No | 128m | Docker memory limit |
| `CPU_LIMIT` | No | 0.5 | Docker CPU limit |
| `DEBUG_MODE` | No | false | Debug logging |

## 📚 Additional Resources

- [MongoDB Atlas Setup](https://docs.atlas.mongodb.com/getting-started/)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [Gmail SMTP Setup](https://support.google.com/mail/answer/7126229)
- [Docker Installation](https://docs.docker.com/get-docker/)
- [Node.js Environment Variables](https://nodejs.org/en/learn/command-line/how-to-read-environment-variables-from-nodejs)

---

**Need Help?** If you encounter issues not covered in this guide, please check the project's GitHub Issues or create a new issue with your specific problem and environment details.