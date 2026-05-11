/**
 * Server-only re-export: do NOT import from client components.
 * Same as `@tdarts/core/subscription-paywall`: `isSubscriptionPaywallActive` is an
 * alias of `isSubscriptionPaywallEnabled` — **async**, backed by **SystemSettings**
 * in MongoDB, not `NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED` or any env var.
 *
 * Client components should call a server action that returns the value, or use
 * the runtime `/api/runtime/socket-config` endpoint for socket-specific gating.
 */
export { isSubscriptionPaywallEnabled as isSubscriptionPaywallActive } from '@tdarts/core/system-settings';
