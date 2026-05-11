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
  },
  subscriptionPaywallEnabled: boolean,
  superAdminBypassEnabled: boolean,
  updatedAt: Date,
  updatedBy: string | null,
}
```

Default seed values:

- all feature toggles: `true`
- `subscriptionPaywallEnabled`: `false`
- `superAdminBypassEnabled`: `true`

These defaults preserve current production behavior while fixing runtime drift.

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

## Admin controls

Admin settings page now includes:

1. **Feature Flags**
   - per-feature runtime toggles
2. **Access Control**
   - Subscription Paywall toggle
   - Super Admin Bypass toggle

Server actions:

- `adminGetSystemSettingsAction`
- `adminUpdateFeatureFlagAction`
- `adminUpdateSubscriptionPaywallAction`
- `adminUpdateSuperAdminBypassAction`

All admin writes require global-admin authorization and emit telemetry.

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
