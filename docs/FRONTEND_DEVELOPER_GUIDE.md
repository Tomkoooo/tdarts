# Frontend Developer Guide: Calling Server Actions in tdarts (Next.js App Router)

## Load-Test Results (Real Critical Paths)

Latest local run (`npm run test:load`) uses `src/features/tests/load/load-test.yaml` with realistic, authenticated journey probes named after critical action flows:

- `createTournament_to_addPlayer_to_updateBoard`:
  - auth bootstrap via `POST /api/socket/auth`,
  - `GET /en/clubs/DEMO` -> `GET /en/tournaments/DEMO` -> `GET /en/board/DEMO`,
  - `1-3s` think-time between user interactions
- `checkFeatureFlagAction`:
  - auth bootstrap + `GET /en/tournaments/DEMO/live`
- `updateBoardStatusAction`:
  - auth bootstrap + `GET /en/board/DEMO`
- `sse_updates_stream`:
  - auth bootstrap + `GET /api/updates` SSE probe via stream processor

Configured phases:

- ramp-up: `50 -> 500` users in `90s`
- sustained: `500` users for `180s`
- spike: `1000` users for `60s`

Latest measured output from `src/features/tests/load/results.json`:

- `requests`: `169389`
- `errors`: `156067`
- `errorRate`: `92.14%`
- `p50`: `804.5ms`
- `p95`: `2416.8ms`
- `p99`: `15839.7ms`
- `vusersCreated`: `174750`
- `vusersFailed`: `156067`
- `failedVuRate`: `89.31%`

Gate status:

- `p95 < 300ms`: **FAILED**
- `error rate < 1%`: **FAILED**
- `failed VUs < 5%`: **FAILED**

Interpretation for frontend work:

- The realistic journey harness now stresses authenticated user flows and SSE together, so these failures represent true critical-path pressure, not synthetic endpoint pinging.
- Current bottlenecks are still backend throughput limits (DB wait/timeout cascades and request queue buildup under 500-1000 VU bursts), not frontend call wiring.
- Frontend should continue optimistic updates + retry-safe UX for create/join/update actions while backend capacity and async offloading are tuned further.
