# Load test and stress runner security (operations)

## Production defaults

- **Never** set `LOAD_TEST_MODE=true` on public production unless you are intentionally running load tests against that host.
- **`/api/load-test/*`** is **disabled** when `NODE_ENV=production` unless you set `ALLOW_LOAD_TEST_ENDPOINTS=true`. Use the latter only on dedicated staging or load-test hosts that still run a production build.
- Keep **`LOAD_TEST_SECRET`** long, random, and out of version control. Rotate it if it may have leaked.
- Optional: set **`STRESS_RUN_ADMIN_SECRET`** so mutating stress-runner APIs (`/api/admin/stress-runs/start`, `.../stop`, `.../host-metrics`) require an admin session **and** this server-side secret. The admin UI uses server actions that attach the header automatically; no secret is exposed to the browser.

## Reverse proxy

- You may further restrict `/api/load-test` and `/api/admin/stress-runs` by IP allowlist, VPN, or internal network routing.

## Related code

- Production gate: `src/lib/load-test-environment.ts`
- Load-test route: `src/app/api/load-test/[...action]/route.ts`
- Auth bypass guard: `src/features/auth/lib/authorizeUser.ts`
- Admin stress secret: `src/lib/stress-run-admin-secret.ts`, `src/features/admin/actions/stressRunsServer.action.ts`
