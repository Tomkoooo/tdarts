# Timeout Baseline + Profiler Guide

This guide captures reproducible baseline evidence before and after timeout fixes.

## 1) Capture explain baselines

Run:

`pnpm perf:baseline:timeout`

Optional explicit IDs:

`pnpm perf:baseline:timeout -- --clubId <clubObjectId> --tournamentId <tournamentCodeOrObjectId> --playerId <playerObjectId>`

Output JSON is written to:

`src/features/tests/load/artifacts/baseline-<timestamp>.json`

It includes executionStats for these query shapes:

- Active tournaments by club + status sorted by created date
- Tournament lookup by code with player-status predicate
- Lifecycle list-matches query (`pending/ongoing`, created sort)
- Finished matches by tournament+player (if player can be resolved)

## 2) Capture profiler snapshot (MongoDB shell)

```javascript
db.setProfilingLevel(1, { slowms: 75 });
// run load profile here
db.system.profile
  .find(
    { ns: { $regex: /(matches|tournaments)/ }, millis: { $gte: 75 } },
    { ts: 1, ns: 1, millis: 1, planSummary: 1, command: 1 }
  )
  .sort({ ts: -1 })
  .limit(200);
db.setProfilingLevel(0);
```

## 3) Comparison checklist

- `totalDocsExamined` and `totalKeysExamined` drop for targeted queries
- `winningPlan` uses intended index (no collection scan for hot paths)
- p95/p99 improve in:
  - `loadtest.add_player.latency_ms`
  - `loadtest.list_matches.latency_ms`
  - `http.response_time`
- timeout counters reduce on `/en`, `/en/home`, `/en/board/{{ tournamentCode }}`

## 4) Rollback-ready checks

- If write latency rises after index rollout:
  - hide new index first
  - re-run baseline + load profile
  - only drop index after validation
