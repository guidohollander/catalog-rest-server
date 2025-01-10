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

// Custom log format
const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${
    typeof message === 'object' ? JSON.stringify(message, null, 2) : message
  }`;
});

// Get the log directory path - ensure it works in both development and Docker
const LOG_DIR = process.env.NODE_ENV === 'production' 
  ? '/app/logs'  // Docker container path
  : path.join(process.cwd(), 'logs');  // Development path

// Create the logger instance first with console transport
const logger = winston.createLogger({
  format: combine(
    timestamp(),
    obfuscateSensitiveData,
    colorize(),
    logFormat
  ),
  transports: [
    // Console transport for all environments
    new winston.transports.Console({
      level: process.env.LOG_LEVEL || 'info', // Default to info for all environments
    })
  ],
});

// Try to set up file logging if possible
try {
  // Create logs directory if it doesn't exist
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  // Add file transports
  logger.add(new winston.transports.File({
    filename: path.join(LOG_DIR, 'error.log'),
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }));

  logger.add(new winston.transports.File({
    filename: path.join(LOG_DIR, 'combined.log'),
    level: process.env.LOG_LEVEL || 'info',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }));

  logger.info('File logging initialized successfully');
} catch (error) {
  logger.warn('Failed to initialize file logging:', error);
  logger.warn('Continuing with console logging only');
}

export { logger };
