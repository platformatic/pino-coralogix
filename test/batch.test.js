import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import { BatchAccumulator } from '../src/batch.js'

describe('Batching Logic', () => {
  let batchAccumulator
  let flushedBatches

  beforeEach(() => {
    flushedBatches = []
    const onFlush = async (batch) => {
      flushedBatches.push([...batch])
    }

    batchAccumulator = new BatchAccumulator({
      batchSize: 3,
      flushInterval: 100,
      maxBatchSizeBytes: 1024
    }, onFlush)
  })

  afterEach(async () => {
    await batchAccumulator.stop()
  })

  it('should accumulate logs in batch', () => {
    const log1 = { text: 'log1', timestamp: Date.now() }
    const log2 = { text: 'log2', timestamp: Date.now() }

    batchAccumulator.add(log1)
    batchAccumulator.add(log2)

    assert.strictEqual(batchAccumulator.size(), 2)
  })

  it('should flush manually', async () => {
    const log1 = { text: 'log1', timestamp: Date.now() }
    const log2 = { text: 'log2', timestamp: Date.now() }

    batchAccumulator.add(log1)
    batchAccumulator.add(log2)

    await batchAccumulator.flush()

    assert.strictEqual(flushedBatches.length, 1)
    assert.strictEqual(flushedBatches[0].length, 2)
    assert.strictEqual(batchAccumulator.size(), 0)
  })

  it('should not flush empty batch', async () => {
    await batchAccumulator.flush()
    assert.strictEqual(flushedBatches.length, 0)
  })

  it('should estimate batch size correctly', () => {
    const log1 = { text: 'a'.repeat(100), timestamp: Date.now() }

    batchAccumulator.add(log1)

    const size = batchAccumulator.estimatedSizeBytes()
    assert.ok(size > 100, 'Estimated size should be greater than text length')
  })

  it('should handle multiple flushes', async () => {
    const log1 = { text: 'log1', timestamp: Date.now() }
    const log2 = { text: 'log2', timestamp: Date.now() }

    batchAccumulator.add(log1)
    await batchAccumulator.flush()

    batchAccumulator.add(log2)
    await batchAccumulator.flush()

    assert.strictEqual(flushedBatches.length, 2)
    assert.strictEqual(flushedBatches[0].length, 1)
    assert.strictEqual(flushedBatches[1].length, 1)
  })

  it('should clear batch after flush', async () => {
    const log1 = { text: 'log1', timestamp: Date.now() }

    batchAccumulator.add(log1)
    assert.strictEqual(batchAccumulator.size(), 1)

    await batchAccumulator.flush()
    assert.strictEqual(batchAccumulator.size(), 0)
  })

  it('should handle errors in flush callback gracefully', async () => {
    const errorBatchAccumulator = new BatchAccumulator({
      batchSize: 2,
      flushInterval: 100,
      maxBatchSizeBytes: 1024
    }, async () => {
      throw new Error('Flush failed')
    })

    const log1 = { text: 'log1', timestamp: Date.now() }
    errorBatchAccumulator.add(log1)

    // Should not throw, but handle error gracefully
    await assert.doesNotReject(async () => {
      await errorBatchAccumulator.flush()
    })

    await errorBatchAccumulator.stop()
  })

  it('should accumulate correct size in bytes', () => {
    const log1 = { text: 'test1', timestamp: 123 }
    const log2 = { text: 'test2', timestamp: 456 }

    batchAccumulator.add(log1)
    const size1 = batchAccumulator.estimatedSizeBytes()

    batchAccumulator.add(log2)
    const size2 = batchAccumulator.estimatedSizeBytes()

    assert.ok(size2 > size1, 'Size should increase after adding log')
  })

  it('should stop and flush remaining logs', async () => {
    const log1 = { text: 'log1', timestamp: Date.now() }
    const log2 = { text: 'log2', timestamp: Date.now() }

    batchAccumulator.add(log1)
    batchAccumulator.add(log2)

    await batchAccumulator.stop()

    assert.strictEqual(flushedBatches.length, 1)
    assert.strictEqual(flushedBatches[0].length, 2)
  })

  it('should prevent concurrent flushes', async () => {
    const log1 = { text: 'log1', timestamp: Date.now() }
    batchAccumulator.add(log1)

    // Start multiple flushes simultaneously
    const flush1 = batchAccumulator.flush()
    const flush2 = batchAccumulator.flush()
    const flush3 = batchAccumulator.flush()

    await Promise.all([flush1, flush2, flush3])

    // Should only flush once
    assert.strictEqual(flushedBatches.length, 1)
  })

  it('should indicate when flush is needed at 80% capacity', () => {
    // maxBatchSizeBytes is 1024, so 80% = 819.2 bytes
    const bigLog = { text: 'x'.repeat(820), timestamp: Date.now() }

    assert.strictEqual(batchAccumulator.needsFlush(), false)

    batchAccumulator.add(bigLog)

    assert.strictEqual(batchAccumulator.needsFlush(), true)
  })

  it('should not indicate flush needed when below 80% capacity', () => {
    const smallLog = { text: 'small', timestamp: Date.now() }

    batchAccumulator.add(smallLog)

    assert.strictEqual(batchAccumulator.needsFlush(), false)
  })
})
