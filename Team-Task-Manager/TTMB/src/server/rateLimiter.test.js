import test from "node:test";
import assert from "node:assert/strict";
import { RateLimiter } from "./rateLimiter.js";

test("limits repeated requests and resets after the configured window", () => {
  let now = 1_000;
  const limiter = new RateLimiter({ limit: 2, windowMs: 1_000, now: () => now });
  assert.equal(limiter.consume("client").allowed, true);
  assert.equal(limiter.consume("client").allowed, true);
  const limited = limiter.consume("client");
  assert.equal(limited.allowed, false);
  assert.equal(limited.retryAfterSeconds, 1);
  now = 2_001;
  assert.equal(limiter.consume("client").allowed, true);
});
