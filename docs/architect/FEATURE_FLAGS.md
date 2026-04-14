# Feature Flag & Subscription Tier System

## Architecture Overview

Two separate systems control access:

1. **Feature flags** -- toggle product features (socket, leagues, statistics) via env vars + tier entitlements
2. **Subscription quotas** -- limit tournament creation per month based on club tier + OAC weekly limit based on `club.verified`

These are independent. Tournament creation is NOT behind a feature flag.

## Single Source of Truth: `TIER_CONFIG`

Defined in `packages/core/src/lib/subscription-tiers.ts`. Every tier's limits and feature entitlements come from here.

| Tier       | Live/month | Sandbox/month | Leagues | Live Tracking | Detailed Stats |
|------------|-----------|---------------|---------|---------------|----------------|
| free       | 0         | 5             | no      | no            | no             |
| basic      | 2         | unlimited     | yes     | no            | no             |
| pro        | 4         | unlimited     | yes     | no            | yes            |
| enterprise | unlimited | unlimited     | yes     | yes           | yes            |

Consumers: `SubscriptionService`, `FeatureFlagService`, `PricingSection.tsx`.

## Tournament Creation Gating

Tournament creation uses auth + subscription quotas, NOT feature flags.

Flow:
1. **Auth + permission** -- user must be admin/moderator of the club
2. **Subscription quota** (only when `NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED=true`):
   - Free tier: sandbox only (max 5/month), live blocked
   - Basic: 2 live/month, unlimited sandbox
   - Pro: 4 live/month, unlimited sandbox
   - Enterprise: unlimited
3. **OAC/verified** -- based on `club.verified === true` (NOT tier), max 1 per week (Mon–Sat)

OAC tournaments do not count toward live or sandbox monthly limits.

## Feature Flag System

### Environment Variables

Each feature has an env var defined in the feature registry (`apps/web/src/features/flags/lib/featureRegistry.ts`):

| Feature              | Env Var                                  | Default |
|----------------------|------------------------------------------|---------|
| SOCKET               | `NEXT_PUBLIC_ENABLE_SOCKET`              | false   |
| LIVE_MATCH_FOLLOWING | `NEXT_PUBLIC_ENABLE_LIVE_MATCH_FOLLOWING` | false   |
| LEAGUES              | `NEXT_PUBLIC_ENABLE_LEAGUES`             | false   |
| DETAILED_STATISTICS  | `NEXT_PUBLIC_ENABLE_DETAILED_STATISTICS`  | false   |
| ADVANCED_STATISTICS  | `NEXT_PUBLIC_ENABLE_ADVANCED_STATISTICS`  | false   |
| OAC_CREATION         | `NEXT_PUBLIC_ENABLE_OAC_CREATION`        | true    |

`NEXT_PUBLIC_ENABLE_ALL=true` bypasses all individual env checks (dev only).

### Paywall Off (NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED != 'true')

When the paywall is off, each feature's `paywallOffBehavior` from the registry applies:
- `allow` -- feature is available to everyone (SOCKET, LEAGUES, LIVE_MATCH_FOLLOWING, OAC_CREATION)
- `check_club_flag` -- still checks `club.featureFlags` (DETAILED_STATISTICS, ADVANCED_STATISTICS)

### Paywall On

When the paywall is on, features check `TIER_CONFIG[club.subscriptionModel].features`:
- If the tier doesn't include the feature entitlement, access is denied
- If the feature also has a `clubFlagKey`, the club must have that flag set to `true`

### Production Env Vars (.env.prod)

```
NEXT_PUBLIC_ENABLE_LEAGUES=true
NEXT_PUBLIC_ENABLE_SOCKET=true
NEXT_PUBLIC_ENABLE_OAC_CREATION=true
NEXT_PUBLIC_ENABLE_DETAILED_STATISTICS=true
NEXT_PUBLIC_ENABLE_LIVE_MATCH_FOLLOWING=true
NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED=false
```

## Adding a New Feature

1. Add the key to `FEATURE_KEYS` in `featureKeys.ts`
2. Add a `FeatureDefinition` entry in `featureRegistry.ts` (env var, tier entitlement, club flag, paywall-off behavior)
3. If the feature is tier-gated, add it to `TierFeatures` in `subscription-tiers.ts` and set values per tier
4. Add the env var to `.env.prod` and `.env`
5. Add tests in `feature-flags-subscription.matrix.lib.test.ts`

## Adding a New Tier

1. Add the tier to `TierId` union and `TIER_CONFIG` in `subscription-tiers.ts`
2. Add to club model's `subscriptionModel` enum
3. Add to `TIER_META` in `PricingSection.tsx`
4. Add tests in `subscription-tiers.test.ts`

## Tests

- `subscription-tiers.test.ts` -- tier config integrity, per-tier create/update limits, sandbox limits, OAC weekly limit
- `feature-flags-subscription.matrix.lib.test.ts` -- feature registry completeness, production env mirror, tier-based entitlements, missing env var handling
