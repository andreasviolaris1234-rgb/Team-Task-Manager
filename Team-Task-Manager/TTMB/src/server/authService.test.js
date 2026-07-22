import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AuthError, AuthService } from "./authService.js";

let directory;
let service;
const secret = "test-secret-that-is-at-least-32-characters-long";

before(async () => {
  directory = await mkdtemp(join(tmpdir(), "task-auth-"));
  service = new AuthService(join(directory, "users.json"), secret, { now: () => new Date("2026-07-21T12:00:00.000Z") });
  await service.initialize();
});
after(() => rm(directory, { recursive: true, force: true }));

test("registers users with normalized email and no exposed password data", async () => {
  const result = await service.register({ name: "Alex Doe", email: " ALEX@Example.com ", password: "correct-horse" });
  assert.equal(result.user.email, "alex@example.com");
  assert.ok(result.token.split(".").length === 3);
  assert.equal(result.user.passwordHash, undefined);
  const saved = JSON.parse(await readFile(join(directory, "users.json"), "utf8"));
  assert.notEqual(saved[0].passwordHash, "correct-horse");
  assert.ok(saved[0].passwordSalt);
});

test("logs in and verifies a signed JWT", async () => {
  const result = await service.login({ email: "alex@example.com", password: "correct-horse" });
  const user = await service.verifyToken(result.token);
  assert.equal(user.id, result.user.id);
  assert.equal(user.passwordHash, undefined);
});

test("rejects invalid registration, duplicates, bad credentials, and tampered JWTs", async () => {
  await assert.rejects(() => service.register({ name: "A", email: "bad", password: "short" }), (error) => error instanceof AuthError && error.status === 422);
  await assert.rejects(() => service.register({ name: "Alex Doe", email: "alex@example.com", password: "another-password" }), (error) => error.status === 409);
  await assert.rejects(() => service.login({ email: "alex@example.com", password: "wrong-password" }), (error) => error.status === 401);
  const { token } = await service.login({ email: "alex@example.com", password: "correct-horse" });
  await assert.rejects(() => service.verifyToken(`${token.slice(0, -1)}x`), AuthError);
});

test("rejects expired tokens", async () => {
  const shortLived = new AuthService(join(directory, "users.json"), secret, { now: () => new Date("2026-07-21T12:00:00.000Z"), tokenLifetimeSeconds: 1 });
  const { token } = await shortLived.login({ email: "alex@example.com", password: "correct-horse" });
  shortLived.now = () => new Date("2026-07-21T12:00:02.000Z");
  await assert.rejects(() => shortLived.verifyToken(token), /expired/);
});

test("fails safely instead of overwriting a corrupted user database", async () => {
  const corruptPath = join(directory, "corrupt-users.json");
  await writeFile(corruptPath, "not-json", "utf8");
  const corruptService = new AuthService(corruptPath, secret);
  await assert.rejects(() => corruptService.initialize(), /could not be loaded safely/);
  assert.equal(await readFile(corruptPath, "utf8"), "not-json");
});

test("resets a password with a hashed, expiring, one-time token", async () => {
  const resetService = new AuthService(join(directory, "users.json"), secret, { now: () => new Date("2026-07-21T12:00:00.000Z"), exposeResetToken: true });
  const oldToken = (await resetService.login({ email: "alex@example.com", password: "correct-horse" })).token;
  const requested = await resetService.requestPasswordReset("alex@example.com");
  assert.ok(requested.resetToken);
  const stored = JSON.parse(await readFile(join(directory, "users.json"), "utf8"))[0];
  assert.notEqual(stored.passwordResetHash, requested.resetToken);
  await resetService.resetPassword(requested.resetToken, "new-strong-password");
  await assert.rejects(() => resetService.verifyToken(oldToken), /revoked/);
  await assert.rejects(() => resetService.login({ email: "alex@example.com", password: "correct-horse" }), /Invalid/);
  assert.ok((await resetService.login({ email: "alex@example.com", password: "new-strong-password" })).token);
  await assert.rejects(() => resetService.resetPassword(requested.resetToken, "another-password"), /invalid or has expired/);
});
