# Refactor Ideas for 150-300 Concurrent Users

This folder contains practical documentation for the performance refactors identified in the full codebase audit.

## Documents

- `01-top-5-critical-issues.md`
  - Prioritized bottlenecks with impact estimates.
- `02-data-access-and-query-refactors.md`
  - DB/query and service-layer refactors.
- `03-realtime-and-caching-refactors.md`
  - SSE/socket fanout and cache strategy improvements.
- `04-frontend-rendering-refactors.md`
  - RSC/client boundaries, bundle splitting, and rerender controls.
- `05-production-rollout-and-verification.md`
  - Rollout sequencing, canary checks, and validation gates.

## Goal

Reduce p95/p99 latency spikes and improve stability under sustained 150-300 concurrent user traffic on self-hosted Next.js Node runtime.

