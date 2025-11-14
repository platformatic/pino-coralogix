import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher } from 'undici';
import { sendLogs } from '../src/http.js';

describe('HTTP Client', () => {
  let mockAgent;
  let originalDispatcher;

  beforeEach(() => {
    originalDispatcher = getGlobalDispatcher();
    mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    setGlobalDispatcher(mockAgent);
  });

  afterEach(async () => {
    await mockAgent.close();
    setGlobalDispatcher(originalDispatcher);
  });

  it('should send POST request to correct endpoint URL', async () => {
    const config = {
      domain: 'us1',
      apiKey: 'test-key',
      timeout: 5000
    };

    const logs = [{ applicationName: 'test', subsystemName: 'api', timestamp: Date.now(), text: 'test' }];

    const mockPool = mockAgent.get('https://ingress.us1.coralogix.com');
    mockPool
      .intercept({ path: '/logs/v1/singles', method: 'POST' })
      .reply(200, { status: 'ok' });

    await sendLogs(logs, config);
    // If no error is thrown, the request was successful
  });

  it('should include Authorization header with Bearer token', async () => {
    const config = {
      domain: 'us1',
      apiKey: 'my-secret-key',
      timeout: 5000
    };

    const logs = [{ applicationName: 'test', subsystemName: 'api', timestamp: Date.now(), text: 'test' }];

    const mockPool = mockAgent.get('https://ingress.us1.coralogix.com');
    mockPool
      .intercept({
        path: '/logs/v1/singles',
        method: 'POST',
        headers: {
          'Authorization': 'Bearer my-secret-key'
        }
      })
      .reply(200, { status: 'ok' });

    await sendLogs(logs, config);
  });

  it('should include Content-Type: application/json header', async () => {
    const config = {
      domain: 'us1',
      apiKey: 'test-key',
      timeout: 5000
    };

    const logs = [{ applicationName: 'test', subsystemName: 'api', timestamp: Date.now(), text: 'test' }];

    const mockPool = mockAgent.get('https://ingress.us1.coralogix.com');
    mockPool
      .intercept({
        path: '/logs/v1/singles',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .reply(200, { status: 'ok' });

    await sendLogs(logs, config);
  });

  it('should send logs as JSON array in request body', async () => {
    const config = {
      domain: 'us1',
      apiKey: 'test-key',
      timeout: 5000
    };

    const logs = [
      { applicationName: 'test', subsystemName: 'api', timestamp: 123456, text: 'log1' },
      { applicationName: 'test', subsystemName: 'api', timestamp: 123457, text: 'log2' }
    ];

    const mockPool = mockAgent.get('https://ingress.us1.coralogix.com');
    mockPool
      .intercept({
        path: '/logs/v1/singles',
        method: 'POST',
        body: (body) => {
          const parsed = JSON.parse(body);
          return Array.isArray(parsed) && parsed.length === 2;
        }
      })
      .reply(200, { status: 'ok' });

    await sendLogs(logs, config);
  });

  it('should handle successful response (200 OK)', async () => {
    const config = {
      domain: 'us1',
      apiKey: 'test-key',
      timeout: 5000
    };

    const logs = [{ applicationName: 'test', subsystemName: 'api', timestamp: Date.now(), text: 'test' }];

    const mockPool = mockAgent.get('https://ingress.us1.coralogix.com');
    mockPool
      .intercept({ path: '/logs/v1/singles', method: 'POST' })
      .reply(200, { status: 'ok' });

    const result = await sendLogs(logs, config);
    assert.strictEqual(result.success, true);
  });

  it('should handle 401 Unauthorized error', async () => {
    const config = {
      domain: 'us1',
      apiKey: 'invalid-key',
      timeout: 5000
    };

    const logs = [{ applicationName: 'test', subsystemName: 'api', timestamp: Date.now(), text: 'test' }];

    const mockPool = mockAgent.get('https://ingress.us1.coralogix.com');
    mockPool
      .intercept({ path: '/logs/v1/singles', method: 'POST' })
      .reply(401, { error: 'Unauthorized' });

    await assert.rejects(
      async () => await sendLogs(logs, config),
      { statusCode: 401 }
    );
  });

  it('should handle 413 Payload Too Large error', async () => {
    const config = {
      domain: 'us1',
      apiKey: 'test-key',
      timeout: 5000
    };

    const logs = [{ applicationName: 'test', subsystemName: 'api', timestamp: Date.now(), text: 'test' }];

    const mockPool = mockAgent.get('https://ingress.us1.coralogix.com');
    mockPool
      .intercept({ path: '/logs/v1/singles', method: 'POST' })
      .reply(413, { error: 'Payload Too Large' });

    await assert.rejects(
      async () => await sendLogs(logs, config),
      { statusCode: 413 }
    );
  });

  it('should handle 429 Rate Limit error', async () => {
    const config = {
      domain: 'us1',
      apiKey: 'test-key',
      timeout: 5000
    };

    const logs = [{ applicationName: 'test', subsystemName: 'api', timestamp: Date.now(), text: 'test' }];

    const mockPool = mockAgent.get('https://ingress.us1.coralogix.com');
    mockPool
      .intercept({ path: '/logs/v1/singles', method: 'POST' })
      .reply(429, { error: 'Too Many Requests' });

    await assert.rejects(
      async () => await sendLogs(logs, config),
      { statusCode: 429 }
    );
  });

  it('should handle 500 Server Error', async () => {
    const config = {
      domain: 'us1',
      apiKey: 'test-key',
      timeout: 5000
    };

    const logs = [{ applicationName: 'test', subsystemName: 'api', timestamp: Date.now(), text: 'test' }];

    const mockPool = mockAgent.get('https://ingress.us1.coralogix.com');
    mockPool
      .intercept({ path: '/logs/v1/singles', method: 'POST' })
      .reply(500, { error: 'Internal Server Error' });

    await assert.rejects(
      async () => await sendLogs(logs, config),
      { statusCode: 500 }
    );
  });

  it('should build correct URL for us2 domain', async () => {
    const config = {
      domain: 'us2',
      apiKey: 'test-key',
      timeout: 5000
    };

    const logs = [{ applicationName: 'test', subsystemName: 'api', timestamp: Date.now(), text: 'test' }];

    const mockPool = mockAgent.get('https://ingress.us2.coralogix.com');
    mockPool
      .intercept({ path: '/logs/v1/singles', method: 'POST' })
      .reply(200, { status: 'ok' });

    await sendLogs(logs, config);
  });

  it('should build correct URL for eu1 domain', async () => {
    const config = {
      domain: 'eu1',
      apiKey: 'test-key',
      timeout: 5000
    };

    const logs = [{ applicationName: 'test', subsystemName: 'api', timestamp: Date.now(), text: 'test' }];

    const mockPool = mockAgent.get('https://ingress.eu1.coralogix.com');
    mockPool
      .intercept({ path: '/logs/v1/singles', method: 'POST' })
      .reply(200, { status: 'ok' });

    await sendLogs(logs, config);
  });

  it('should build correct URL for ap1 domain', async () => {
    const config = {
      domain: 'ap1',
      apiKey: 'test-key',
      timeout: 5000
    };

    const logs = [{ applicationName: 'test', subsystemName: 'api', timestamp: Date.now(), text: 'test' }];

    const mockPool = mockAgent.get('https://ingress.ap1.coralogix.com');
    mockPool
      .intercept({ path: '/logs/v1/singles', method: 'POST' })
      .reply(200, { status: 'ok' });

    await sendLogs(logs, config);
  });
});
