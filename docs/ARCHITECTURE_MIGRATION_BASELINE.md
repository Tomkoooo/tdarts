# Architecture Migration Baseline

This document captures the pre-migration baseline used for the SOLID + FSD + telemetry refactor.

## Topology Snapshot

- API handlers: `src/app/api/**` contains `198` `route.ts` files and `1` `route.tsx` file.
- Telemetry wrappers: route handlers are wrapped with `withApiTelemetry(...)` across the API tree.
- Server actions: no `use server` actions are present in `src`.
- Feature slices: `src/features/**` is not present yet.

## Critical Gaps Against `.cursor/rules.md`

1. Next 16 server-action-only architecture is not implemented yet.
2. Feature-sliced layout is missing (`lib/`, `actions/`, `types/`, `hooks/`, `tests/`).
3. Central action guard stack (`authorizeUser` + eligibility check + telemetry) is not unified.

## Hotspots Prioritized For Migration

- `src/app/api/clubs/route.ts`
- `src/app/api/clubs/leagues/route.ts`
- `src/app/api/tournaments/[code]/players/route.ts`
- `src/app/api/payments/verify/route.ts`
- `src/app/api/players/route.ts`
- `src/app/api/matches/[matchId]/updateBoardStatus/route.ts`

## Telemetry-Specific Baseline

- Existing telemetry is route-centric (`src/lib/api-telemetry.ts`), tightly coupled to `NextRequest` route handlers.
- Aggregation, anomaly checks, and retention exist in `src/database/services/api-telemetry.service.ts`.
- Data-quality issue identified: `src/app/api/clubs/[clubId]/addMember/route.tsx` uses route key `'/api/clubs/[clubId]/addMemberx'`.

## Layering Gaps

- Several API routes import models directly (`@/database/models/*`) and contain business orchestration.
- Oversized service classes indicate SRP pressure:
  - `src/database/services/tournament.service.ts`
  - `src/database/services/match.service.ts`
  - `src/database/services/league.service.ts`
  - `src/database/services/search.service.ts`

