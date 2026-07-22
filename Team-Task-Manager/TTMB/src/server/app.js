import { TASK_PRIORITIES, TASK_STATUSES } from "../constants/taskOptions.js";
import { getTaskStatistics } from "../utils/taskStatistics.js";
import { TaskValidationError } from "../utils/taskValidation.js";
import { randomUUID } from "node:crypto";
import { AuthError } from "./authService.js";
import { RateLimiter } from "./rateLimiter.js";
import { TeamError } from "./teamRepository.js";

const commonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
};
const sessionCookie = "taskflow_session";
const cookies = (request) => Object.fromEntries((request.headers.cookie || "").split(";").map((part) => part.trim().split("=")).filter(([key, value]) => key && value).map(([key, value]) => [key, decodeURIComponent(value)]));
const setSessionCookie = (response, token, secure) => response.setHeader("set-cookie", `${sessionCookie}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secure ? "; Secure" : ""}`);
const clearSessionCookie = (response, secure) => response.setHeader("set-cookie", `${sessionCookie}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure ? "; Secure" : ""}`);

function respond(response, status, payload) {
  response.writeHead(status, commonHeaders);
  response.end(payload === undefined ? "" : JSON.stringify(payload));
}

async function parseBody(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 1_000_000) throw Object.assign(new Error("Request body exceeds 1 MB."), { status: 413 });
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw Object.assign(new Error("Request body must be valid JSON."), { status: 400 }); }
}

export function createRequestHandler(repository, { logger = console, authService = null, teamRepository = null, authRateLimiter = new RateLimiter(), secureCookies = false } = {}) {
  return async function handleRequest(request, response) {
    const startedAt = performance.now();
    const requestId = request.headers["x-request-id"] || randomUUID();
    response.setHeader("x-request-id", requestId);
    response.once("finish", () => logger.info?.(JSON.stringify({
      level: "info",
      requestId,
      method: request.method,
      path: request.url,
      status: response.statusCode,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    })));
    if (request.method === "OPTIONS") return respond(response, 204);
    const url = new URL(request.url, "http://localhost");
    const path = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
    let authenticatedUser = null;
    try {
      if (request.method === "GET" && url.pathname === "/") return respond(response, 200, {
        name: "Team Task Manager API",
        version: "1.0.0",
        status: "running",
        health: "/health",
        authentication: {
          register: "POST /api/auth/register",
          login: "POST /api/auth/login",
          profile: "GET /api/auth/me",
        },
        resources: { tasks: "/api/tasks", teams: "/api/teams" },
        documentation: "docs/openapi.yaml",
      });
      if (request.method === "GET" && url.pathname === "/health") return respond(response, 200, { status: "ok" });
      if (request.method === "GET" && url.pathname === "/api/meta") return respond(response, 200, { data: { priorities: TASK_PRIORITIES, statuses: TASK_STATUSES, defaults: { priority: "medium", status: "todo" } } });
      if (path[0] === "api" && path[1] === "auth") {
        if (!authService) return respond(response, 503, { error: "Authentication service is unavailable." });
        if (request.method === "POST" && ["register", "login", "forgot-password"].includes(path[2])) {
          const rate = authRateLimiter.consume(`${request.socket.remoteAddress || "unknown"}:${path[2]}`);
          response.setHeader("x-ratelimit-remaining", String(rate.remaining));
          if (!rate.allowed) {
            response.setHeader("retry-after", String(rate.retryAfterSeconds));
            return respond(response, 429, { error: "Too many authentication attempts. Please try again later." });
          }
        }
        if (request.method === "POST" && path[2] === "register" && path.length === 3) { const data = await authService.register(await parseBody(request)); setSessionCookie(response, data.token, secureCookies); return respond(response, 201, { data }); }
        if (request.method === "POST" && path[2] === "login" && path.length === 3) { const data = await authService.login(await parseBody(request)); setSessionCookie(response, data.token, secureCookies); return respond(response, 200, { data }); }
        if (request.method === "POST" && path[2] === "forgot-password" && path.length === 3) return respond(response, 200, { data: await authService.requestPasswordReset((await parseBody(request)).email) });
        if (request.method === "POST" && path[2] === "reset-password" && path.length === 3) { const input = await parseBody(request); return respond(response, 200, { data: await authService.resetPassword(input.token, input.password) }); }
        if (request.method === "POST" && path[2] === "logout" && path.length === 3) { clearSessionCookie(response, secureCookies); return respond(response, 200, { data: { message: "Signed out successfully." } }); }
        if (request.method === "GET" && path[2] === "me" && path.length === 3) {
          const authorization = request.headers.authorization;
          const token = typeof authorization === "string" && authorization.startsWith("Bearer ") ? authorization.slice(7) : cookies(request)[sessionCookie];
          return respond(response, 200, { data: await authService.verifyToken(token) });
        }
        return respond(response, 404, { error: "Route not found." });
      }
      if (authService && path[0] === "api" && (path[1] === "tasks" || path[1] === "teams")) {
        const authorization = request.headers.authorization;
        const bearer = typeof authorization === "string" && authorization.startsWith("Bearer ");
        const token = bearer ? authorization.slice(7) : cookies(request)[sessionCookie];
        if (!bearer && !["GET", "HEAD"].includes(request.method) && request.headers["x-taskflow-client"] !== "web") throw new AuthError("CSRF protection header is required.", 403);
        authenticatedUser = await authService.verifyToken(token);
      }
      if (path[0] === "api" && path[1] === "teams") {
        if (!teamRepository) return respond(response, 503, { error: "Team service is unavailable." });
        if (request.method === "GET" && path.length === 2) return respond(response, 200, { data: await teamRepository.listForUser(authenticatedUser.id) });
        if (request.method === "POST" && path.length === 2) return respond(response, 201, { data: await teamRepository.create((await parseBody(request)).name, authenticatedUser.id) });
        const teamId = path[2];
        if (request.method === "GET" && path.length === 3) return respond(response, 200, { data: await teamRepository.findForUser(teamId, authenticatedUser.id) });
        if (request.method === "PATCH" && path.length === 3) return respond(response, 200, { data: await teamRepository.update(teamId, authenticatedUser.id, (await parseBody(request)).name) });
        if (request.method === "DELETE" && path.length === 3) return respond(response, 200, { data: await teamRepository.delete(teamId, authenticatedUser.id) });
        if (request.method === "POST" && path[3] === "members" && path.length === 4) {
          const user = await authService.findUserByEmail((await parseBody(request)).email);
          if (!user) throw new TeamError("User account not found.", 404);
          return respond(response, 200, { data: await teamRepository.addMember(teamId, authenticatedUser.id, user.id) });
        }
        if (request.method === "DELETE" && path[3] === "members" && path[4] && path.length === 5) return respond(response, 200, { data: await teamRepository.removeMember(teamId, authenticatedUser.id, path[4]) });
        return respond(response, 404, { error: "Route not found." });
      }
      if (request.method === "GET" && url.pathname === "/api/tasks/statistics") {
        return respond(response, 200, { data: getTaskStatistics(await repository.all({}, authenticatedUser?.id)) });
      }
      if (path[0] !== "api" || path[1] !== "tasks") return respond(response, 404, { error: "Route not found." });

      if (request.method === "GET" && path.length === 2) {
        const filters = Object.fromEntries(["status", "priority", "assignee", "q"].map((key) => [key, url.searchParams.get(key)]).filter(([, value]) => value));
        if (filters.status && !TASK_STATUSES.includes(filters.status)) return respond(response, 400, { error: "Invalid status filter." });
        if (filters.priority && !TASK_PRIORITIES.includes(filters.priority)) return respond(response, 400, { error: "Invalid priority filter." });
        return respond(response, 200, { data: await repository.all(filters, authenticatedUser?.id) });
      }
      if (request.method === "POST" && path.length === 2) return respond(response, 201, { data: await repository.create(await parseBody(request), authenticatedUser?.id) });
      if (request.method === "POST" && path[2] === "reset" && path.length === 3) return respond(response, 200, { data: await repository.reset(authenticatedUser?.id) });

      const taskId = path[2];
      if (!taskId) return respond(response, 404, { error: "Route not found." });
      if (request.method === "GET" && path.length === 3) {
        const task = await repository.find(taskId, authenticatedUser?.id);
        return task ? respond(response, 200, { data: task }) : respond(response, 404, { error: "Task not found." });
      }
      if (request.method === "PATCH" && path.length === 3) {
        const task = await repository.update(taskId, await parseBody(request), authenticatedUser?.id);
        return task ? respond(response, 200, { data: task }) : respond(response, 404, { error: "Task not found." });
      }
      if (request.method === "PATCH" && path[3] === "status" && path.length === 4) {
        const { status } = await parseBody(request);
        if (!TASK_STATUSES.includes(status)) return respond(response, 400, { error: "Status must be todo, in-progress or done." });
        const task = await repository.update(taskId, { status }, authenticatedUser?.id);
        return task ? respond(response, 200, { data: task }) : respond(response, 404, { error: "Task not found." });
      }
      if (request.method === "DELETE" && path.length === 3) {
        const task = await repository.delete(taskId, authenticatedUser?.id);
        return task ? respond(response, 200, { data: task }) : respond(response, 404, { error: "Task not found." });
      }
      return respond(response, 404, { error: "Route not found." });
    } catch (error) {
      if (error instanceof TeamError) return respond(response, error.status, { error: error.message });
      if (error instanceof AuthError) return respond(response, error.status, { error: error.message, ...(error.details ? { details: error.details } : {}) });
      if (error instanceof TaskValidationError) return respond(response, 422, { error: error.message, details: error.errors });
      if (error instanceof TypeError || /generated automatically|cannot be changed/.test(error.message)) return respond(response, 400, { error: error.message });
      if (error.status) return respond(response, error.status, { error: error.message });
      logger.error?.(JSON.stringify({ level: "error", requestId, message: error.message }));
      return respond(response, 500, { error: "Internal server error." });
    }
  };
}
