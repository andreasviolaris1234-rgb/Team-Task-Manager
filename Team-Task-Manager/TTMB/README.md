# Team Task Manager

Task data layer plus a zero-dependency Node.js REST backend. It includes atomic JSON-file persistence, serialized writes, validation, recovery from corrupted data, CORS, request tracing, structured logs, graceful shutdown, and integration tests. Requires Node.js 20+.

## Commands

```bash
npm start
npm run dev
npm test
```

The API runs at `http://127.0.0.1:3000`. Copy `.env.example` values into your process environment as needed; no dotenv package is required. The complete contract is in `docs/openapi.yaml`.

Frontend developers should begin with `docs/FRONTEND_HANDOFF.md` and reuse `public/apiClient.js` for cookie, CSRF, and error handling.

Example:

```bash
curl -X POST http://127.0.0.1:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Connect frontend","priority":"high"}'
```

## Endpoints

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` (Bearer token required)
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/teams`
- `POST /api/teams`
- `GET /api/teams/:id`
- `PATCH /api/teams/:id`
- `DELETE /api/teams/:id`
- `POST /api/teams/:id/members`
- `DELETE /api/teams/:id/members/:userId`
- `GET /api/tasks` (filters: `status`, `priority`, `assignee`, `q`)
- `GET /api/tasks/statistics`
- `GET /api/tasks/:id`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `PATCH /api/tasks/:id/status`
- `DELETE /api/tasks/:id`
- `POST /api/tasks/reset`

Responses use `{ "data": ... }`. Errors use `{ "error": "..." }`, with validation details when applicable.

All `/api/tasks` endpoints require authentication. Browsers use the secure session cookie set by registration/login; external clients use `Authorization: Bearer <token>`. Authentication attempts are rate-limited per client address. `JWT_SECRET` is required in production and must contain at least 32 characters.

Corrupted user storage fails closed and is never silently overwritten, protecting account data from accidental loss.

Runtime task data is stored in `data/tasks.json`, which is intentionally ignored by Git. Invalid or corrupted database content is replaced with a fresh clone of the sample tasks during startup.

Frontend developers should start with `docs/FRONTEND_HANDOFF.md` and reuse `public/apiClient.js`. Deployment owners should follow `docs/PRODUCTION_RUNBOOK.md`. Contributors should follow `CONTRIBUTING.md`; CI validates Node.js 20/22/24 and the container build.
