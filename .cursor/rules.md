# Existing rules (unchanged)
- Architecture: Feature-Sliced Design (src/features/{feature}/ {ui, server-actions, actions, lib, types, hooks, tests})
- Strict layers: 
  - Models (src/database/models) → csak adat, NO business logic
  - Services (src/features/*/lib) → pure business logic, NO direct model import outside services, NO HTTP/auth/flags
  - Server Actions (src/features/*/actions) → thin controllers, authorization + feature flag check + telemetry wrap
- NO dependency between features (csak shared lib-en keresztül, pl. src/shared/lib)
- Authorization: minden server action-ben kötelező első sor: const session = await authorizeUser(); (centralizált RBAC src/features/auth/lib/authorizeUser.ts)
- Feature Flags: mindig ellenőrizd eligibility-t (subscription, role), ha disabled → throw AppError vagy redirect, paid feature override támogatott (src/features/flags/lib/featureFlags.ts)
- Tests: minden feature-hez unit (Jest) + E2E (Playwright) kötelező, coverage > 85%
- Clean Code: SOLID, no god classes, server components only, Tailwind + shadcn, accessibility AA, mobile-first
- Next 16: csak server actions, NO /api/routes

# NEW: Telemetry & Observability (critical for production health)
- Minden server action kötelezően wrapped withTelemetry HOF-fal: const action = withTelemetry("feature.actionName", async (input) => { ... })
- Telemetry gyűjtés: request count, latency (p50/p95/p99), payload size (req/res), error rate, spikes detektálás
- Telemetry wrapper helye: src/shared/lib/withTelemetry.ts (higher-order function, OpenTelemetry-kompatibilis spans ha lehetséges)
- Telemetry-t minden domain service call-nál és external integration-nél (Stripe, Socket, Szamlazz, Nominatim) is használd
- Ne duplikáld a régi withApiTelemetry-t; konvergáld az új shared verzióba

# NEW: Testing – Load & Performance
- Minden kritikus feature-hez (auth, tournament CRUD, match finish, search, realtime) generálj Artillery load test scriptet (artillery.yaml)
- Load tesztek: ramp-up 100-1000 concurrent user, sustained load, spike tesztek
- Mérj per-feature/service: latency növekedés, call drops, error rate spike-ok magas forgalom alatt
- Használj meglévő telemetry-t a load test eredmények vizualizálására (pl. latency p95 > 300ms vagy error >1% → alert)
- Tesztek helye: src/features/*/tests/load/ (Artillery YAML + Playwright integration ha kell)
- Coverage: unit + E2E >85%, load tesztek passzoljanak éles-szerű terhelésen (no unexpected drops, latency stabil)

# Enforcement
- Ha új action-t írsz: mindig add hozzá authorizeUser + feature flag check + withTelemetry
- Ha új feature slice: mindig include load test plan vagy script
- Ha violation-t látsz: javítsd azonnal vagy dobj figyelmeztetést
- Every server action needs to have a documentation so the frontend team can work just by the docs
- "Transport/callback routes (OAuth, SSE, webhook, socket auth) maradhatnak route.ts-ben thin adapter-ként, de wrapped withTelemetry + auth check."