# Contributing

## Required workflow

1. Create a focused feature branch.
2. Read `docs/FRONTEND_HANDOFF.md` before integrating UI code.
3. Keep the task schema and `/api/meta` values as the source of truth.
4. Add or update deterministic tests for every behavior change.
5. Run `npm run check` before opening a pull request.
6. Never commit `.env`, runtime databases, credentials, tokens, or coverage.

## API compatibility

- Preserve the `{ data }` success envelope and `{ error, details? }` error envelope.
- Update `docs/openapi.yaml`, `docs/FRONTEND_HANDOFF.md`, and `public/apiClient.js` together when the contract changes.
- Keep browser authentication cookie-based. Never move session tokens into Web Storage.
- Enforce authorization at repository/resource boundaries, not only in UI code.

## Pull-request checklist

- [ ] `npm run check` succeeds.
- [ ] New behavior has tests.
- [ ] User input is validated and normalized.
- [ ] No sensitive value is logged or returned.
- [ ] API documentation remains accurate.
- [ ] Runtime data files are absent from the change.
