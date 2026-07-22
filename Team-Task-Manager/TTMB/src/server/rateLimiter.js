export class RateLimiter {
  constructor({ limit = 10, windowMs = 60_000, now = () => Date.now() } = {}) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
    this.entries = new Map();
  }

  consume(key) {
    const timestamp = this.now();
    const current = this.entries.get(key);
    if (!current || current.resetAt <= timestamp) {
      this.entries.set(key, { count: 1, resetAt: timestamp + this.windowMs });
      return { allowed: true, remaining: this.limit - 1, retryAfterSeconds: 0 };
    }
    current.count++;
    const allowed = current.count <= this.limit;
    return { allowed, remaining: Math.max(0, this.limit - current.count), retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - timestamp) / 1000)) };
  }
}
