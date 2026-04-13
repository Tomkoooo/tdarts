/**
 * Subscription paywall / usage quotas (monthly tournament limits, sandbox rules) are opt-in:
 * only explicit `NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED=true` enables them.
 * Aligns feature-flag entitlement checks in the web app with `@tdarts/services` SubscriptionService.
 */
export function isSubscriptionPaywallActive(): boolean {
  return process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED === 'true';
}
