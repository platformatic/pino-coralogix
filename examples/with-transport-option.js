import pino from 'pino';

// Using Pino's transport option to load the Coralogix transport
// This is useful when you want to configure the transport inline
const logger = pino({
  transport: {
    target: '../src/index.js',
    options: {
      domain: process.env.CORALOGIX_DOMAIN || 'us1', // or us2, eu1, eu2, ap1, ap2, ap3
      apiKey: process.env.CORALOGIX_API_KEY || 'your-api-key',
      applicationName: process.env.CORALOGIX_APP_NAME || 'my-application',
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

// No need to wait for flushing here, as Pino handles it internally
