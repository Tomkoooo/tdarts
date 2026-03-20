# Production Rollout and Verification

## Recommended rollout sequence

1. **Read-model split for tournament data**
2. **Realtime fallback containment and scoped subscriptions**
3. **Server-first tournament page + dynamic tab chunks**
4. **Search pipeline reorder and fanout reduction**
5. **Finish flow N+1 removal + bulk writes**

## Verification gates

- **Latency targets**
  - p95 < 500ms for critical read actions
  - p99 < 1500ms for critical read actions
  - no event-driven burst where DB CPU saturates
- **Load profile targets**
  - run 150-300 concurrent lifecycle + browse + realtime scenarios
  - compare with baseline artifacts in `src/features/tests/load/results.json`

## Observability requirements

- Track per-route p95/p99 and error rate for:
  - tournament page data actions
  - search actions
  - board/live/realtime endpoints
- Track realtime fallback metrics:
  - delta-applied ratio
  - lite-resync ratio
  - full-resync ratio

## Database rollout safety

- Follow hidden-index canary from `docs/performance/index-rollout-canary.md`.
- Validate with profiler guidance in `docs/performance/timeout-baseline-profiler.md`.
- Confirm reduced `docsExamined` / `keysExamined` on targeted query shapes.

## High-risk regression checklist

- No stale state regressions after removing full reload flows.
- No authorization regressions in scoped SSE subscriptions.
- No cache staleness issues for live boards.
- No hydration mismatches after RSC/client boundary changes.

## Exit criteria

- Top-5 fixes deployed or staged behind flags.
- Load tests pass with stable tails (no severe p99 spikes like historical 10s+).
- Canary window confirms stable DB and app-node CPU/memory profile.

