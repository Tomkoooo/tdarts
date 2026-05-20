# Load test and stress runner security (operations)

## Production defaults

- **Never** set `LOAD_TEST_MODE=true` on public production unless you are intentionally running load tests against that host.
- **`/api/load-test/*`** is **disabled** when `NODE_ENV=production` unless you set `ALLOW_LOAD_TEST_ENDPOINTS=true`. Use the latter only on dedicated staging or load-test hosts that still run a production build.
- Keep **`LOAD_TEST_SECRET`** long, random, and out of version control. Rotate it if it may have leaked.
- **Stress-run admin HTTP API** (`/api/admin/stress-runs/*`) was removed together with the legacy admin panel. If it is reintroduced, consider an optional server-side secret (similar to `LOAD_TEST_SECRET`) plus session checks on mutating routes, and document the contract here.

## Reverse proxy

- You may further restrict `/api/load-test` by IP allowlist, VPN, or internal network routing.

## Related code

- Production gate: `src/lib/load-test-environment.ts`
- Load-test route: `src/app/api/load-test/[...action]/route.ts`
- Auth bypass guard: `src/features/auth/lib/authorizeUser.ts`
- In-process stress runner: `src/lib/stress-load-runner.ts` (uses `StressRunService` in `@tdarts/services`; HTTP admin wrappers are not present until the new admin ships)
