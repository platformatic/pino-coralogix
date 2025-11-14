import build from 'pino-abstract-transport';
import { transformLog } from './transform.js';
import { sendLogs } from './http.js';
import { BatchAccumulator } from './batch.js';

const VALID_DOMAINS = ['us1', 'us2', 'eu1', 'eu2', 'ap1', 'ap2', 'ap3'];

const DEFAULT_CONFIG = {
  batchSize: 100,
  flushInterval: 1000,
  timeout: 30000,
  maxRetries: 3,
  maxBatchSizeBytes: 2 * 1024 * 1024 // 2MB
};

/**
 * Validates the transport configuration
 * @param {Object} opts - Configuration options
 * @throws {Error} If configuration is invalid
 */
function validateConfig(opts) {
  if (!opts.domain) {
    throw new Error('domain is required');
  }

  if (!VALID_DOMAINS.includes(opts.domain)) {
    throw new Error(`Invalid domain: ${opts.domain}. Must be one of: ${VALID_DOMAINS.join(', ')}`);
  }

  if (!opts.apiKey) {
    throw new Error('apiKey is required');
  }

  if (!opts.applicationName) {
    throw new Error('applicationName is required');
  }

  if (!opts.subsystemName) {
    throw new Error('subsystemName is required');
  }
}

/**
 * Builds the Coralogix transport
 * @param {Object} opts - Configuration options
 * @returns {Promise<Transform>} The transport stream
 */
async function buildTransport(opts) {
  validateConfig(opts);

  // Merge with defaults
  const config = {
    ...DEFAULT_CONFIG,
    ...opts
  };

  // Create batch accumulator with flush handler
  const batchAccumulator = new BatchAccumulator({
    batchSize: config.batchSize,
    flushInterval: config.flushInterval,
    maxBatchSizeBytes: config.maxBatchSizeBytes
  }, async (batch) => {
    try {
      await sendLogs(batch, config);
    } catch (error) {
      console.error('Failed to send logs to Coralogix:', error.message);
      // Optionally call error callback if provided
      if (config.onError) {
        config.onError(error);
      }
    }
  });

  return build(async function (source) {
    try {
      for await (let obj of source) {
        // Parse if it's a string (pino-abstract-transport may or may not parse)
        if (typeof obj === 'string') {
          try {
            obj = JSON.parse(obj);
          } catch (err) {
            console.error('Failed to parse log line:', err);
            continue;
          }
        }

        // Debug: log what we receive
        if (process.env.DEBUG) {
          console.log('Parsed obj:', JSON.stringify(obj, null, 2));
        }

        // Transform Pino log to Coralogix format
        const coralogixLog = transformLog(obj, config);

        // Add to batch and check if flush needed
        const needsFlush = batchAccumulator.add(coralogixLog);

        // Optionally trigger flush if threshold reached
        if (needsFlush && batchAccumulator.size() >= config.batchSize) {
          await batchAccumulator.flush();
        }
      }
    } finally {
      // Ensure all logs are flushed when stream ends
      await batchAccumulator.stop();
    }
  }, {
    // Pass through parse option from pino-abstract-transport
    parse: 'lines',
    close: async () => {
      await batchAccumulator.stop();
    }
  });
}

export { buildTransport as build };
export default buildTransport;
