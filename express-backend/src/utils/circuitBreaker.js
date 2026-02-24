const logger = require('./logger');

class CircuitBreaker {
  constructor(request, options = {}) {
    this.request = request;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF-OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    this.options = {
      failureThreshold: options.failureThreshold || 5, // failures before opening
      resetTimeout: options.resetTimeout || 10000, // ms to wait before half-open
      ...options
    };
  }

  async fire(...args) {
    if (this.state === 'OPEN') {
      if (Date.now() > this.nextAttempt) {
        this.state = 'HALF-OPEN';
      } else {
        logger.warn('Circuit Breaker is OPEN. Request rejected.');
        throw new Error('Service Unavailable: Circuit Breaker Open');
      }
    }

    try {
      const result = await this.request(...args);
      this.success();
      return result;
    } catch (err) {
      this.failure(err);
      throw err;
    }
  }

  success() {
    this.failureCount = 0;
    if (this.state === 'HALF-OPEN') {
      this.state = 'CLOSED';
      logger.info('Circuit Breaker: CLOSED');
    }
  }

  failure(err) {
    this.failureCount++;
    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.options.resetTimeout;
      logger.warn(`Circuit Breaker: OPENED due to ${err.message}`);
    }
  }
}

module.exports = CircuitBreaker;
