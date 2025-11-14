# pino-coralogix

A [Pino](https://getpino.io) transport for sending logs to [Coralogix](https://coralogix.com).

## Features

- ✅ **TDD Approach**: Built using Test-Driven Development with 54 tests
- 🚀 **Efficient Batching**: Automatically batches logs to minimize network calls
- 🔄 **Auto-flush**: Configurable batch size and time-based flushing
- 🎯 **Type Mapping**: Automatic mapping of Pino log levels to Coralogix severity
- 📦 **Size Awareness**: Respects Coralogix's 2MB limit with 80% threshold detection
- 🌐 **Multi-region**: Supports all Coralogix domains (US, EU, AP)
- 🔌 **Native HTTP**: Uses undici for fast, modern HTTP requests
- 🧪 **Well Tested**: Comprehensive unit and integration tests

## Installation

```bash
npm install pino-coralogix
```

## Quick Start

```javascript
import pino from 'pino';
import { build } from 'pino-coralogix';

// Create the Coralogix transport
const transport = await build({
  domain: 'us1',
  apiKey: process.env.CORALOGIX_API_KEY,
  applicationName: 'my-app',
  subsystemName: 'api-service'
});

// Create logger
const logger = pino(transport);

// Start logging
logger.info('Hello Coralogix!');
```

## Configuration

### Required Options

| Option | Type | Description |
|--------|------|-------------|
| `domain` | string | Coralogix domain: `us1`, `us2`, `eu1`, `eu2`, `ap1`, `ap2`, `ap3` |
| `apiKey` | string | Your Coralogix Send-Your-Data API key |
| `applicationName` | string | Application name (used for grouping logs) |
| `subsystemName` | string | Subsystem name (used for grouping logs) |

### Optional Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `computerName` | string | `hostname` | Override the computer/host name |
| `batchSize` | number | `100` | Number of logs to batch before sending |
| `flushInterval` | number | `1000` | Time in ms between automatic flushes |
| `timeout` | number | `30000` | HTTP request timeout in ms |
| `maxRetries` | number | `3` | Maximum number of retry attempts |
| `maxBatchSizeBytes` | number | `2097152` | Max batch size in bytes (2MB) |
| `onError` | function | - | Callback for handling errors |

## Usage Examples

### Basic Usage

```javascript
import pino from 'pino';
import { build } from 'pino-coralogix';

const transport = await build({
  domain: 'us1',
  apiKey: process.env.CORALOGIX_API_KEY,
  applicationName: 'my-app',
  subsystemName: 'api-service'
});

const logger = pino(transport);

logger.info('Application started');
logger.warn({ userId: 123 }, 'User session expired');
logger.error(new Error('Connection failed'), 'Database error');
```

### With Custom Fields

Coralogix supports additional fields for better log organization:

```javascript
logger.info({
  category: 'authentication',
  className: 'AuthService',
  methodName: 'login',
  threadId: 'worker-1'
}, 'User logged in successfully');
```

### With Error Handling

```javascript
const transport = await build({
  domain: 'us1',
  apiKey: process.env.CORALOGIX_API_KEY,
  applicationName: 'my-app',
  subsystemName: 'api-service',
  onError: (error) => {
    console.error('Failed to send logs to Coralogix:', error);
  }
});
```

### With Custom Batch Settings

```javascript
const transport = await build({
  domain: 'eu1',
  apiKey: process.env.CORALOGIX_API_KEY,
  applicationName: 'high-volume-app',
  subsystemName: 'worker',
  batchSize: 500,        // Send larger batches
  flushInterval: 500     // Flush more frequently
});
```

### Graceful Shutdown

```javascript
process.on('SIGTERM', async () => {
  logger.info('Shutting down...');

  // Flush remaining logs
  await new Promise((resolve) => {
    logger.flush(() => {
      transport.end(() => {
        console.log('All logs sent');
        resolve();
      });
    });
  });

  process.exit(0);
});
```

## Log Level Mapping

Pino levels are automatically mapped to Coralogix severity levels:

| Pino Level | Pino Value | Coralogix Severity | Coralogix Value |
|------------|------------|-------------------|-----------------|
| trace      | 10         | Debug             | 1               |
| debug      | 20         | Verbose           | 2               |
| info       | 30         | Info              | 3               |
| warn       | 40         | Warn              | 4               |
| error      | 50         | Error             | 5               |
| fatal      | 60         | Critical          | 6               |

## How It Works

1. **Streaming**: Pino writes JSON logs to the transport stream
2. **Transformation**: Each log is transformed to Coralogix format
3. **Batching**: Logs accumulate in memory until batch size or time threshold
4. **Flushing**: Batches are sent to Coralogix via HTTP POST
5. **Auto-flush**: Remaining logs are flushed on stream end

### Batching Strategy

- **Size-based**: Flush when `batchSize` logs accumulated
- **Time-based**: Flush every `flushInterval` milliseconds
- **Capacity-based**: Flush when 80% of `maxBatchSizeBytes` reached
- **On close**: Flush all remaining logs when transport closes

## API Reference

### `build(options)`

Creates a Pino transport for Coralogix.

**Parameters:**
- `options` (Object): Configuration options

**Returns:**
- `Promise<Transform>`: A transform stream for Pino

**Example:**
```javascript
const transport = await build({
  domain: 'us1',
  apiKey: 'your-api-key',
  applicationName: 'my-app',
  subsystemName: 'api'
});
```

## Testing

This transport was built using Test-Driven Development (TDD):

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

Test coverage includes:
- ✅ Transport initialization and configuration validation
- ✅ Log transformation (Pino → Coralogix format)
- ✅ HTTP client with request mocking
- ✅ Batching logic and flush triggers
- ✅ End-to-end integration tests

## Performance

- **Batching**: Reduces network overhead by sending multiple logs per request
- **Async I/O**: Non-blocking HTTP requests using undici
- **Smart Flushing**: 80% capacity threshold prevents size limit errors
- **Memory Efficient**: Streams logs without buffering entire payload

## Troubleshooting

### Logs Not Appearing in Coralogix

1. **Check API Key**: Ensure your API key is correct
2. **Verify Domain**: Use the correct domain for your Coralogix account
3. **Check Flush**: Logs are batched; wait for flush or manually flush
4. **Review Errors**: Use `onError` callback to see error messages

### High Memory Usage

- Reduce `batchSize` to flush more frequently
- Reduce `flushInterval` to flush sooner
- Check for slow network causing batch accumulation

### Logs Being Dropped

- Check `maxBatchSizeBytes` isn't being exceeded
- Look for HTTP errors (401, 413, 429, 500)
- Ensure transport is properly closed on shutdown

## License

Apache 2.0

## Contributing

Contributions are welcome! Please ensure:
- All tests pass (`npm test`)
- New features include tests
- Code follows existing style

## Related

- [Pino](https://getpino.io) - Fast JSON logger
- [Coralogix](https://coralogix.com) - Log analytics platform
- [pino-abstract-transport](https://github.com/pinojs/pino-abstract-transport) - Base transport

## Support

For issues related to:
- **This transport**: Open an issue on GitHub
- **Pino**: See [Pino documentation](https://getpino.io)
- **Coralogix**: Contact [Coralogix support](https://coralogix.com/docs/)
