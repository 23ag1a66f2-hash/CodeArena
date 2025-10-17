# CodeArena - Competitive Programming Platform

## Overview

CodeArena is a comprehensive competitive programming platform built with a modern full-stack architecture. The application provides a complete coding education and competition environment with features for students, instructors, and administrators. It supports problem solving, contests, courses, assignments, and real-time code execution across multiple programming languages.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: Zustand for global state, React Query for server state
- **Routing**: Wouter for lightweight client-side routing
- **Code Editor**: Monaco Editor for in-browser code editing
- **Theme Support**: Dark/light mode with theme provider

### Backend Architecture
- **Runtime**: Node.js 20 with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: MongoDB Atlas with native MongoDB driver
- **Authentication**: Multiple strategies including JWT tokens, Google OAuth, and Replit OIDC
- **Session Management**: Express sessions with MongoDB store
- **Code Execution**: Secure sandboxed execution using child processes

### Data Storage
- **Primary Database**: MongoDB Atlas cluster
- **Schema Validation**: Zod schemas for runtime validation
- **Collections**: Users, problems, submissions, courses, assignments, contests, and more
- **Session Store**: MongoDB-based session storage for authentication

## Key Components

### Authentication System
- **Multi-provider Support**: Email/password, Google OAuth, and Replit OIDC
- **Role-based Access**: Student and admin roles with middleware protection
- **Token Management**: JWT tokens with secure cookie storage
- **Session Persistence**: MongoDB-backed sessions for reliability

### Problem Management
- **CRUD Operations**: Complete problem lifecycle management
- **Multiple Languages**: Support for Python, JavaScript, C++, Java
- **Test Cases**: Hidden and visible test cases with custom validation
- **Code Templates**: Language-specific starter code
- **Difficulty Levels**: Easy, medium, hard categorization

### Code Execution Engine
- **Sandboxed Execution**: Secure isolated code execution
- **Multiple Languages**: Python, JavaScript, C++, Java support
- **Resource Limits**: Time and memory constraints
- **Real-time Results**: Immediate feedback on code submissions

### Course System
- **Modular Content**: Text, video, and interactive code modules
- **Progress Tracking**: Student enrollment and completion tracking
- **Assignment Integration**: Course-linked assignments and assessments
- **Admin Management**: Full CRUD operations for course content

### Contest Platform
- **Live Competitions**: Real-time contest participation
- **Leaderboards**: Dynamic ranking and scoring
- **Time Management**: Contest scheduling and duration controls
- **Problem Sets**: Curated problem collections for contests

## Data Flow

### Authentication Flow
1. User initiates login via email/password or OAuth provider
2. Server validates credentials and generates JWT token
3. Token stored in secure HTTP-only cookie
4. Subsequent requests authenticated via middleware
5. Role-based route protection enforced

### Problem Solving Flow
1. User selects problem from catalog
2. Monaco editor loads with starter code
3. Code submitted to execution engine
4. Sandboxed execution with test case validation
5. Results returned with performance metrics
6. Submission stored in database with status

### Course Progression Flow
1. Student enrolls in course
2. Progress tracked through module completion
3. Interactive code exercises validated
4. Completion status updated in real-time
5. Certificates generated upon course completion

## External Dependencies

### Core Technologies
- **React Ecosystem**: React, React DOM, React Query for frontend
- **Node.js Stack**: Express, TypeScript, various middleware
- **MongoDB**: Native driver with connection pooling
- **Authentication**: Passport.js with multiple strategies

### UI Components
- **Radix UI**: Accessible component primitives
- **shadcn/ui**: Pre-built component library
- **Lucide React**: Icon library
- **Monaco Editor**: Code editor component

### Development Tools
- **Build Tools**: Vite, esbuild for production builds
- **Type Safety**: TypeScript throughout the stack
- **Validation**: Zod for runtime schema validation
- **Testing**: Basic setup for unit and integration tests

## Deployment Strategy

### Replit Platform
- **Primary Target**: Optimized for Replit deployment
- **Configuration**: .replit file with Node.js 20 environment
- **Build Process**: npm run build for production assets
- **Port Configuration**: Default port 5000 with proxy setup

### Environment Configuration
- **Development**: Hot reload with Vite dev server
- **Production**: Compiled assets served by Express
- **Environment Variables**: Comprehensive .env configuration
- **Database**: MongoDB Atlas connection with fallback options

### Scaling Considerations
- **Connection Pooling**: MongoDB connection management
- **Session Storage**: Scalable session persistence
- **Asset Optimization**: Vite build optimization
- **Caching Strategy**: Query caching with React Query

## Changelog

```
Changelog:
- July 29, 2025. CRITICAL BUG FIX: Fixed progress calculation overflow issue - progress now capped at 100%
  - Fixed Math.min(100, percentage) in both storage.ts and routes.ts to prevent progress from exceeding 100%
  - Removed duplicate route endpoints that were causing calculation inconsistencies
  - Fixed parameter order in markModuleComplete method calls between routes and storage
  - Enhanced progress calculation to use unique completed module IDs preventing duplicates
  - Verified individual user progress tracking maintains proper isolation between users
  - System now correctly calculates progress as (completed modules / total course modules) * 100 capped at 100%
- July 29, 2025. CRITICAL BUG FIX: Resolved "Mark as Complete" cross-user contamination issue
  - Fixed duplicate completion routes causing conflicting behavior
  - Implemented proper user-specific database filtering in markModuleComplete method
  - Added comprehensive debugging and user isolation verification
  - Ensured all progress tracking operations filter by userId, moduleId, and courseId
  - Verified with multi-user testing that completion status is now properly isolated per user
  - System now correctly tracks individual user progress without affecting other enrolled users
- July 4, 2025. Optimized enrollment verification system for maximum efficiency
  - Replaced inefficient "search all problem sets" approach with targeted problem set enrollment checks
  - Modified frontend to pass problemSetId context when navigating from problem sets to individual problems
  - Updated backend to perform direct enrollment verification for specific problem sets only
  - Reduced database queries from O(n) problem sets to O(1) single enrollment check
  - Enhanced debugging with clear enrollment verification logs showing problem set context
  - System now efficiently verifies enrollment only for the relevant problem set
- July 4, 2025. Fixed critical enrollment access and checkbox interaction bugs
  - Resolved "Unknown User" enrollment issue by fixing user ID handling in database operations
  - Updated getAllUsers() to return proper id fields from MongoDB _id for frontend compatibility
  - Fixed enrollment verification to use ObjectId matching instead of string comparison
  - Replaced problematic HTML checkboxes with custom div-based components to prevent CSS conflicts
  - Added comprehensive debugging for enrollment verification process
  - Ensured admin-enrolled students can now properly access problem sets and submit solutions
- July 4, 2025. Implemented enrollment-based access control for problem sets
  - Added mandatory enrollment validation for problem set access and submissions
  - Only enrolled students can view problem sets and submit solutions to problems within them
  - Admin users bypass enrollment checks for management purposes
  - Added comprehensive error handling with enrollment prompts for unauthorized access
  - Updated frontend to display proper access denied messages with enrollment options
  - Enhanced security by preventing non-enrolled users from testing or submitting code
- July 4, 2025. Added comprehensive evaluation system for problem set administrators
  - Implemented "Evaluations" button next to delete button on each problem instance
  - Created detailed modal showing student completion statistics with search and filters
  - Added backend API to fetch enrollment data and submission analytics
  - Built summary cards showing completed vs not completed students with completion rates
  - Included real-time filtering by completion status and student search functionality
- July 4, 2025. Fixed admin problems CRUD operations and enhanced code execution
  - Implemented missing updateProblem and deleteProblem methods in storage layer
  - Fixed edit and delete functionality in admin problems interface
  - Enhanced null safety checks and error handling in form processing
  - Improved starterCode field validation with proper defaults
  - Fixed Python execution to use python3 instead of python
  - Installed and configured Java support for code execution
  - Enhanced error handling and debugging for all programming languages
  - Added proper class name extraction for Java compilation
- July 4, 2025. Fixed layout issues and improved user experience
  - Restructured routing to move problem detail and course module viewer outside Layout wrapper for full-screen experience
  - Removed leftover sidebar space in both problem solving and course sections
  - Fixed Monaco Editor import errors by removing react-error-boundary dependency
  - Added simple error handling to Monaco Editor component without external dependencies
  - Hidden "Customized" tags from user interface (now only visible in admin interface)
  - Added fullscreen functionality to code editors in both problem and course sections
- June 30, 2025. Implemented isolated problem CRUD operations system
  - Added problem instance schema for set-specific customizations
  - Created comprehensive admin interface for managing problem instances
  - Enabled modifications to problems within specific sets without affecting other sets
  - Added problem-specific overrides for title, description, difficulty, constraints, etc.
- June 14, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```