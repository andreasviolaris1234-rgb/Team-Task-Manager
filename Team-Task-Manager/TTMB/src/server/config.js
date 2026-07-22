import { resolve } from "node:path";

export function loadConfig(environment = process.env) {
  const port = Number(environment.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("PORT must be an integer between 0 and 65535.");
  const nodeEnv = environment.NODE_ENV || "development";
  const jwtSecret = environment.JWT_SECRET || "development-only-change-this-secret-now";
  if (nodeEnv === "production" && !environment.JWT_SECRET) throw new Error("JWT_SECRET is required in production.");
  const authRateLimit = Number(environment.AUTH_RATE_LIMIT ?? (nodeEnv === "production" ? 10 : 100));
  if (!Number.isInteger(authRateLimit) || authRateLimit < 1) throw new Error("AUTH_RATE_LIMIT must be a positive integer.");
  return Object.freeze({
    port,
    host: environment.HOST || "127.0.0.1",
    tasksFile: resolve(environment.TASKS_FILE || "data/tasks.json"),
    nodeEnv,
    jwtSecret,
    usersFile: resolve(environment.USERS_FILE || "data/users.json"),
    teamsFile: resolve(environment.TEAMS_FILE || "data/teams.json"),
    authRateLimit,
  });
}
