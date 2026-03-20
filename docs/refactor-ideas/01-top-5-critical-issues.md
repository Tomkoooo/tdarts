# Top 5 Critical Issues (Prioritized)

This ranking is based on likely effect on p95/p99 latency, request amplification risk, and implementation leverage.

## 1) Heavy tournament payload overfetch (Critical)

- **Files**
  - `src/database/services/tournament.service.ts`
  - `src/features/tournaments/actions/getTournamentPageData.action.ts`
- **Why this fails at scale**
  - Deep `populate` chains load large nested documents in one request path.
  - Causes read amplification, higher DB CPU, and large JSON serialization cost.
  - Under concurrent viewers, this compounds quickly.
- **Primary failure mode**
  - Overfetch + inefficient read model boundaries.
- **Estimated impact if fixed**
  - 25-45% p95 reduction on tournament page data path.

## 2) Realtime fallback full-resync stampede (Critical)

- **Files**
  - `src/app/api/updates/route.ts`
  - `src/features/tournament/hooks/useTournamentPageData.ts`
  - `src/features/tournament/hooks/useTournamentRealtimeRefresh.ts`
- **Why this fails at scale**
  - Match finish and non-applicable deltas trigger full resync calls.
  - Many clients perform near-simultaneous heavy refetch with `bypassCache`.
  - This creates thundering herd spikes.
- **Primary failure mode**
  - Fanout amplification + cache bypass.
- **Estimated impact if fixed**
  - 30-60% reduction in event-driven read spikes.

## 3) Client-heavy tournament route + large initial bundle (High)

- **Files**
  - `src/app/[locale]/tournaments/[code]/page.tsx`
- **Why this fails at scale**
  - Full route is client-rendered and imports heavy tabs up front.
  - Meaningful content waits on hydration and client-side data fetch.
  - More CPU/main-thread pressure on clients, more retries and abandoned sessions.
- **Primary failure mode**
  - Wrong rendering boundary (client-first instead of server-first).
- **Estimated impact if fixed**
  - 20-35% LCP improvement and lower interactive lag.

## 4) Search fanout + lookup-before-filter aggregation (High)

- **Files**
  - `src/database/services/search.service.ts`
  - `src/features/search/actions/search.action.ts`
- **Why this fails at scale**
  - Global search fans out across multiple expensive queries in parallel.
  - Tournament pipeline performs `$lookup` joins before narrowing enough.
  - Increased DB CPU and memory for broad search traffic.
- **Primary failure mode**
  - Query fanout + inefficient pipeline ordering.
- **Estimated impact if fixed**
  - 20-40% DB CPU reduction for search-heavy periods.

## 5) N+1 season average recalculation in tournament finish flow (High)

- **Files**
  - `src/database/services/tournament.service.ts`
- **Why this fails at scale**
  - Recalculates seasonal averages per player using repeated match scans.
  - Per-player save pattern increases write pressure and completion latency.
- **Primary failure mode**
  - N+1 query/write behavior on mutation hot path.
- **Estimated impact if fixed**
  - 60-90% faster tournament completion flow for larger tournaments.

