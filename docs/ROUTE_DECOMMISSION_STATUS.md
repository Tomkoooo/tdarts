# Route Decommission Status

This file tracks route-handler retirement progress after server-action migration.

## Completed in this change set

The following routes were decommissioned as business-logic entrypoints and are now thin compatibility wrappers that delegate to feature actions:

- `src/app/api/clubs/route.ts` -> `src/features/clubs/actions/updateClub.action.ts`
- `src/app/api/clubs/leagues/route.ts` -> `src/features/leagues/actions/createLeague.action.ts`
- `src/app/api/players/route.ts` -> `src/features/players/actions/createPlayer.action.ts`
- `src/app/api/matches/[matchId]/updateBoardStatus/route.ts` -> `src/features/matches/actions/updateBoardStatus.action.ts`
- `src/app/api/clubs/[clubId]/createTournament/route.ts` -> `src/features/tournaments/actions/createTournament.action.ts`
- `src/app/api/payments/verify/route.ts` -> `src/features/payments/actions/verifyPayment.action.ts`
- `src/app/api/tournaments/[code]/players/route.ts` -> `src/features/tournaments/actions/tournamentPlayers.action.ts`

## Why wrappers are kept temporarily

UI and external callers still target `/api/**` endpoints. Wrappers are intentionally kept during the transition to avoid breaking existing clients while enabling server-action-first internals.

## Next retirement step

After callers are moved to feature actions directly and parity checks pass, remove these wrappers and retire the matching API routes.
