/**
 * BatchAccumulator - Accumulates logs and flushes them based on size or time
 */
export class BatchAccumulator {
  /**
   * Creates a new BatchAccumulator
   * @param {Object} config - Configuration options
   * @param {number} config.batchSize - Number of logs before flushing
   * @param {number} config.flushInterval - Time in ms between flushes
   * @param {number} config.maxBatchSizeBytes - Max batch size in bytes
   * @param {Function} onFlush - Callback function to call when flushing (receives batch array)
   */
  constructor (config, onFlush) {
    this.config = config
    this.onFlush = onFlush
    this.batch = []
    this.currentSizeBytes = 0
    this.timer = null
    this.flushing = false

    // Start the flush interval timer
    this.startTimer()
  }

  /**
   * Starts the interval timer for periodic flushing
   */
  startTimer () {
    if (this.timer) {
      clearInterval(this.timer)
    }

    this.timer = setInterval(async () => {
      await this.flush()
    }, this.config.flushInterval)

    // Don't let the timer keep the process alive
    if (this.timer.unref) {
      this.timer.unref()
    }
  }

  /**
   * Adds a log to the batch
   * @param {Object} log - The log object to add
   * @returns {boolean} True if flush is needed after adding
   */
  add (log) {
    this.batch.push(log)
    this.currentSizeBytes += this.estimateLogSize(log)
    return this.needsFlush()
  }

  /**
   * Checks if the batch needs to be flushed
   * Returns true if batch is at 80% of max size
   * @returns {boolean} True if flush is needed
   */
  needsFlush () {
    const threshold = this.config.maxBatchSizeBytes * 0.8
    return this.currentSizeBytes >= threshold
  }

  /**
   * Estimates the size of a log object in bytes
   * @param {Object} log - The log object
   * @returns {number} Estimated size in bytes
   */
  estimateLogSize (log) {
    // Simple estimation using JSON.stringify length
    // This is an approximation, actual size may vary
    return JSON.stringify(log).length
  }

  /**
   * Returns the estimated total size of the current batch in bytes
   * @returns {number} Estimated size in bytes
   */
  estimatedSizeBytes () {
    return this.currentSizeBytes
  }

  /**
   * Returns the number of logs in the current batch
   * @returns {number} Number of logs
   */
  size () {
    return this.batch.length
  }

  /**
   * Flushes the current batch
   * @returns {Promise<void>}
   */
  async flush () {
    // Prevent concurrent flushes
    if (this.flushing || this.batch.length === 0) {
      return
    }

    this.flushing = true

    try {
      const batchToFlush = this.batch
      this.batch = []
      this.currentSizeBytes = 0

      await this.onFlush(batchToFlush)
    } catch (error) {
      // Log error but don't throw to prevent crash
      console.error('Error in flush callback:', error)
    } finally {
      this.flushing = false
    }
  }

  /**
   * Stops the timer and flushes remaining logs
   * @returns {Promise<void>}
   */
  async stop () {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    await this.flush()
  }
}
