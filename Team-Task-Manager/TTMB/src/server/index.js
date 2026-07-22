import { createServer } from "node:http";
import { resolve } from "node:path";
import { createRequestHandler } from "./app.js";
import { loadConfig } from "./config.js";
import { TaskRepository } from "./taskRepository.js";
import { AuthService } from "./authService.js";
import { TeamRepository } from "./teamRepository.js";
import { createStaticHandler } from "./staticFiles.js";
import { RateLimiter } from "./rateLimiter.js";

const config = loadConfig();
const repository = new TaskRepository(config.tasksFile);
const authService = new AuthService(config.usersFile, config.jwtSecret, { exposeResetToken: config.nodeEnv !== "production" });
const teamRepository = new TeamRepository(config.teamsFile);
await Promise.all([repository.initialize(), authService.initialize(), teamRepository.initialize()]);

const apiHandler = createRequestHandler(repository, { authService, teamRepository, authRateLimiter: new RateLimiter({ limit: config.authRateLimit }), secureCookies: config.nodeEnv === "production" });
const staticHandler = createStaticHandler(resolve("public"));
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  if (pathname === "/health" || pathname === "/api" || pathname.startsWith("/api/")) return apiHandler(request, response);
  if (await staticHandler(request, response)) return;
  response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify({ error: "Route not found." }));
});
server.listen(config.port, config.host, () => console.log(JSON.stringify({
  level: "info",
  message: "Task API started",
  url: `http://${config.host}:${config.port}`,
  environment: config.nodeEnv,
})));

server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 5_000;

const shutdown = (signal) => {
  console.log(JSON.stringify({ level: "info", message: "Shutting down", signal }));
  server.close((error) => process.exit(error ? 1 : 0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
