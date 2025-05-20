// Utility function for sleep if not already defined
export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Rate limiter class
class RateLimiter {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  private lastRequestTime = 0;
  private readonly minInterval: number;

  constructor(requestsPerSecond: number) {
    this.minInterval = 1000 / requestsPerSecond; // Convert RPS to interval in ms
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const now = Date.now();
    const timeToWait = Math.max(
      0,
      this.lastRequestTime + this.minInterval - now,
    );

    if (timeToWait > 0) {
      await sleep(timeToWait);
    }

    const fn = this.queue.shift();
    if (fn) {
      this.lastRequestTime = Date.now();
      await fn();
    }

    // Process next item in queue
    this.processQueue();
  }
}

export default RateLimiter;
