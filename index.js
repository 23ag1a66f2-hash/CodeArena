const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    service: 'CodeArena Root Service',
    message: 'This is a multi-service application. Deploy individual services from their respective directories.',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint with service information
app.get('/', (req, res) => {
  res.json({
    name: 'CodeArena',
    description: 'Multi-service coding platform',
    services: [
      {
        name: 'codearena-server',
        description: 'API Backend',
        directory: 'server/',
        healthCheck: '/health',
        startCommand: 'npm start'
      },
      {
        name: 'codearena-client',
        description: 'React Frontend',
        directory: 'client/',
        healthCheck: '/',
        startCommand: 'npm run serve'
      },
      {
        name: 'codearena-execution',
        description: 'Code Execution System',
        directory: 'execution-system/',
        healthCheck: '/health',
        startCommand: 'node server.js'
      }
    ],
    timestamp: new Date().toISOString()
  });
});

// Service status endpoint
app.get('/status', (req, res) => {
  res.json({
    service: 'CodeArena Root Service',
    status: 'running',
    deployment: 'local',
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`CodeArena Root Service listening on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check available at /health`);
  console.log(`Service info available at /`);
});