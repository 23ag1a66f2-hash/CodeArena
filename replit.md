# CodeArena - Competitive Programming Platform

## Overview

CodeArena is a comprehensive online coding platform designed for competitive programming, educational courses, and assignment management. The platform supports multiple programming languages (Python, JavaScript, Java, C++, C) with secure Docker-based code execution, real-time analytics, and a modern full-stack architecture. It serves students, educators, and administrators with features for contests, problem sets, courses, and detailed performance tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18.3.1 with TypeScript for type-safe development
- Vite 5.4.14 as the build tool for fast development and optimized production builds
- Tailwind CSS 3.4.17 with shadcn/ui component library for consistent UI design
- Zustand 5.0.5 for lightweight global state management
- TanStack React Query 5.60.5 for server state management and data fetching
- Wouter 3.3.5 for client-side routing
- Monaco Editor for in-browser code editing with VS Code experience

**Design Decisions:**
- Chosen Vite over Create React App for superior build performance and modern ES module support
- Selected Zustand over Redux for simpler state management without boilerplate
- Implemented React Query to handle server state separately from client state, enabling automatic refetching and cache management
- Used Wouter instead of React Router for smaller bundle size while maintaining routing capabilities

### Backend Architecture

**Technology Stack:**
- Node.js 20+ with Express.js 4.21.2 framework
- TypeScript with ES modules for type safety and modern JavaScript features
- MongoDB Atlas as the primary database with native MongoDB driver
- Mongoose 7.0.0 for schema validation and object modeling
- Passport.js for authentication with multiple strategies (JWT, Google OAuth, Replit OIDC)
- Express sessions with MongoDB-backed session store
- ESBuild for fast TypeScript compilation

**Design Decisions:**
- Separated authentication strategies to support multiple login methods (email/password, Google OAuth, Replit OIDC)
- Implemented role-based access control (student, admin) with middleware protection
- Used Express-validator and Zod schemas for dual-layer validation (runtime and compile-time)
- Structured routes by feature (problems, submissions, courses, contests) for maintainability

### Code Execution System

**Architecture:**
- Distributed execution system using Docker containers for isolation
- Redis-based job queue (Bull.js) for asynchronous code execution
- Language-specific Docker images optimized for security and minimal size (<3MB)
- Support for Python, JavaScript, Java, C++, and C

**Design Decisions:**
- Isolated code execution in disposable Docker containers prevents security vulnerabilities
- Queue-based architecture enables horizontal scaling for handling 10,000+ concurrent users
- Implements automatic fallback from queue execution to direct execution for reliability
- Resource limits (time, memory) enforced at container level for fair resource allocation

### Data Storage

**Primary Database: MongoDB Atlas**
- Collections: users, problems, submissions, courses, coursemodules, assignments, contests, problemsets, enrollments
- Indexes on frequently queried fields (userId, problemId, courseId) for performance
- MongoDB sessions collection for Express session persistence

**Schema Design:**
- Users: email, role, authentication data, profile information, email verification status
- Problems: title, description, difficulty, test cases, starter code per language, constraints
- Submissions: code, language, status, runtime metrics, test results
- Courses: modules, enrollments, progress tracking
- Contests: problems, leaderboard, time constraints
- Analytics: performance metrics, learning outcomes, engagement data

**Design Decisions:**
- Chose MongoDB for flexibility in schema evolution as features expand
- Embedded test cases within problems for atomic reads/writes
- Separate enrollment collections track student progress and enrollment type (admin vs. QR/link)
- Implemented version history for assignments to track changes over time

### Authentication & Security

**Authentication Strategies:**
- Local strategy with bcrypt password hashing
- Google OAuth2.0 for social login
- Replit OIDC for Replit environment integration
- JWT tokens with secure cookie storage for stateless authentication
- Session persistence in MongoDB for reliability

**Security Measures:**
- Email verification with OTP (6-digit codes, 10-minute expiration, 3 attempt limit)
- Rate limiting on API endpoints (100 requests per 15 minutes)
- Password strength validation and secure reset flow
- Role-based middleware prevents unauthorized access to admin routes
- Docker isolation prevents code execution vulnerabilities

## External Dependencies

### Third-Party Services

**Google Services:**
- Gmail API for transactional emails (OTP verification, password reset, notifications)
- Google OAuth2.0 for authentication
- Configuration requires: Client ID, Client Secret, Refresh Token

**Docker & Container Services:**
- Docker Desktop for local development
- Docker containers for code execution (python:3.11-alpine, node:18-alpine, gcc, openjdk:11)
- Docker socket mounting or Docker-in-Docker for container spawning

**Cloud Infrastructure:**
- MongoDB Atlas for database hosting
- Redis for job queue management
- Deployment platforms: Vercel (frontend), Railway/Render (backend services)

### APIs & Integrations

**Internal APIs:**
- REST API at `/api/*` for all client-server communication
- WebSocket support for real-time features (leaderboards, contest updates)
- Proxy configuration routes `/api` requests to backend server

**External APIs:**
- Gmail API for email delivery
- Google OAuth API for authentication
- MongoDB Atlas API for database operations

### Development Tools

**Build & Development:**
- Vite for frontend development server and production builds
- ESBuild for backend TypeScript compilation
- Docker Compose for local multi-service orchestration

**Testing & Quality:**
- Jest for unit testing (execution system)
- Supertest for API testing
- TypeScript compiler for type checking

**Deployment:**
- Vercel for frontend static hosting
- Railway/Render for backend API and execution system
- Docker images hosted in container registry for execution workers

### Environment Variables Required

**Backend:**
- `MONGODB_URL`: MongoDB Atlas connection string
- `SESSION_SECRET`: Express session encryption key
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: OAuth credentials
- `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`: Gmail API credentials
- `EXECUTION_MODE`: 'queue' or 'direct' for code execution strategy
- `REDIS_URL`: Redis connection for job queue (when using queue mode)

**Frontend:**
- `VITE_API_URL`: Backend API base URL for proxy configuration