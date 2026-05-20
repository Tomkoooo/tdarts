# Feature Flags & Subscription Gating (DB-backed)

## Why we moved away from env vars

The old system used `NEXT_PUBLIC_ENABLE_*` and `NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED`.
That broke in production because `NEXT_PUBLIC_*` values are inlined into client bundles at build time, not read dynamically at runtime.

Result:

- tests passed (Node reads `process.env` dynamically)
- production client often saw `undefined` for feature env vars
- client hook short-circuited before server checks
- super-admin bypass and detailed denial reasons were never reached

The new system stores runtime toggles in MongoDB (`system_settings` singleton) and always checks server-side.

## Current architecture

Access is decided in this order:

1. login/auth
2. optional super-admin bypass (controlled by DB toggle)
3. global feature toggle (`SystemSettings.features`)
4. subscription tier entitlement (`TIER_CONFIG`) when paywall is on
5. club-level feature flag (`club.featureFlags`) when required
6. optional permission check

Key files:

- `packages/core/src/models/system-settings.model.ts`
- `packages/core/src/lib/system-settings.ts`
- `apps/web/src/features/flags/lib/featureRegistry.ts`
- `apps/web/src/features/flags/lib/featureFlags.ts`
- `apps/web/src/features/flags/lib/featureAccess.ts`
- `apps/web/src/hooks/useFeatureFlag.ts`
- `apps/web/src/features/feature-flags/actions/checkFeatureFlags.action.ts`
- `apps/web/src/components/feature-flags/FeatureFlagAccessCallout.tsx`

## SystemSettings singleton

Collection: `system_settings`  
Document `_id`: `global`

Shape:

```ts
{
  _id: 'global',
  features: {
    LEAGUES: boolean,
    SOCKET: boolean,
    LIVE_MATCH_FOLLOWING: boolean,
    DETAILED_STATISTICS: boolean,
    ADVANCED_STATISTICS: boolean,
    OAC_CREATION: boolean,
    ADS: boolean,
    ADS_PLACEHOLDER: boolean,
  },
  subscriptionPaywallEnabled: boolean,
  superAdminBypassEnabled: boolean,
  updatedAt: Date,
  updatedBy: string | null,
}
```

Canonical key list: `FEATURE_TOGGLE_KEYS` in [`packages/core/src/models/system-settings.model.ts`](../../packages/core/src/models/system-settings.model.ts) — must stay in sync with `FEATURE_KEYS` / `FEATURE_REGISTRY` in the web app.

Default seed values (see `SYSTEM_SETTINGS_DEFAULTS` in [`packages/core/src/lib/system-settings.ts`](../../packages/core/src/lib/system-settings.ts)):

- `LEAGUES`, `SOCKET`, `LIVE_MATCH_FOLLOWING`, `DETAILED_STATISTICS`, `ADVANCED_STATISTICS`, `OAC_CREATION`: **`true`**
- `ADS`, `ADS_PLACEHOLDER`: **`false`** (ads off until explicitly enabled)
- `subscriptionPaywallEnabled`: **`false`**
- `superAdminBypassEnabled`: **`true`**

There is **no** remaining env-based read for these toggles in product code: gates use `getSystemSettings()` (async, DB-backed).

## Service behavior (`system-settings.ts`)

- `getSystemSettings()`:
  - auto-seeds singleton if missing
  - 30s in-process cache
  - deduplicates concurrent in-flight reads
- write methods:
  - `updateFeatureToggle`
  - `updateSubscriptionPaywallEnabled`
  - `updateSuperAdminBypassEnabled`
- every write invalidates cache immediately
- tests can use `__setSystemSettingsCacheForTests`

## Feature registry model

`featureRegistry.ts` now contains metadata only (no env var fields):

- `tierEntitlement`
- `clubFlagKey`
- `paywallOffBehavior`
- `requiresSubscription`

Global on/off state no longer lives in the registry; it lives in `SystemSettings.features`.

## Denial reasons (UI + telemetry)

Feature denial reasons are now explicit:

- `feature_disabled`
- `subscription_required`
- `club_not_eligible`
- `permission_required`
- `login_required`

Guard code added:

- `CLUB_NOT_ELIGIBLE` in `GuardFailureCode`

Mapping lives in:

- `apps/web/src/shared/lib/guards/result.ts`

UI rendering lives in:

- `apps/web/src/components/feature-flags/FeatureFlagAccessCallout.tsx`

### Semantics

- `FEATURE_DISABLED`:
  - global toggle is off, or unknown/invalid feature
- `SUBSCRIPTION_REQUIRED`:
  - paywall is on, and tier lacks entitlement
- `CLUB_NOT_ELIGIBLE`:
  - tier is eligible, but club flag is off
  - OR paywall is off and `paywallOffBehavior === 'check_club_flag'` and club flag is off

## Super-admin bypass

Bypass is no longer unconditional.
It runs only when:

- user is global admin **and**
- `SystemSettings.superAdminBypassEnabled === true`

When disabled, global admins go through the same gate path as regular users, which helps reproduce/debug real user symptoms.

## Client behavior

`useFeatureFlag` and `useSocketFeature` no longer read any `process.env.NEXT_PUBLIC_ENABLE_*`.

They:

- always call server action `checkFeatureFlagAction`
- preserve server denial reason instead of collapsing everything to `feature_disabled`

Socket runtime endpoint:

- `GET /api/runtime/socket-config`
- now returns values from `SystemSettings` (`SOCKET` + `subscriptionPaywallEnabled`)

## Tournament paywall behavior

Tournament quota checks (`SubscriptionService`) now use DB-backed paywall state through `isSubscriptionPaywallActive` (async facade to `SystemSettings`) instead of env var reads.

Quota rules still come from `TIER_CONFIG` and are otherwise unchanged.

## Changing toggles (no env, admin UI in flux)

Runtime values live only on the `system_settings` document. After the legacy admin panel removal, there is **no** in-app UI in this repo for editing flags; until a new admin ships, use one of:

- **Direct DB edit** of the `global` document in `system_settings` (shape above), or
- **Programmatic writes** from trusted server code via `@tdarts/core/system-settings`: `updateFeatureToggle`, `updateSubscriptionPaywallEnabled`, `updateSuperAdminBypassEnabled` (see [`packages/core/src/lib/system-settings.ts`](../../packages/core/src/lib/system-settings.ts)).

Reads everywhere go through `getSystemSettings()` — not `process.env`.

## Feature toggle reference (global `features.*`)

Logical meaning and gating metadata live in [`apps/web/src/features/flags/lib/featureRegistry.ts`](../../apps/web/src/features/flags/lib/featureRegistry.ts) (tier / club flag / paywall-off behavior). The **global on/off** for each row is the boolean under `SystemSettings.features` for that key.

| Key | Role (summary) |
|-----|------------------|
| `LEAGUES` | League features; tier + global toggle. |
| `SOCKET` | Realtime/socket stack; tier `liveTracking` when paywall on. |
| `LIVE_MATCH_FOLLOWING` | Live match following; tier + optional club `liveMatchFollowing`. |
| `DETAILED_STATISTICS` | Detailed stats; tier + club `advancedStatistics` when paywall off behavior requires club check. |
| `ADVANCED_STATISTICS` | Advanced stats surface; same tier/club pattern as detailed. |
| `OAC_CREATION` | OAC creation flows; global toggle only (no tier entitlement in registry). |
| `ADS` | Ad serving / decisioning enabled globally. |
| `ADS_PLACEHOLDER` | Placeholder / non-production ad UI behavior (paired with ads rollout). |

For **why** a user was denied (not just on/off), see `FeatureDefinition` in the registry and denial reasons above.

## Removed env-based controls

These **must not** be used for product feature gating or paywall behavior anymore:

- `NEXT_PUBLIC_ENABLE_*` (per-feature build-time flags)
- `NEXT_PUBLIC_ENABLE_ALL` (there is **no** env equivalent to “turn everything on”; that was a separate historical mechanism and is **not** a substitute for admin settings)
- `NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED` (paywall is **`SystemSettings.subscriptionPaywallEnabled`**, exposed server-side via `isSubscriptionPaywallEnabled` / `isSubscriptionPaywallActive` on `@tdarts/core/subscription-paywall` — both names are **async DB readers**, not env)

**Paid override / “subscription gate off”** is **only**: `getSystemSettings()` → `subscriptionPaywallEnabled === false` (see `isPaidOverrideEnabled()` in `apps/web/src/features/flags/lib/eligibility.ts`). It is not tied to `NEXT_PUBLIC_ENABLE_ALL`.

They were removed from:

- Docker build args/env for feature gating
- root `.env` feature/paywall gating fields
- load-test env feature gating fields

`NEXT_PUBLIC_SOCKET_SERVER_URL` remains as a **transport endpoint URL**, not a feature-toggle gate.

## PWA (not a feature flag)

Service worker registration is **not** part of `SystemSettings` or any `NEXT_PUBLIC_ENABLE_*` flag.

- **Production** (`NODE_ENV === 'production'`): register `/sw.js` when `navigator.serviceWorker` exists.
- **Development**: unregister workers and clear `tdarts-*` caches so HMR and App Router are not intercepted.

This is build-environment behavior only, not admin-togglable product access.

## Tests

Updated tests now mock/inject settings through `@tdarts/core/system-settings` cache helper instead of `process.env`.

Primary coverage:

- `feature-flags-subscription.matrix.lib.test.ts`
- `feature-flags.service.lib.test.ts`
- `feature-access.lib.test.ts`
- `checkSocketFeatureClientOutcome.lib.test.ts`
- `eligibility.paid-override.test.ts`
- `feature-flags.action.test.ts`
- subscription/tournament gate tests switched to DB-backed paywall toggle

Regression coverage includes the original prod symptom:

- global feature ON + paywall OFF + free club
- expected result: feature is enabled (no client short-circuit false negative)
