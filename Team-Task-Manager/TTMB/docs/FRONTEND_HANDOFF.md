# Frontend Integration Handoff

## Ready state

The backend is available at `http://127.0.0.1:3000` and serves the current reference UI from `/`. The browser integration client is `public/apiClient.js`. It can be copied into another JavaScript frontend or used as the contract for a framework-specific client.

## Start and verify

```bash
npm start
npm test
```

Read-only probes:

```text
GET /health
GET /api/meta
```

`/api/meta` is the source of truth for allowed priorities, statuses, and defaults. Do not duplicate these strings in new frontend code.

## Browser authentication

Registration and login set a same-origin `HttpOnly; SameSite=Strict` session cookie. Frontend code must use:

```js
fetch(url, {
  credentials: "same-origin",
  headers: {
    "Content-Type": "application/json",
    "X-Taskflow-Client": "web",
  },
});
```

Do not store the JWT in `localStorage` or `sessionStorage`. The browser cannot and should not read the session cookie. On application startup call `GET /api/auth/me`; a `401` means the login screen should be shown.

External/non-browser clients may use `Authorization: Bearer <token>` returned by registration or login.

## Authentication endpoints

| Method | Path | Body | Success |
|---|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password }` | `201`, user and token |
| POST | `/api/auth/login` | `{ email, password }` | `200`, user and token |
| GET | `/api/auth/me` | — | authenticated user |
| POST | `/api/auth/logout` | — | cookie cleared |
| POST | `/api/auth/forgot-password` | `{ email }` | generic recovery result |
| POST | `/api/auth/reset-password` | `{ token, password }` | password changed |

Development returns `resetToken` from forgot-password because no mail provider is configured. Production never exposes it; the backend team must connect email delivery.

## Task endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/tasks` | Current user's tasks; filters: `status`, `priority`, `assignee`, `q` |
| GET | `/api/tasks/statistics` | Current user's aggregate statistics |
| GET | `/api/tasks/:id` | Find one owned task |
| POST | `/api/tasks` | Create a task |
| PATCH | `/api/tasks/:id` | Partial update |
| PATCH | `/api/tasks/:id/status` | Body: `{ status }` |
| DELETE | `/api/tasks/:id` | Delete owned task |
| POST | `/api/tasks/reset` | Replace only the current user's tasks with samples |

All operations are scoped to the authenticated user. A task belonging to another account returns `404`.

## Team endpoints

| Method | Path | Permission |
|---|---|---|
| GET/POST | `/api/teams` | Authenticated user |
| GET | `/api/teams/:id` | Team member |
| PATCH/DELETE | `/api/teams/:id` | Owner |
| POST | `/api/teams/:id/members` with `{ email }` | Owner |
| DELETE | `/api/teams/:id/members/:userId` | Owner |

## Response and error contract

Success:

```json
{ "data": {} }
```

Error:

```json
{
  "error": "Task validation failed.",
  "details": { "title": "Title is required." }
}
```

Frontend handling by status:

- `400`: invalid JSON, filter, token, or protected-field change
- `401`: unauthenticated; show login
- `403`: authenticated but not authorized, or missing CSRF header
- `404`: resource or route unavailable
- `409`: duplicate email/member conflict
- `413`: request exceeds 1 MB
- `422`: validation errors; render `details` beside fields
- `429`: rate limited; respect `Retry-After`
- `500`: generic server error; show retry UI without exposing internals

## Integration checklist

- Import or adapt `public/apiClient.js` rather than duplicating fetch/error logic.
- Call `/api/auth/me` during app initialization.
- Use `/api/meta` for select options.
- Handle loading, empty, validation, unauthorized, forbidden, rate-limit, and server-error states.
- Refresh lists/statistics after mutations.
- Never trust or render user strings with raw `innerHTML`; use text nodes or framework escaping.
- Do not add cross-origin frontend hosting without coordinating an explicit CORS allowlist.
- Use `docs/openapi.yaml` as the machine-readable API contract.
