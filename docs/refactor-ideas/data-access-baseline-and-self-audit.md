# Data Access Refactor Baseline and Self-Audit

## Baseline snapshot

- Source: `src/features/tests/load/results.json`
- `loadtest.add_player.latency_ms` p95: `1901.1ms`
- `loadtest.add_player.latency_ms` p99: `16159.7ms`
- `loadtest.create_tournament.latency_ms` p95: `713.5ms`
- `loadtest.create_tournament.latency_ms` p99: `2725ms`

## Query-shape baseline (pre-change)

- Tournament page data used two coarse levels (`overview` vs `full`) with frequent deep population through `getTournamentSummaryForPublicPage`.
- Tournament search applied `$lookup` joins before country-independent filters in the tournament pipeline.
- Tournament finish/reopen recomputed season averages per player in loops and persisted each player individually.

## Self-audit checklist

### A) Read-model split

- [x] Action input now uses `view` (`overview|players|boards|groups|bracket|full`).
- [x] View-scoped reads route through `TournamentService.getTournamentReadModelForSection`.
- [x] Cache keys include section-level granularity for non-full reads.

### B) Search pipeline order

- [x] Base `$match` and tournament-local filters run before joins.
- [x] Club lookup is conditional for count path and country filter usage.
- [x] League lookup is skipped in count pipelines.

### C) Finish/reopen N+1 reduction

- [x] Season-average recalculation uses batch helper.
- [x] Finish flow uses one season-average batch read + `bulkWrite` for player persistence.
- [x] Reopen flow now batches season-average recomputation and persistence with `bulkWrite`.

### D) Index coverage updates

- [x] Added ranking-oriented indexes in `player.model.ts`.
- [x] Added global finished-match history and manual override indexes in `match.model.ts`.
- [x] Added list/sort indexes in `league.model.ts`.
- [x] Added admin/list and membership lookups in `club.model.ts`.

## Remaining verification steps

- Verify and resolve current failure in `src/tests/oac-mmr-lifecycle.test.ts` (`16 Players - Should Update OAC MMR`, observed `787` vs expected `> 800`).
- Run search service behavior parity checks for country/non-country queries and tab counts.
- Run explain-plan checks in staging for country/non-country search queries.
- Run canary hidden-index rollout queries before unhide in production.
