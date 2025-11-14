import { describe, it } from 'node:test';
import assert from 'node:assert';
import { build } from '../src/index.js';
import buildDefault from '../src/index.js';

describe('Transport Initialization', () => {
  it('should create transport with valid configuration', async () => {
    const config = {
      domain: 'us1',
      apiKey: 'test-api-key',
      applicationName: 'test-app',
      subsystemName: 'test-subsystem'
    };

    const transport = await build(config);
    assert.ok(transport, 'Transport should be created');
  });

  it('should throw error when domain is missing', async () => {
    const config = {
      apiKey: 'test-api-key',
      applicationName: 'test-app',
      subsystemName: 'test-subsystem'
    };

    await assert.rejects(
      async () => await build(config),
      { message: /domain is required/ },
      'Should reject when domain is missing'
    );
  });

  it('should throw error when apiKey is missing', async () => {
    const config = {
      domain: 'us1',
      applicationName: 'test-app',
      subsystemName: 'test-subsystem'
    };

    await assert.rejects(
      async () => await build(config),
      { message: /apiKey is required/ },
      'Should reject when apiKey is missing'
    );
  });

  it('should throw error when applicationName is missing', async () => {
    const config = {
      domain: 'us1',
      apiKey: 'test-api-key',
      subsystemName: 'test-subsystem'
    };

    await assert.rejects(
      async () => await build(config),
      { message: /applicationName is required/ },
      'Should reject when applicationName is missing'
    );
  });

  it('should throw error when subsystemName is missing', async () => {
    const config = {
      domain: 'us1',
      apiKey: 'test-api-key',
      applicationName: 'test-app'
    };

    await assert.rejects(
      async () => await build(config),
      { message: /subsystemName is required/ },
      'Should reject when subsystemName is missing'
    );
  });

  it('should accept all valid domains', async () => {
    const domains = ['us1', 'us2', 'eu1', 'eu2', 'ap1', 'ap2', 'ap3'];

    for (const domain of domains) {
      const config = {
        domain,
        apiKey: 'test-api-key',
        applicationName: 'test-app',
        subsystemName: 'test-subsystem'
      };

      const transport = await build(config);
      assert.ok(transport, `Transport should be created with domain ${domain}`);
    }
  });

  it('should reject invalid domain', async () => {
    const config = {
      domain: 'invalid',
      apiKey: 'test-api-key',
      applicationName: 'test-app',
      subsystemName: 'test-subsystem'
    };

    await assert.rejects(
      async () => await build(config),
      { message: /Invalid domain/ },
      'Should reject invalid domain'
    );
  });

  it('should apply default values for optional config', async () => {
    const config = {
      domain: 'us1',
      apiKey: 'test-api-key',
      applicationName: 'test-app',
      subsystemName: 'test-subsystem'
    };

    const transport = await build(config);
    assert.ok(transport, 'Transport should be created with defaults');
    // We'll verify defaults in the implementation
  });

  it('should accept optional configuration parameters', async () => {
    const config = {
      domain: 'us1',
      apiKey: 'test-api-key',
      applicationName: 'test-app',
      subsystemName: 'test-subsystem',
      computerName: 'test-server',
      batchSize: 50,
      flushInterval: 2000,
      timeout: 60000,
      maxRetries: 5
    };

    const transport = await build(config);
    assert.ok(transport, 'Transport should be created with custom config');
  });

  it('should export default function for Pino transport option', async () => {
    assert.strictEqual(typeof buildDefault, 'function', 'Default export should be a function');

    const config = {
      domain: 'us1',
      apiKey: 'test-api-key',
      applicationName: 'test-app',
      subsystemName: 'test-subsystem'
    };

    const transport = await buildDefault(config);
    assert.ok(transport, 'Transport should be created via default export');
  });

  it('should have default export equal to named export', () => {
    assert.strictEqual(buildDefault, build, 'Default export should be the same as named export');
  });
});
