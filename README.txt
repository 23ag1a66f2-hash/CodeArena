# CodeArena 🚀# 

A comprehensive online coding platform for competitive programming, educational courses, and assignment management.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue.svg)](https://www.typescriptlang.org/)

## 🌟 Features

- **🏆 Competitive Programming**: Host coding contests with real-time leaderboards
- **📚 Educational Courses**: Structured learning with modules and progress tracking
- **💻 Multi-language Support**: Python, JavaScript, Java, C++, C
- **🔒 Secure Code Execution**: Docker-based isolated execution environment
- **📊 Analytics Dashboard**: Comprehensive performance tracking and insights
- **👥 User Management**: Role-based access control and user profiles
- **📝 Assignment System**: Create, manage, and grade programming assignments
- **📱 Responsive Design**: Modern UI that works on all devices

## 🏗️ Architecture

CodeArena follows a modern, scalable architecture:

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + MongoDB
- **Execution**: Docker containers with Redis job queues
- **Authentication**: Passport.js with JWT and OAuth2.0
- **Build System**: Vite for frontend, ESBuild for backend

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker Desktop
- Git

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd CodeArena

# Install dependencies
cd server && npm install
cd ../client && npm install
cd ../execution-system && npm install

# Set up environment variables
cp server/.env.example server/.env
# Edit server/.env with your configuration

# Start development environment
cd ../execution-system
docker-compose up -d

# Start the server (Terminal 1)
cd ../server
npm run dev

# Start the client (Terminal 2)
cd ../client
npm run dev
```

Visit [http://localhost:5000](http://localhost:5000) to access the application.

📖 **For detailed setup instructions, see [QUICK_START.md](./QUICK_START.md)**

## 📁 Project Structure

```
CodeArena/
├── 📱 client/                 # React frontend application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/            # Page components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # Utilities and configurations
│   │   └── types/            # TypeScript type definitions
│   └── package.json
├── 🖥️ server/                 # Express.js backend API
│   ├── controllers/           # Route handlers and business logic
│   ├── models/               # MongoDB schemas and models
│   ├── routes/               # API endpoint definitions
│   ├── middleware/           # Express middleware
│   ├── services/             # Business logic services
│   └── package.json
├── 🐳 execution-system/       # Docker-based code execution
│   ├── docker/               # Language-specific containers
│   ├── queue/                # Redis job queue system
│   └── docker-compose.yml    # Service orchestration
├── 📚 Documentations/         # Project documentation
├── 🔧 scripts/               # Utility and setup scripts
└── 📋 shared/                # Shared schemas and types
```

## 🛠️ Technology Stack

### Frontend
- **React 18.3.1** - Modern React with concurrent features
- **TypeScript 5.6.3** - Type-safe JavaScript development
- **Vite 5.4.14** - Fast build tool and dev server
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Monaco Editor** - VS Code's code editor component
- **Zustand 5.0.5** - Lightweight state management
- **TanStack Query 5.60.5** - Server state management

### Backend
- **Node.js** - JavaScript runtime
- **Express.js 4.21.2** - Web application framework
- **MongoDB 7.0.0** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **Passport.js** - Authentication middleware
- **JWT** - JSON Web Token authentication
- **Redis** - Caching and job queues

### Infrastructure
- **Docker** - Containerization platform
- **Docker Compose** - Multi-container orchestration
- **Bull 4.12.0** - Job queue management
- **Nodemailer** - Email service integration

## 📖 Documentation

- **[SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)** - Comprehensive system architecture and design
- **[TECH_TASKS.md](./TECH_TASKS.md)** - Detailed technical implementation roadmap
- **[QUICK_START.md](./QUICK_START.md)** - Developer quick start guide
- **[Documentations/](./Documentations/)** - Additional technical documentation

## 🔑 Key Features

### 1. User Management
- User registration and authentication
- Role-based access control (Admin/User)
- Google OAuth2.0 integration
- Profile management and preferences

### 2. Course System
- Hierarchical course structure with modules
- Student enrollment and progress tracking
- Rich content management (text, images, files)
- Course analytics and completion metrics

### 3. Problem Management
- Programming problem creation and management
- Test case management with real inputs
- Difficulty levels and tagging system
- Problem discovery and recommendations

### 4. Assignment System
- Problem set creation and assignment
- Submission management and grading
- Deadline handling and notifications
- Performance analytics and insights

### 5. Contest System
- Competitive programming contests
- Real-time leaderboards and rankings
- Contest scheduling and participation
- Results calculation and analytics

### 6. Code Execution
- Multi-language support (Python, JS, Java, C++, C)
- Secure Docker container isolation
- Resource limiting and monitoring
- Automated test case execution

## 🚀 Getting Started

### For Developers

1. **Read the Documentation**: Start with [QUICK_START.md](./QUICK_START.md)
2. **Set Up Environment**: Follow the installation steps above
3. **Explore the Codebase**: Understand the project structure
4. **Pick a Feature**: Choose from the [technical tasks](./TECH_TASKS.md)

### For Contributors

1. **Fork the Repository**: Create your own fork
2. **Create a Branch**: Make changes in feature branches
3. **Follow Guidelines**: Use conventional commits and PR templates
4. **Test Thoroughly**: Ensure all tests pass before submitting

### For Users

1. **Access the Platform**: Visit the deployed application
2. **Create an Account**: Register with email or Google
3. **Explore Courses**: Browse available programming courses
4. **Solve Problems**: Practice with coding challenges
5. **Join Contests**: Participate in competitive programming

## 🔧 Development

### Running Tests

```bash
# Frontend tests
cd client
npm test

# Backend tests
cd server
npm test

# Integration tests
cd execution-system
npm test
```

### Building for Production

```bash
# Build frontend
cd client
npm run build

# Build backend
cd server
npm run build

# Start production server
npm start
```

### Code Quality

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Husky**: Git hooks for quality checks

## 📊 Performance

- **Frontend**: Optimized bundle with code splitting
- **Backend**: Efficient database queries with indexing
- **Execution**: Containerized code execution with resource limits
- **Caching**: Redis-based caching for improved response times

## 🔒 Security

- **Authentication**: JWT-based secure authentication
- **Authorization**: Role-based access control
- **Code Execution**: Isolated Docker containers
- **Input Validation**: Zod schema validation
- **Rate Limiting**: API abuse prevention
- **CORS**: Cross-origin security

## 🌐 Deployment

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment mode | Yes |
| `PORT` | Server port | Yes |
| `MONGODB_URI` | Database connection | Yes |
| `SESSION_SECRET` | Session encryption | Yes |
| `GOOGLE_CLIENT_ID` | OAuth client ID | No |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret | No |

### Production Deployment

```bash
# Build the application
npm run build

# Start production server
npm start

# Use PM2 for process management
pm2 start ecosystem.config.js
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](./CONTRIBUTING.md) for details.

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Test** thoroughly
5. **Submit** a pull request

### Code Standards

- Follow TypeScript best practices
- Use conventional commit messages
- Write comprehensive tests
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- **React Team** - For the amazing frontend framework
- **Express.js Team** - For the robust backend framework
- **MongoDB Team** - For the flexible database solution
- **Docker Team** - For the containerization platform
- **Open Source Community** - For all the amazing libraries and tools

## 📞 Support

- **Documentation**: Check the [Documentations/](./Documentations/) folder
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Discussions**: Join community discussions on GitHub Discussions
- **Email**: Contact the development team directly

---

**Made with ❤️ by the CodeArena Team**

*Empowering developers to learn, compete, and grow through coding challenges and education.* 