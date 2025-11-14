import pino from 'pino';
import { build } from '../src/index.js';

async function main() {
  // Create the Coralogix transport
  const transport = await build({
    domain: 'us1', // or us2, eu1, eu2, ap1, ap2, ap3
    apiKey: process.env.CORALOGIX_API_KEY || 'your-api-key',
    applicationName: 'my-application',
    subsystemName: 'my-service',
    // Optional settings
    batchSize: 100,          // Number of logs before flushing
    flushInterval: 1000,     // Flush every 1 second
    timeout: 30000          // Request timeout in milliseconds
  });

  // Create a Pino logger with the transport
  const logger = pino(transport);

  // Log some messages
  logger.info('Application started');
  logger.debug('This is a debug message');
  logger.warn('This is a warning');
  logger.error('This is an error');

  // Log with custom fields
  logger.info({
    category: 'authentication',
    className: 'AuthService',
    methodName: 'login'
  }, 'User logged in successfully');

  // Give time for logs to flush
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Close the logger
  await new Promise((resolve) => {
    logger.flush(() => {
      transport.end(() => {
        console.log('All logs sent to Coralogix');
        resolve();
      });
    });
  });
}

main().catch(console.error);
