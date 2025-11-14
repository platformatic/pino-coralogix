import { describe, it } from 'node:test';
import assert from 'node:assert';
import { transformLog } from '../src/transform.js';

describe('Log Transformation', () => {
  const config = {
    applicationName: 'test-app',
    subsystemName: 'test-subsystem',
    computerName: 'test-server'
  };

  it('should transform basic Pino log to Coralogix format', () => {
    const pinoLog = {
      level: 30,
      time: 1675148539123,
      msg: 'Test message',
      hostname: 'test-host'
    };

    const result = transformLog(pinoLog, config);

    assert.strictEqual(result.applicationName, 'test-app');
    assert.strictEqual(result.subsystemName, 'test-subsystem');
    assert.strictEqual(result.text, 'Test message');
    assert.strictEqual(result.timestamp, 1675148539123);
    assert.strictEqual(result.severity, 3); // info
  });

  it('should map Pino level 10 (trace) to Coralogix severity 1 (debug)', () => {
    const pinoLog = { level: 10, time: Date.now(), msg: 'trace' };
    const result = transformLog(pinoLog, config);
    assert.strictEqual(result.severity, 1);
  });

  it('should map Pino level 20 (debug) to Coralogix severity 2 (verbose)', () => {
    const pinoLog = { level: 20, time: Date.now(), msg: 'debug' };
    const result = transformLog(pinoLog, config);
    assert.strictEqual(result.severity, 2);
  });

  it('should map Pino level 30 (info) to Coralogix severity 3 (info)', () => {
    const pinoLog = { level: 30, time: Date.now(), msg: 'info' };
    const result = transformLog(pinoLog, config);
    assert.strictEqual(result.severity, 3);
  });

  it('should map Pino level 40 (warn) to Coralogix severity 4 (warn)', () => {
    const pinoLog = { level: 40, time: Date.now(), msg: 'warn' };
    const result = transformLog(pinoLog, config);
    assert.strictEqual(result.severity, 4);
  });

  it('should map Pino level 50 (error) to Coralogix severity 5 (error)', () => {
    const pinoLog = { level: 50, time: Date.now(), msg: 'error' };
    const result = transformLog(pinoLog, config);
    assert.strictEqual(result.severity, 5);
  });

  it('should map Pino level 60 (fatal) to Coralogix severity 6 (critical)', () => {
    const pinoLog = { level: 60, time: Date.now(), msg: 'fatal' };
    const result = transformLog(pinoLog, config);
    assert.strictEqual(result.severity, 6);
  });

  it('should use milliseconds for timestamp', () => {
    const now = 1675148539123.456;
    const pinoLog = { level: 30, time: now, msg: 'test' };
    const result = transformLog(pinoLog, config);
    assert.strictEqual(result.timestamp, now);
  });

  it('should include applicationName from config', () => {
    const pinoLog = { level: 30, time: Date.now(), msg: 'test' };
    const result = transformLog(pinoLog, config);
    assert.strictEqual(result.applicationName, 'test-app');
  });

  it('should include subsystemName from config', () => {
    const pinoLog = { level: 30, time: Date.now(), msg: 'test' };
    const result = transformLog(pinoLog, config);
    assert.strictEqual(result.subsystemName, 'test-subsystem');
  });

  it('should use computerName from config', () => {
    const pinoLog = { level: 30, time: Date.now(), msg: 'test' };
    const result = transformLog(pinoLog, config);
    assert.strictEqual(result.computerName, 'test-server');
  });

  it('should use hostname from log if computerName not in config', () => {
    const configWithoutComputer = {
      applicationName: 'test-app',
      subsystemName: 'test-subsystem'
    };
    const pinoLog = { level: 30, time: Date.now(), msg: 'test', hostname: 'log-host' };
    const result = transformLog(pinoLog, configWithoutComputer);
    assert.strictEqual(result.computerName, 'log-host');
  });

  it('should stringify object msg', () => {
    const pinoLog = {
      level: 30,
      time: Date.now(),
      msg: { key: 'value', nested: { data: 123 } }
    };
    const result = transformLog(pinoLog, config);
    assert.strictEqual(typeof result.text, 'string');
    assert.ok(result.text.includes('key'));
    assert.ok(result.text.includes('value'));
  });

  it('should preserve custom fields (category, className, methodName, threadId)', () => {
    const pinoLog = {
      level: 30,
      time: Date.now(),
      msg: 'test',
      category: 'test-category',
      className: 'TestClass',
      methodName: 'testMethod',
      threadId: 'thread-123'
    };
    const result = transformLog(pinoLog, config);
    assert.strictEqual(result.category, 'test-category');
    assert.strictEqual(result.className, 'TestClass');
    assert.strictEqual(result.methodName, 'testMethod');
    assert.strictEqual(result.threadId, 'thread-123');
  });

  it('should handle missing optional fields gracefully', () => {
    const pinoLog = {
      level: 30,
      time: Date.now(),
      msg: 'test'
    };
    const minimalConfig = {
      applicationName: 'test-app',
      subsystemName: 'test-subsystem'
    };
    const result = transformLog(pinoLog, minimalConfig);
    assert.ok(result);
    assert.strictEqual(result.applicationName, 'test-app');
    assert.strictEqual(result.subsystemName, 'test-subsystem');
  });

  it('should handle msg as undefined', () => {
    const pinoLog = {
      level: 30,
      time: Date.now()
    };
    const result = transformLog(pinoLog, config);
    assert.strictEqual(result.text, '');
  });

  it('should handle additional pino fields', () => {
    const pinoLog = {
      level: 30,
      time: Date.now(),
      msg: 'test',
      pid: 12345,
      name: 'my-logger'
    };
    const result = transformLog(pinoLog, config);
    assert.ok(result);
    assert.strictEqual(result.text, 'test');
  });
});
