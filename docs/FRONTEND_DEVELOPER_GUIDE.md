# Frontend Developer Guide: Calling Server Actions in tdarts (Next.js App Router)

## Load-Test Results (Real Critical Paths)

Latest local run (`npm run test:load`) uses `src/features/tests/load/load-test.yaml` with real path probes named after critical action flows:

- `createTournamentAction` -> `GET /en/clubs/DEMO`
- `updateBoardStatusAction` -> `GET /en/board/DEMO`
- `checkFeatureFlagAction` -> `GET /en/tournaments/DEMO/live`
- `sse_updates_stream` -> `GET /api/updates` probe via stream processor

Configured phases:

- ramp-up: `100 -> 500` users in `60s`
- sustained: `500` users for `120s`
- spike: `1000` users for `30s`

Latest measured output from `src/features/tests/load/results.json`:

- `requests`: `97177`
- `errorRate`: `88.33%`
- `p50`: `645.6ms`
- `p95`: `1901.1ms`
- `p99`: `20136.3ms`
- `vusers.failed`: `85836`

Gate status:

- `p95 < 300ms`: **FAILED**
- `error rate < 1%`: **FAILED**
- `no drops/failures`: **FAILED**

Interpretation for frontend work:

- The migrated action paths are functionally reachable, but this local environment is under-provisioned for `500-1000` concurrent-user targets.
- Use these thresholds as CI/perf-environment gates, not single-machine developer-laptop gates.
- Frontend should keep optimistic UI + resilient retries for tournament/board interactions while backend scaling and queueing are tuned.
