# Security Best-Practices Review

## Executive summary

The JavaScript frontend and Node.js backend were reviewed and hardened for the current single-process deployment model. The identified high- and medium-priority application-level issues have been fixed and covered by regression tests. No unresolved critical or high-severity finding remains in the reviewed code.

## Resolved findings

### SEC-001 — Browser token exposure (High, resolved)

- Location: `public/app.js`; `src/server/app.js:16`
- Previous risk: the JWT was stored in `localStorage`, where an XSS could read it.
- Resolution: browser sessions now use an `HttpOnly; SameSite=Strict` cookie. Bearer JWT remains supported for non-browser API clients. Logout expires the cookie.

### SEC-002 — Cookie-authenticated mutation CSRF (High, resolved)

- Location: `src/server/app.js:97`
- Previous risk: adding cookie authentication without a request-bound control would expose state-changing routes to CSRF.
- Resolution: cookie-authenticated POST/PATCH/DELETE task and team operations require the `X-Taskflow-Client: web` header. Bearer clients are not subject to browser CSRF.

### SEC-003 — Permissive CORS (Medium, resolved)

- Location: `src/server/app.js`
- Previous risk: all origins were allowed even though the UI and API are same-origin.
- Resolution: wildcard CORS headers were removed. Cross-origin access is denied by default.

### SEC-004 — Missing browser security policy (Medium, resolved)

- Location: `src/server/staticFiles.js:17`
- Previous risk: no CSP or framing policy was applied to the application shell.
- Resolution: strict same-origin CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and a restrictive referrer policy are returned.

### SEC-005 — Authentication abuse controls (Medium, resolved)

- Location: `src/server/config.js:9`; `src/server/rateLimiter.js`
- Previous risk: authentication endpoints shared an overly restrictive development counter and lacked action-specific keys.
- Resolution: login, registration, and password recovery have separate per-address counters. Production defaults to 10 attempts per window; development defaults to 100.

### SEC-006 — Password reset token handling (High, resolved)

- Location: `src/server/authService.js:122-147`
- Resolution: reset tokens are random, stored only as SHA-256 hashes, expire after 15 minutes, and are deleted after one use. Unknown-email responses are generic.

### SEC-007 — Static path traversal (High, resolved)

- Location: `src/server/staticFiles.js:6`
- Resolution: requested paths are resolved against the public root and rejected if they escape it. Regression coverage exists in `src/server/staticFiles.test.js`.

### SEC-008 — Cross-account task access (High, resolved)

- Location: `src/server/taskRepository.js`; task routes in `src/server/app.js`
- Previous risk: authenticated accounts shared the same unscoped task collection, allowing one user to read or modify another user's tasks.
- Resolution: task list, statistics, lookup, creation, updates, moves, deletion, and reset are scoped to the authenticated user ID. Cross-account lookups return `404` to avoid resource enumeration, with regression coverage using two independent accounts.

### SEC-009 — Tokens surviving password reset (High, resolved)

- Location: `src/server/authService.js`
- Previous risk: JWTs issued before a password reset remained valid until their normal expiry.
- Resolution: JWT payloads carry the account token version. A successful password reset increments the stored version, immediately revoking every previously issued token for that account.

## Deployment considerations

- Terminate TLS at a trusted reverse proxy in production; secure cookies are enabled when `NODE_ENV=production`.
- Supply `JWT_SECRET` through a secret manager or environment variable; production startup rejects a missing secret (`src/server/config.js:8`).
- JSON persistence is appropriate for one application process and small deployments. Move users, teams, tasks, rate limits, and token revocation state to a transactional database/shared store before horizontal scaling.
- Development password-reset tokens are returned to the UI because no email provider is configured. Production does not expose them; connect an email delivery provider before deployment.
