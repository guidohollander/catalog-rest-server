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

// Get the log directory path
const LOG_DIR = path.join(process.cwd(), 'logs');

// Ensure log directory exists
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch (error) {
  console.error('Failed to create logs directory:', error);
}

// Create the logger instance
const logger = winston.createLogger({
  format: combine(
    timestamp(),
    obfuscateSensitiveData,
    colorize(),
    logFormat
  ),
  transports: [
    // Console transport for development
    new winston.transports.Console({
      level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    })
  ],
});

// Only add file transports if we can write to the logs directory
try {
  fs.accessSync(LOG_DIR, fs.constants.W_OK);
  
  // File transport for errors
  logger.add(new winston.transports.File({
    filename: path.join(LOG_DIR, 'error.log'),
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }));

  // File transport for all logs
  logger.add(new winston.transports.File({
    filename: path.join(LOG_DIR, 'combined.log'),
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }));
} catch (error) {
  console.warn('Cannot write to logs directory. File logging disabled:', error);
}

export default logger;
