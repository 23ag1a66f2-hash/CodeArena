const winston = require('winston');
const config = require('./config');

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
  })
);

// JSON format for file output
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports array
const transports = [
  new winston.transports.Console({
    format: config.logging.format === 'json' ? jsonFormat : consoleFormat,
    level: config.logging.level
  })
];

// Add file transport if configured
if (config.logging.file) {
  transports.push(
    new winston.transports.File({
      filename: config.logging.file,
      format: jsonFormat,
      level: config.logging.level,
      maxsize: config.logging.maxSize,
      maxFiles: config.logging.maxFiles,
      tailable: true
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: jsonFormat,
  transports,
  exitOnError: false,
  silent: process.env.NODE_ENV === 'test'
});

// Add request ID to logs
logger.addRequestId = (requestId) => {
  return logger.child({ requestId });
};

module.exports = logger; 