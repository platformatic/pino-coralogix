import pino from 'pino';

// Using Pino's transport option to load the Coralogix transport
// This is useful when you want to configure the transport inline
const logger = pino({
  transport: {
    target: '../src/index.js',
    options: {
      domain: 'us1',
      apiKey: process.env.CORALOGIX_API_KEY || 'your-api-key',
      applicationName: 'my-application',
      subsystemName: 'my-service',
      // Optional settings
      batchSize: 100,
      flushInterval: 1000,
      timeout: 30000
    }
  }
});

// Now you can use the logger
logger.info('Application started with transport option');
logger.debug('Debug message');
logger.warn({ userId: 123 }, 'User action warning');
logger.error(new Error('Something went wrong'), 'Error occurred');

// Log with custom Coralogix fields
logger.info({
  category: 'api',
  className: 'UserController',
  methodName: 'createUser'
}, 'New user created');

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Shutting down gracefully');
  logger.flush();
  setTimeout(() => process.exit(0), 1000);
});

// Keep the process running for demo
setTimeout(() => {
  logger.info('Demo complete');
  process.exit(0);
}, 3000);
