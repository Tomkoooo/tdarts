# Realtime and Caching Refactors

## A) Enforce scoped realtime subscriptions

- **Current issue**
  - SSE path can dispatch globally when no tournament scope is provided.
- **Files to change**
  - `src/app/api/updates/route.ts`
  - `src/lib/events.ts`
- **Refactor direction**
  - Require `tournamentId` for subscription in public route.
  - Reject unscoped listeners for regular clients.
  - Keep global channel only for privileged internal listeners.

## B) Replace in-process fanout with partitioned pub/sub

- **Current issue**
  - Process-local `EventEmitter` only scales per single process and grows listeners linearly.
- **Files to change**
  - `src/lib/events.ts` (abstraction)
  - `src/app/api/updates/route.ts` (consumer)
  - event producers in services (emitters)
- **Refactor direction**
  - Introduce Redis/NATS channel by `tournamentId`.
  - Consume only subscribed tournament channels in SSE route.

## C) Downgrade full-resync fallback behavior

- **Current issue**
  - Delta application often falls back to full refresh with `bypassCache`.
- **Files to change**
  - `src/features/tournament/hooks/useTournamentPageData.ts`
  - `src/features/tournament/hooks/useTournamentRealtimeRefresh.ts`
- **Refactor direction**
  - Add small jitter for resync timers.
  - Try lite refresh first, escalate to full only when required.
  - Include stronger delta payloads from backend to avoid full reload.

```ts
const jitterMs = 100 + Math.floor(Math.random() * 400);
setTimeout(() => {
  void refreshLite(); // fallback 1
}, 400 + jitterMs);
```

## D) Rationalize cache strategy by data volatility

- **Current issue**
  - Mix of `unstable_cache` and `bypassCache` forces can cause inconsistent load under spikes.
- **Files to change**
  - `src/features/tournaments/actions/getTournamentPageData.action.ts`
  - related data actions
- **Refactor direction**
  - Stable data (overview metadata): longer cache.
  - Volatile data (live boards/matches): short cache, tag-based invalidation.
  - Avoid forcing `bypassCache` on broad snapshot requests in normal flow.

## E) Socket auth token deduplication

- **Current issue**
  - Token requested separately from multiple client modules.
- **Files to change**
  - `src/lib/socket.ts`
  - `src/lib/socketApi.ts`
  - `src/app/api/socket/auth/route.ts`
- **Refactor direction**
  - Shared token cache with in-flight promise dedupe.
  - Return token expiry metadata from auth route.

