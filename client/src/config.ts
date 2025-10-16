// Environment configuration with proper fallbacks
const getApiUrl = (): string => {
  // First try environment variable
  if (import.meta.env.VITE_API_URL) {
    // --- ADDED LOG ---
    console.log("✅ API URL loaded from .env file");
    return import.meta.env.VITE_API_URL;
  }
  
  // Fallback for browser environment
  if (typeof window !== 'undefined') {
    const apiPort = import.meta.env.VITE_API_PORT || '3001';
    // --- ADDED LOG ---
    console.warn("⚠️ API URL not found in .env, falling back to dynamic URL.");
    return `${window.location.protocol}//${window.location.hostname}:${apiPort}`;
  }
  
  // Default fallback for SSR or build time
  return 'http://localhost:3001';
};

const getFrontendUrl = (): string => {
  // First try environment variable
  if (import.meta.env.VITE_FRONTEND_URL) {
    // --- ADDED LOG ---
    console.log("✅ Frontend URL loaded from .env file");
    return import.meta.env.VITE_FRONTEND_URL;
  }
  
  // Fallback for browser environment
  if (typeof window !== 'undefined') {
    // --- ADDED LOG ---
    console.warn("⚠️ Frontend URL not found in .env, falling back to window.location.origin.");
    return window.location.origin;
  }
  
  // Default fallback
  return 'http://localhost:5000';
};

const getExecutionApiUrl = (): string => {
  // First try environment variable
  if (import.meta.env.VITE_EXECUTION_API_URL) {
    // --- ADDED LOG ---
    console.log("✅ Execution API URL loaded from .env file");
    return import.meta.env.VITE_EXECUTION_API_URL;
  }
  
  // Fallback for browser environment
  if (typeof window !== 'undefined') {
    // --- ADDED LOG ---
    console.warn("⚠️ Execution API URL not found in .env, falling back to dynamic URL.");
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  
  // Default fallback
  return 'http://localhost:3000';
};


// Main configuration object
export const config = {
  apiUrl: getApiUrl(),
  frontendUrl: getFrontendUrl(),
  executionApiUrl: getExecutionApiUrl(),
  env: import.meta.env.MODE || 'development',
  isDevelopment: import.meta.env.MODE === 'development',
  isProduction: import.meta.env.MODE === 'production',
  
  // Feature flags
  features: {
    contests: import.meta.env.VITE_ENABLE_CONTESTS !== 'false',
    courses: import.meta.env.VITE_ENABLE_COURSES !== 'false',
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS !== 'false',
  },
  
  // Debug settings
  debug: {
    enabled: import.meta.env.VITE_DEBUG_MODE === 'true',
    logLevel: import.meta.env.VITE_LOG_LEVEL || 'info',
  },
  
  // Google OAuth
  google: {
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  },
} as const;

// API endpoints
export const endpoints = {
  // Authentication
  register: `${config.apiUrl}/api/auth/register`,
  login: `${config.apiUrl}/api/auth/login`,
  logout: `${config.apiUrl}/api/auth/logout`,
  googleAuth: `${config.apiUrl}/api/auth/google`,
  user: `${config.apiUrl}/api/auth/user`,
  verifyEmail: `${config.apiUrl}/api/auth/verify-email`,
  resendVerification: `${config.apiUrl}/api/auth/resend-verification`,
  refreshToken: `${config.apiUrl}/api/auth/refresh`,
  
  // Core features
  problems: `${config.apiUrl}/api/problems`,
  submissions: `${config.apiUrl}/api/submissions`,
  contests: `${config.apiUrl}/api/contests`,
  courses: `${config.apiUrl}/api/courses`,
  
  // User features
  profile: `${config.apiUrl}/api/profile`,
  settings: `${config.apiUrl}/api/settings`,
  leaderboard: `${config.apiUrl}/api/leaderboard`,
  
  // Admin features
  admin: `${config.apiUrl}/api/admin`,
  analytics: `${config.apiUrl}/api/analytics`,
  
  // System
  health: `${config.apiUrl}/health`,
  
  // Execution system
  executeCode: `${config.executionApiUrl}/api/problems/run`,
  executionHealth: `${config.executionApiUrl}/health`,
} as const;

// API configuration
export const apiConfig = {
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '10000'),
  retries: parseInt(import.meta.env.VITE_API_RETRIES || '3'),
  retryDelay: parseInt(import.meta.env.VITE_API_RETRY_DELAY || '1000'),
} as const;

// Validation helper
export const validateConfig = () => {
  const errors: string[] = [];
  
  if (!config.apiUrl) {
    errors.push('API URL is not configured');
  }
  
  if (!config.frontendUrl) {
    errors.push('Frontend URL is not configured');
  }
  
  if (config.features.contests && !endpoints.contests) {
    errors.push('Contests feature is enabled but contests endpoint is not configured');
  }
  
  if (errors.length > 0) {
    console.error('Configuration errors:', errors);
    return false;
  }
  
  return true;
};

// This block is already set up to log your config!
if (config.debug.enabled) {
  console.log('🔧 Client Configuration Summary:', {
    apiUrl: config.apiUrl,
    frontendUrl: config.frontendUrl,
    executionApiUrl: config.executionApiUrl,
    environment: config.env,
    features: config.features,
    debug: config.debug,
  });
  
  // Validate configuration in development
  validateConfig();
}

// Export types for TypeScript
export type Config = typeof config;
export type Endpoints = typeof endpoints;
export type ApiConfig = typeof apiConfig;