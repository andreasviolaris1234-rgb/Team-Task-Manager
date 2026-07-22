import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequestHandler } from "./app.js";
import { TaskRepository } from "./taskRepository.js";
import { AuthService } from "./authService.js";
import { TeamRepository } from "./teamRepository.js";

let directory;
let repository;
let server;
let baseUrl;
let authToken;

before(async () => {
  directory = await mkdtemp(join(tmpdir(), "task-api-"));
  repository = new TaskRepository(join(directory, "tasks.json"));
  await repository.initialize();
  const authService = new AuthService(join(directory, "users.json"), "api-test-secret-with-more-than-32-characters");
  await authService.initialize();
  authToken = (await authService.register({ name: "API Tester", email: "api@example.com", password: "testing-password" })).token;
  const teamRepository = new TeamRepository(join(directory, "teams.json"));
  await teamRepository.initialize();
  server = createServer(createRequestHandler(repository, { logger: { error() {} }, authService, teamRepository }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await rm(directory, { recursive: true, force: true });
});

async function request(path, options) {
  const settings = { ...(options ?? {}), headers: { ...(options?.headers ?? {}) } };
  if (path.startsWith("/api/tasks") && !settings.headers.authorization) settings.headers.authorization = `Bearer ${authToken}`;
  const response = await fetch(`${baseUrl}${path}`, settings);
  const payload = response.status === 204 ? null : await response.json();
  return { response, payload };
}

test("health, listing, filters, and statistics endpoints work", async () => {
  const root = await request("/");
  assert.equal(root.response.status, 200);
  assert.equal(root.payload.status, "running");
  assert.equal((await request("/health")).payload.status, "ok");
  const meta = await request("/api/meta");
  assert.deepEqual(meta.payload.data.statuses, ["todo", "in-progress", "done"]);
  const all = await request("/api/tasks");
  assert.equal(all.response.status, 200);
  assert.equal(all.payload.data.length, 0);
  const filtered = await request("/api/tasks?status=done&priority=low");
  assert.ok(filtered.payload.data.every((task) => task.status === "done" && task.priority === "low"));
  const statistics = await request("/api/tasks/statistics");
  assert.equal(statistics.payload.data.total, 0);
  assert.equal(statistics.payload.data.done, 0);
  assert.equal((await request("/api/tasks?status=blocked")).response.status, 400);
});

test("complete task CRUD and status movement flow", async () => {
  const create = await request("/api/tasks", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Connect frontend", priority: "high", dueDate: "2026-08-01" }),
  });
  assert.equal(create.response.status, 201);
  assert.equal(create.payload.data.status, "todo");
  const id = create.payload.data.id;

  assert.equal((await request(`/api/tasks/${id}`)).payload.data.title, "Connect frontend");
  const update = await request(`/api/tasks/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Connect board UI" }) });
  assert.equal(update.payload.data.title, "Connect board UI");
  assert.equal(update.payload.data.createdAt, create.payload.data.createdAt);

  const move = await request(`/api/tasks/${id}/status`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "in-progress" }) });
  assert.equal(move.payload.data.status, "in-progress");
  assert.equal((await request(`/api/tasks/${id}`, { method: "DELETE" })).response.status, 200);
  assert.equal((await request(`/api/tasks/${id}`)).response.status, 404);
});

test("API returns useful client and validation errors", async () => {
  const invalid = await request("/api/tasks", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "" }) });
  assert.equal(invalid.response.status, 422);
  assert.ok(invalid.payload.details.title);
  assert.equal((await request("/api/tasks", { method: "POST", body: "{" })).response.status, 400);
  assert.equal((await request("/api/tasks/missing/status", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "blocked" }) })).response.status, 400);
  assert.equal((await request("/unknown")).response.status, 404);
});

test("repository persists data and repairs a corrupted database on initialize", async () => {
  const databasePath = join(directory, "recovery.json");
  await writeFile(databasePath, "not json", "utf8");
  const recovered = new TaskRepository(databasePath);
  assert.equal((await recovered.initialize()).length, 6);
  assert.equal(JSON.parse(await readFile(databasePath, "utf8")).length, 6);
  const reset = await request("/api/tasks/reset", { method: "POST" });
  assert.equal(reset.payload.data.length, 6);
});

test("auth API supports register, login, and authenticated profile", async () => {
  const registration = await request("/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Jamie Lee", email: "jamie@example.com", password: "strong-password" }) });
  assert.equal(registration.response.status, 201);
  assert.equal(registration.payload.data.user.email, "jamie@example.com");
  assert.equal(registration.payload.data.user.passwordHash, undefined);

  const login = await request("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "jamie@example.com", password: "strong-password" }) });
  assert.equal(login.response.status, 200);
  assert.match(login.response.headers.get("set-cookie"), /HttpOnly/);
  assert.match(login.response.headers.get("set-cookie"), /SameSite=Strict/);
  const profile = await request("/api/auth/me", { headers: { authorization: `Bearer ${login.payload.data.token}` } });
  assert.equal(profile.response.status, 200);
  assert.equal(profile.payload.data.name, "Jamie Lee");
  assert.equal((await request("/api/auth/me")).response.status, 401);
});

test("cookie authentication requires CSRF header for task mutations and logout clears cookie", async () => {
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "api@example.com", password: "testing-password" }) });
  const cookie = loginResponse.headers.get("set-cookie").split(";")[0];
  assert.equal((await fetch(`${baseUrl}/api/tasks`, { headers: { cookie } })).status, 200);
  assert.equal((await fetch(`${baseUrl}/api/tasks`, { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ title: "Blocked mutation" }) })).status, 403);
  const allowed = await fetch(`${baseUrl}/api/tasks`, { method: "POST", headers: { cookie, "content-type": "application/json", "x-taskflow-client": "web" }, body: JSON.stringify({ title: "Allowed mutation" }) });
  assert.equal(allowed.status, 201);
  const logout = await fetch(`${baseUrl}/api/auth/logout`, { method: "POST", headers: { cookie } });
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
});

test("password recovery API returns a generic response for unknown accounts", async () => {
  const result = await request("/api/auth/forgot-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "unknown@example.com" }) });
  assert.equal(result.response.status, 200);
  assert.match(result.payload.data.message, /If an account exists/);
});

test("task API rejects missing or invalid bearer tokens", async () => {
  const missing = await fetch(`${baseUrl}/api/tasks`);
  assert.equal(missing.status, 401);
  const invalid = await fetch(`${baseUrl}/api/tasks`, { headers: { authorization: "Bearer invalid.token.value" } });
  assert.equal(invalid.status, 401);
});

test("team API enforces membership and owner permissions", async () => {
  const second = await request("/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Team Member", email: "member@example.com", password: "member-password" }) });
  const memberToken = second.payload.data.token;
  const memberId = second.payload.data.user.id;
  const privateTask = await request("/api/tasks", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${authToken}` }, body: JSON.stringify({ title: "Owner private task" }) });
  assert.equal((await request(`/api/tasks/${privateTask.payload.data.id}`, { headers: { authorization: `Bearer ${memberToken}` } })).response.status, 404);
  assert.equal((await request("/api/tasks", { headers: { authorization: `Bearer ${memberToken}` } })).payload.data.length, 0);
  const created = await request("/api/teams", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${authToken}` }, body: JSON.stringify({ name: "Product Team" }) });
  assert.equal(created.response.status, 201);
  const teamId = created.payload.data.id;

  const hidden = await request(`/api/teams/${teamId}`, { headers: { authorization: `Bearer ${memberToken}` } });
  assert.equal(hidden.response.status, 403);
  const added = await request(`/api/teams/${teamId}/members`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${authToken}` }, body: JSON.stringify({ email: "member@example.com" }) });
  assert.equal(added.response.status, 200);
  assert.ok(added.payload.data.members.some(({ userId }) => userId === memberId));
  assert.equal((await request(`/api/teams/${teamId}`, { headers: { authorization: `Bearer ${memberToken}` } })).response.status, 200);
  assert.equal((await request(`/api/teams/${teamId}`, { method: "DELETE", headers: { authorization: `Bearer ${memberToken}` } })).response.status, 403);
  assert.equal((await request(`/api/teams/${teamId}/members/${memberId}`, { method: "DELETE", headers: { authorization: `Bearer ${authToken}` } })).response.status, 200);
  assert.equal((await request(`/api/teams/${teamId}`, { method: "DELETE", headers: { authorization: `Bearer ${authToken}` } })).response.status, 200);
});
