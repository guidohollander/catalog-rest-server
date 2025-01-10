import winston from 'winston';
import { format } from 'winston';
import path from 'path';
import fs from 'fs';
const { combine, timestamp, printf, colorize } = format;

// Custom format to obfuscate sensitive data
const obfuscateSensitiveData = format((info: winston.Logform.TransformableInfo) => {
  const sensitiveFields = ['password', 'username', 'email', 'token'];
  const masked = { ...info };

  // Function to recursively mask sensitive data in objects
  const maskSensitiveData = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const maskedObj = Array.isArray(obj) ? [...obj] : { ...obj };
    
    for (const key in maskedObj) {
      if (typeof maskedObj[key] === 'object') {
        maskedObj[key] = maskSensitiveData(maskedObj[key]);
      } else if (
        sensitiveFields.some(field => 
          key.toLowerCase().includes(field.toLowerCase())
        ) && 
        typeof maskedObj[key] === 'string'
      ) {
        maskedObj[key] = '***REDACTED***';
      }
    }
    return maskedObj;
  };

  // Mask message if it's a string containing sensitive data
  if (typeof masked.message === 'string') {
    sensitiveFields.forEach(field => {
      const regex = new RegExp(`(${field}=)[^&\\s]+`, 'gi');
      masked.message = (masked.message as string).replace(regex, `$1***REDACTED***`);
    });
  }

  // Mask objects in the log
  else if (typeof masked.message === 'object' && masked.message !== null) {
    masked.message = maskSensitiveData(masked.message);
  }

  return masked;
})();

// Custom log format with brackets
const logFormat = printf(({ level, message, timestamp }) => {
  // Ensure message is a string and add brackets to level
  const formattedMessage = typeof message === 'object' ? JSON.stringify(message) : message;
  return `${timestamp} [${level}]: ${formattedMessage}`;
});

// Override console.log to use Winston
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleDebug = console.debug;

// Create the logger instance
const logger = winston.createLogger({
  level: 'debug',
  format: combine(
    timestamp(),
    obfuscateSensitiveData,
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        timestamp(),
        obfuscateSensitiveData,
        logFormat
      )
    })
  ]
});

// Override console methods to use Winston
console.log = (...args) => {
  logger.info(args.length === 1 ? args[0] : args);
};

console.error = (...args) => {
  logger.error(args.length === 1 ? args[0] : args);
};

console.warn = (...args) => {
  logger.warn(args.length === 1 ? args[0] : args);
};

console.debug = (...args) => {
  logger.debug(args.length === 1 ? args[0] : args);
};

// Add file transports if in production
if (process.env.NODE_ENV === 'production') {
  try {
    // Match the path with docker-compose volume mount
    const LOG_DIR = path.join(process.cwd(), '.next', 'standalone', 'logs');
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    // Add file transports
    logger.add(new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      format: combine(
        timestamp(),
        obfuscateSensitiveData,
        logFormat
      )
    }));

    logger.add(new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      format: combine(
        timestamp(),
        obfuscateSensitiveData,
        logFormat
      )
    }));

    logger.info('File logging initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize file logging:', error);
  }
}

// Ensure logs are written immediately
logger.on('finish', () => {
  process.stdout.write('');
});

// Export both the logger and original console methods
export { 
  logger,
  originalConsoleLog as consoleLog,
  originalConsoleError as consoleError,
  originalConsoleWarn as consoleWarn,
  originalConsoleDebug as consoleDebug
};
