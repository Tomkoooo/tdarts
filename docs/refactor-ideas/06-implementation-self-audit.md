# Top-5 Refactor Implementation Self-Audit

## Scope coverage

- [x] Issue #1 heavy tournament payload overfetch
- [x] Issue #2 realtime fallback full-resync stampede
- [x] Issue #3 client-heavy tournament route behavior and reload hotspots
- [x] Issue #4 search fanout and pipeline ordering
- [x] Issue #5 finish-flow season average recalculation pressure

## Implemented changes by issue

### Issue #1

- Added section-scoped tournament read models in `src/database/services/tournament.service.ts`:
  - `getTournamentReadModelForSection()`
  - `getTournamentPlayersReadModel()`
  - `getTournamentBoardsReadModel()`
  - `getTournamentGroupsReadModel()`
  - `getTournamentBracketReadModel()`
- Routed section-aware reads in `src/features/tournaments/actions/getTournamentPageData.action.ts` using `view` to avoid unconditional full graph fetches.
- Updated tournament client data hook to request section-scoped data via `view`.

### Issue #2

- Added performance flag utility in `src/features/performance/lib/perfFlags.ts`.
- Enforced optional scoped SSE policy in `src/app/api/updates/route.ts` via `FF_REALTIME_REQUIRE_SCOPED_SSE`.
- Updated `src/features/tournament/hooks/useTournamentRealtimeRefresh.ts`:
  - lite-first + jittered resync path (flagged)
  - in-flight dedupe during coalesced fallback
- Updated TV page fallback refresh behavior in `src/app/[locale]/tournaments/[code]/tv/page.tsx`:
  - in-flight dedupe
  - volatile/overview refresh mode under flag
  - jittered fallback timer

### Issue #3

- Removed forced full-page reload behavior from `src/components/tournament/TournamentGroupsView.tsx`.
- Added callback-based refresh (`onDataChanged`) to use targeted data reconciliation from parent.
- Updated `src/app/[locale]/tournaments/[code]/TournamentPageClient.tsx` to:
  - load section-specific views instead of always forcing full snapshot path
  - refresh current section after mutations

### Issue #4

- Updated `src/database/services/search.service.ts`:
  - moved selective `$match` work earlier in `buildTournamentPipeline()`
  - preserved lookups after narrowing candidate set
  - returned `countsByType` from `searchGlobal()` to avoid duplicate counting work
- Updated `src/features/search/actions/search.action.ts`:
  - when `FF_SEARCH_FANOUT_V2` is enabled, reuse global search counts instead of extra `getTabCounts()`
- Reduced player search overfetch by trimming `userRef` populate fields (`name` only).

### Issue #5

- Added `recalculateCurrentSeasonAveragesBulk()` in `src/database/services/tournament.service.ts`.
- Rewired single-player seasonal average recalculation to reuse bulk function.
- Existing finish-flow implementation already performs batched player mutation persistence via `bulkWrite`; this remains intact and now benefits from bulk seasonal averaging.

## Validation evidence

- Tests:
  - `pnpm jest src/tests/tournaments.page-data.action.test.ts --runInBand` -> PASS
- Lint diagnostics:
  - IDE lint diagnostics checked on all modified files -> no new lints reported
- Type-check:
  - `pnpm exec tsc --noEmit` -> FAIL due to pre-existing test/import/type issues outside this change set

## Regression risk assessment

- Medium risk:
  - section-scoped read model parity (fields expected by all tabs)
  - SSE scoped-mode behavior when `FF_REALTIME_REQUIRE_SCOPED_SSE=true`
- Low-medium risk:
  - search count parity in global tab when `FF_SEARCH_FANOUT_V2=true`
- Low risk:
  - replacing hard reload with callback refresh flow in group actions

## Rollback plan

- Disable by flag:
  - `FF_REALTIME_REQUIRE_SCOPED_SSE=false`
  - `FF_REALTIME_LITE_FIRST=false`
  - `FF_SEARCH_FANOUT_V2=false`
- If needed, temporarily force full tournament read path by switching callers to `view: "full"` in `getTournamentPageDataAction` call sites.

## Remaining follow-up

- Run full 150-300 concurrent load profile and compare to baseline artifacts.
- Verify route-level telemetry deltas for:
  - `tournaments.getTournamentPageData`
  - `search.search`
  - `/api/updates`
- Execute canary rollout thresholds from `6docs/refactor-ideas/05-production-rollout-and-verification.md`.
