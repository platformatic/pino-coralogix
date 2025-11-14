# Pino Coralogix Transport - Implementation Plan

## Overview

This document outlines the implementation plan for building a Pino transport that sends logs to Coralogix using their REST API `/singles` endpoint. The implementation will follow Test-Driven Development (TDD) principles using Node.js native test runner.

## Project Goals

- Create a production-ready Pino transport for Coralogix
- Use `pino-abstract-transport` as the base
- Use `undici` for HTTP requests
- Use `node:test` for testing (no external test frameworks)
- Follow TDD methodology (Red-Green-Refactor)
- Mock HTTP requests using `undici.MockAgent`
- Handle batching, error handling, and retries

## Technology Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| `pino-abstract-transport` | Base transport implementation | Latest |
| `undici` | HTTP client for API requests | Latest |
| `node:test` | Native test runner | Node.js 18+ |
| `node:assert` | Assertions for tests | Node.js 18+ |

## API Integration

See [CORALOGIX_API.md](./CORALOGIX_API.md) for complete API documentation.

### Key Requirements

- **Endpoint**: `https://ingress.<domain>/logs/v1/singles`
- **Method**: POST
- **Authentication**: Bearer token via `Authorization` header
- **Payload**: Array of JSON log objects
- **Size Limit**: 2MB (~3,000 medium logs)
- **Required Fields**: `timestamp` or `hiResTimestamp`, `applicationName`, `subsystemName`

## Implementation Phases

### Phase 1: Project Setup

**Objective**: Set up the project structure and dependencies

**Tasks**:
- [ ] Initialize `package.json` with proper metadata
- [ ] Add dependencies: `pino-abstract-transport`, `undici`
- [ ] Configure package as ESM or CommonJS (decide)
- [ ] Set up test script using `node:test`
- [ ] Create basic directory structure:
  ```
  pino-coralogix/
  ├── src/
  │   └── index.js          # Main transport implementation
  ├── test/
  │   ├── transport.test.js # Core transport tests
  │   ├── transform.test.js # Log transformation tests
  │   ├── batch.test.js     # Batching logic tests
  │   └── http.test.js      # HTTP client tests
  ├── examples/
  │   └── basic.js          # Usage example
  ├── CORALOGIX_API.md      # API documentation
  ├── PLAN.md               # This file
  ├── README.md             # User documentation
  └── package.json
  ```

**Deliverables**:
- Working `package.json`
- Runnable test command: `npm test`
- Basic file structure

---

### Phase 2: Transport Initialization (TDD)

**Objective**: Implement transport factory and configuration validation

**Test Cases** (Write First):
```javascript
// test/transport.test.js
- should create transport with valid configuration
- should throw error when domain is missing
- should throw error when apiKey is missing
- should throw error when applicationName is missing
- should throw error when subsystemName is missing
- should accept all valid domains (us1, us2, eu1, eu2, ap1, ap2, ap3)
- should reject invalid domain
- should apply default values for optional config
```

**Configuration Schema**:
```javascript
{
  domain: 'us1' | 'us2' | 'eu1' | 'eu2' | 'ap1' | 'ap2' | 'ap3',
  apiKey: string,
  applicationName: string,
  subsystemName: string,
  computerName?: string,
  batchSize?: number,        // default: 100
  flushInterval?: number,    // default: 1000ms
  timeout?: number,          // default: 30000ms
  maxRetries?: number        // default: 3
}
```

**Implementation Steps**:
1. Write failing tests for configuration validation
2. Implement configuration parser/validator
3. Implement transport factory function
4. All tests pass

**Deliverables**:
- `src/index.js` with transport factory
- Passing tests in `test/transport.test.js`

---

### Phase 3: Log Transformation (TDD)

**Objective**: Transform Pino log format to Coralogix schema

**Pino to Coralogix Mapping**:
| Pino Field | Coralogix Field | Transformation |
|------------|-----------------|----------------|
| `time` | `timestamp` | Convert to milliseconds since epoch |
| `level` | `severity` | Map: 10→1, 20→2, 30→3, 40→4, 50→5, 60→6 |
| `msg` | `text` | Direct copy, stringify if object |
| `hostname` | `computerName` | Direct copy or use config value |
| - | `applicationName` | From config |
| - | `subsystemName` | From config |
| Custom fields | `category`, `className`, `methodName`, `threadId` | If present in log |

**Test Cases** (Write First):
```javascript
// test/transform.test.js
- should transform basic Pino log to Coralogix format
- should map Pino levels to Coralogix severity correctly
  - level 10 (trace) → severity 1 (debug)
  - level 20 (debug) → severity 2 (verbose)
  - level 30 (info) → severity 3 (info)
  - level 40 (warn) → severity 4 (warn)
  - level 50 (error) → severity 5 (error)
  - level 60 (fatal) → severity 6 (critical)
- should use milliseconds for timestamp
- should include applicationName from config
- should include subsystemName from config
- should use computerName from config if not in log
- should use hostname from log if present
- should stringify object msg
- should preserve custom fields (category, className, methodName, threadId)
- should handle missing optional fields gracefully
```

**Implementation Steps**:
1. Write failing transformation tests
2. Implement `transformLog(pinoLog, config)` function
3. All tests pass

**Deliverables**:
- Transform function in `src/transform.js`
- Passing tests in `test/transform.test.js`

---

### Phase 4: HTTP Client with Mocking (TDD)

**Objective**: Implement HTTP requests using undici with proper mocking

**Test Cases** (Write First):
```javascript
// test/http.test.js
- should send POST request to correct endpoint URL
- should include Authorization header with Bearer token
- should include Content-Type: application/json header
- should send logs as JSON array in request body
- should handle successful response (200 OK)
- should handle 401 Unauthorized error
- should handle 413 Payload Too Large error
- should handle 429 Rate Limit error
- should handle 500 Server Error
- should handle network errors (ECONNREFUSED, etc.)
- should timeout after configured duration
- should build correct URL for each domain (us1, us2, eu1, etc.)
```

**Undici Mock Setup**:
```javascript
import { MockAgent, setGlobalDispatcher } from 'undici';

const mockAgent = new MockAgent();
setGlobalDispatcher(mockAgent);

const mockPool = mockAgent.get('https://ingress.us1.coralogix.com');
mockPool
  .intercept({ path: '/logs/v1/singles', method: 'POST' })
  .reply(200, { status: 'ok' });
```

**Implementation Steps**:
1. Write failing HTTP client tests with mocks
2. Implement `sendLogs(logs, config)` function using `undici.request`
3. Add proper headers and error handling
4. All tests pass

**Deliverables**:
- HTTP client in `src/http.js`
- Passing tests with mocks in `test/http.test.js`

---

### Phase 5: Batching Logic (TDD)

**Objective**: Implement log batching to optimize network calls

**Batching Strategy**:
- Accumulate logs in memory buffer
- Flush when batch size reached (default: 100 logs)
- Flush on time interval (default: 1000ms)
- Flush on stream end/close
- Respect 2MB size limit
- Handle backpressure

**Test Cases** (Write First):
```javascript
// test/batch.test.js
- should accumulate logs in batch
- should flush when batch size reached
- should flush on time interval
- should flush on stream end
- should not exceed 2MB size limit
- should split oversized batches
- should estimate batch size correctly
- should handle rapid log influx
- should handle backpressure correctly
```

**Implementation Steps**:
1. Write failing batching tests
2. Implement batch accumulator
3. Implement size estimation
4. Implement flush triggers (size, time, end)
5. All tests pass

**Deliverables**:
- Batching logic in `src/batch.js`
- Passing tests in `test/batch.test.js`

---

### Phase 6: Error Handling & Retries (TDD)

**Objective**: Handle errors gracefully with retry logic

**Error Handling Strategy**:
- Retry on transient errors (5xx, network errors)
- Don't retry on client errors (4xx except 429)
- Exponential backoff: 100ms, 200ms, 400ms, 800ms...
- Max retries: 3 (configurable)
- Circuit breaker for repeated failures
- Log errors but don't crash
- Emit error events for monitoring

**Test Cases** (Write First):
```javascript
// test/error-handling.test.js
- should retry on 500 Internal Server Error
- should retry on 503 Service Unavailable
- should retry on network errors
- should retry on timeout
- should use exponential backoff
- should not retry on 400 Bad Request
- should not retry on 401 Unauthorized
- should retry on 429 Rate Limit with backoff
- should stop after max retries
- should emit error events
- should not crash on unrecoverable errors
```

**Implementation Steps**:
1. Write failing error handling tests
2. Implement retry logic with exponential backoff
3. Implement error classification (retryable vs non-retryable)
4. Add error event emission
5. All tests pass

**Deliverables**:
- Error handling in `src/error-handler.js`
- Passing tests in `test/error-handling.test.js`

---

### Phase 7: Integration & End-to-End Tests (TDD)

**Objective**: Test the complete pipeline from Pino to Coralogix

**Test Cases** (Write First):
```javascript
// test/integration.test.js
- should handle complete log flow: Pino → Transform → Batch → HTTP
- should handle multiple concurrent logs
- should handle stream backpressure
- should flush on process exit
- should work with actual Pino logger instance
- should handle mixed log levels
- should preserve log ordering
- should handle large volume of logs
```

**Implementation Steps**:
1. Write failing integration tests
2. Wire all components together in main transport
3. Test with actual Pino logger
4. All tests pass

**Deliverables**:
- Complete transport in `src/index.js`
- Passing integration tests in `test/integration.test.js`

---

### Phase 8: Documentation & Examples

**Objective**: Document the transport for users

**Tasks**:
- [ ] Write comprehensive README.md:
  - Installation instructions
  - Quick start example
  - Configuration options table
  - Usage examples (basic, advanced, custom fields)
  - Error handling guide
  - Troubleshooting section
  - API reference
- [ ] Add JSDoc comments to all exported functions
- [ ] Create example files:
  - `examples/basic.js` - Simple usage
  - `examples/custom-fields.js` - Custom fields
  - `examples/error-handling.js` - Error handling
  - `examples/advanced.js` - Advanced configuration
- [ ] Update package.json with proper metadata

**Deliverables**:
- Complete README.md
- Example files in `examples/`
- JSDoc comments throughout codebase

---

## Testing Strategy

### Test Organization

```
test/
├── transport.test.js      # Transport initialization
├── transform.test.js      # Log transformation
├── http.test.js           # HTTP client (with mocks)
├── batch.test.js          # Batching logic
├── error-handling.test.js # Error handling & retries
└── integration.test.js    # End-to-end tests
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
node --test test/transport.test.js

# Run with coverage (if tool available)
npm run test:coverage
```

### Mocking Strategy

- Use `undici.MockAgent` for HTTP request mocking
- Mock timers for interval/timeout testing
- Use Node.js test runner's built-in mocking capabilities

---

## Configuration API

### Required Options

```javascript
{
  domain: 'us1',              // Coralogix domain
  apiKey: 'your-api-key',     // Send-Your-Data API key
  applicationName: 'my-app',  // Application name
  subsystemName: 'api'        // Subsystem name
}
```

### Optional Options

```javascript
{
  computerName: 'server-01',  // Override hostname
  batchSize: 100,             // Logs per batch (default: 100)
  flushInterval: 1000,        // Flush interval in ms (default: 1000)
  timeout: 30000,             // Request timeout in ms (default: 30000)
  maxRetries: 3,              // Max retry attempts (default: 3)
  onError: (err) => {}        // Error callback
}
```

---

## Success Criteria

- [ ] All tests pass
- [ ] Code coverage > 90%
- [ ] No dependencies with known vulnerabilities
- [ ] Works with Pino v8+
- [ ] Handles 1000+ logs/second
- [ ] Graceful error handling
- [ ] Complete documentation
- [ ] Working examples

---

## Future Enhancements (Out of Scope)

- Support for bulk endpoint (`/logs/v1/bulk`)
- Compression (gzip) support
- Metrics/monitoring integration
- TypeScript type definitions
- Stream multiplexing for high-volume scenarios
- Local buffering to file on persistent errors

---

## Timeline Estimate

| Phase | Estimated Time |
|-------|----------------|
| Phase 1: Project Setup | 30 minutes |
| Phase 2: Transport Initialization | 1 hour |
| Phase 3: Log Transformation | 1.5 hours |
| Phase 4: HTTP Client with Mocking | 2 hours |
| Phase 5: Batching Logic | 2 hours |
| Phase 6: Error Handling & Retries | 2 hours |
| Phase 7: Integration Tests | 1.5 hours |
| Phase 8: Documentation & Examples | 1.5 hours |
| **Total** | **~12 hours** |

---

## References

- [Coralogix API Documentation](./CORALOGIX_API.md)
- [Pino Transport Documentation](https://getpino.io/#/docs/transports)
- [pino-abstract-transport](https://github.com/pinojs/pino-abstract-transport)
- [Undici Documentation](https://undici.nodejs.org/)
- [Node.js Test Runner](https://nodejs.org/api/test.html)

---

**Last Updated**: November 14, 2025
