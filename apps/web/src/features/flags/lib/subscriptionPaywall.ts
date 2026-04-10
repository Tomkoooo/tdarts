/**
 * Subscription paywall / tier checks are opt-in: only explicit `NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED=true`
 * enables subscription-tier gating. Unset or any other value matches billing (`subscription.service.ts`).
 */
export function isSubscriptionPaywallActive(): boolean {
  return process.env.NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED === 'true';
}
