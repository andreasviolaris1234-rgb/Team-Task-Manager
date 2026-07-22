import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "./config.js";

test("loads and validates server configuration", () => {
  const config = loadConfig({ PORT: "8080", HOST: "0.0.0.0", TASKS_FILE: "custom/tasks.json", NODE_ENV: "test" });
  assert.equal(config.port, 8080);
  assert.equal(config.host, "0.0.0.0");
  assert.equal(config.nodeEnv, "test");
  assert.equal(config.authRateLimit, 100);
  assert.match(config.tasksFile, /custom[\\/]tasks\.json$/);
  assert.throws(() => loadConfig({ PORT: "invalid" }), /PORT/);
  assert.throws(() => loadConfig({ PORT: "70000" }), /PORT/);
  assert.throws(() => loadConfig({ NODE_ENV: "production" }), /JWT_SECRET/);
  assert.throws(() => loadConfig({ AUTH_RATE_LIMIT: "0" }), /AUTH_RATE_LIMIT/);
});
