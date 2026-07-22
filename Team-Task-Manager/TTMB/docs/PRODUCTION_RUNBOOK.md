# Production Runbook

## Prerequisites

- Node.js 20+ for a direct deployment, or Docker with Compose.
- A random `JWT_SECRET` of at least 32 characters supplied through deployment secrets.
- TLS terminated by a trusted reverse proxy or managed platform.
- Persistent storage mounted for the `data` directory.

## Pre-deployment gate

```bash
npm run check
```

This checks every frontend/backend JavaScript file and runs the complete test suite. Deployment must stop if the command exits non-zero.

## Direct Node deployment

Set `NODE_ENV=production`, `JWT_SECRET`, and optionally `HOST`, `PORT`, `TASKS_FILE`, `USERS_FILE`, `TEAMS_FILE`, and `AUTH_RATE_LIMIT`, then run:

```bash
npm start
```

## Docker deployment

Set the secret in the shell without committing it:

```bash
export JWT_SECRET="replace-with-a-random-secret-of-at-least-32-characters"
docker compose up --build -d
docker compose ps
```

The container runs as the unprivileged `node` user, includes a healthcheck, and persists JSON data in the `task-manager-data` volume.

## Health and recovery

- Liveness: `GET /health` must return `{ "status": "ok" }`.
- Back up the mounted data volume while writes are paused or use filesystem snapshots.
- Restore `tasks.json`, `users.json`, and `teams.json` together from the same backup point.
- User/team corruption fails closed. Task corruption resets to samples by current design; alert on unexpected resets.

## Scaling boundary

The JSON repositories and in-memory rate limiter support one application process. Before multiple replicas or high traffic, migrate persistence to a transactional database and rate limiting to a shared store such as Redis. Do not run multiple writers against the same JSON volume.

## Password reset delivery

Production does not return reset tokens to clients. Connect an email provider that consumes the generated reset token and sends a same-origin reset link before enabling public password recovery.
