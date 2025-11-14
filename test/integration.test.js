import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher } from 'undici'
import pino from 'pino'
import { build } from '../src/index.js'

describe('Integration Tests', () => {
  let mockAgent
  let originalDispatcher

  beforeEach(() => {
    originalDispatcher = getGlobalDispatcher()
    mockAgent = new MockAgent()
    mockAgent.disableNetConnect()
    setGlobalDispatcher(mockAgent)
  })

  afterEach(async () => {
    await mockAgent.close()
    setGlobalDispatcher(originalDispatcher)
  })

  it('should send logs from Pino to Coralogix', async () => {
    const config = {
      domain: 'us1',
      apiKey: 'test-key',
      applicationName: 'test-app',
      subsystemName: 'test-subsystem',
      batchSize: 2,
      flushInterval: 5000 // High interval so we control flushing
    }

    const mockPool = mockAgent.get('https://ingress.us1.coralogix.com')

    let requestReceived = false
    let receivedLogs = null

    mockPool
      .intercept({
        path: '/logs/v1/singles',
        method: 'POST',
        body: (body) => {
          receivedLogs = JSON.parse(body)
          requestReceived = true
          return true
        }
      })
      .reply(200, { status: 'ok' })

    const transport = await build(config)
    const logger = pino(transport)

    // Log some messages
    logger.info('First message')
    logger.warn('Second message')

    // Wait a bit for the transport to process
    await new Promise(resolve => setTimeout(resolve, 50))

    // Close the transport to flush remaining logs
    await new Promise((resolve) => {
      transport.end(() => resolve())
    })

    assert.ok(requestReceived, 'Request should have been sent')
    assert.ok(Array.isArray(receivedLogs), 'Logs should be an array')
    assert.strictEqual(receivedLogs.length, 2)
    assert.strictEqual(receivedLogs[0].text, 'First message')
    assert.strictEqual(receivedLogs[0].severity, 3) // info
    assert.strictEqual(receivedLogs[1].text, 'Second message')
    assert.strictEqual(receivedLogs[1].severity, 4) // warn
  })

  it('should transform log levels correctly', async () => {
    const config = {
      domain: 'us1',
      apiKey: 'test-key',
      applicationName: 'test-app',
      subsystemName: 'test-subsystem',
      batchSize: 6,
      flushInterval: 5000
    }

    const mockPool = mockAgent.get('https://ingress.us1.coralogix.com')

    let receivedLogs = null

    mockPool
      .intercept({
        path: '/logs/v1/singles',
        method: 'POST'
      })
      .reply(200, (opts) => {
        receivedLogs = JSON.parse(opts.body)
        return { status: 'ok' }
      })

    const transport = await build(config)
    const logger = pino({ level: 'trace' }, transport)

    logger.trace('trace message')
    logger.debug('debug message')
    logger.info('info message')
    logger.warn('warn message')
    logger.error('error message')
    logger.fatal('fatal message')

    await new Promise(resolve => setTimeout(resolve, 50))
    await new Promise((resolve) => transport.end(() => resolve()))

    assert.strictEqual(receivedLogs.length, 6, 'Should have 6 logs')
    assert.strictEqual(receivedLogs[0].severity, 1) // trace -> debug
    assert.strictEqual(receivedLogs[1].severity, 2) // debug -> verbose
    assert.strictEqual(receivedLogs[2].severity, 3) // info
    assert.strictEqual(receivedLogs[3].severity, 4) // warn
    assert.strictEqual(receivedLogs[4].severity, 5) // error
    assert.strictEqual(receivedLogs[5].severity, 6) // fatal -> critical
  })

  it('should include application and subsystem names', async () => {
    const config = {
      domain: 'eu1',
      apiKey: 'test-key',
      applicationName: 'my-cool-app',
      subsystemName: 'auth-service',
      batchSize: 1,
      flushInterval: 5000
    }

    const mockPool = mockAgent.get('https://ingress.eu1.coralogix.com')

    let receivedLogs = null

    mockPool
      .intercept({ path: '/logs/v1/singles', method: 'POST' })
      .reply(200, (opts) => {
        receivedLogs = JSON.parse(opts.body)
        return { status: 'ok' }
      })

    const transport = await build(config)
    const logger = pino(transport)

    logger.info('test message')

    await new Promise(resolve => setTimeout(resolve, 50))
    await new Promise((resolve) => transport.end(() => resolve()))

    assert.strictEqual(receivedLogs[0].applicationName, 'my-cool-app')
    assert.strictEqual(receivedLogs[0].subsystemName, 'auth-service')
  })

  it('should handle custom fields', async () => {
    const config = {
      domain: 'us1',
      apiKey: 'test-key',
      applicationName: 'test-app',
      subsystemName: 'test-subsystem',
      batchSize: 1,
      flushInterval: 5000
    }

    const mockPool = mockAgent.get('https://ingress.us1.coralogix.com')

    let receivedLogs = null

    mockPool
      .intercept({ path: '/logs/v1/singles', method: 'POST' })
      .reply(200, (opts) => {
        receivedLogs = JSON.parse(opts.body)
        return { status: 'ok' }
      })

    const transport = await build(config)
    const logger = pino(transport)

    logger.info({
      category: 'authentication',
      className: 'AuthService',
      methodName: 'login',
      threadId: 'thread-123'
    }, 'test message')

    await new Promise(resolve => setTimeout(resolve, 50))
    await new Promise((resolve) => transport.end(() => resolve()))

    assert.strictEqual(receivedLogs[0].category, 'authentication')
    assert.strictEqual(receivedLogs[0].className, 'AuthService')
    assert.strictEqual(receivedLogs[0].methodName, 'login')
    assert.strictEqual(receivedLogs[0].threadId, 'thread-123')
  })
})
