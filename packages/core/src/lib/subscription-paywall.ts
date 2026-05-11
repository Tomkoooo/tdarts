/**
 * Backward-compatible entry point for `@tdarts/core/subscription-paywall`.
 *
 * **Semantics:** `isSubscriptionPaywallActive` is an alias of
 * {@link import('./system-settings').isSubscriptionPaywallEnabled}. It reads the
 * **MongoDB `SystemSettings` singleton** (`subscriptionPaywallEnabled`) with the
 * same cache/seed behavior as the rest of system settings.
 *
 * **Not env:** This is **not** `NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED` or any
 * build-inlined flag. It is async, server-oriented, and reflects what admins set
 * in runtime settings.
 *
 * **Callers:** Always `await isSubscriptionPaywallActive()` (or the
 * `isSubscriptionPaywallEnabled` name); do not treat it as a synchronous env read.
 */
export { isSubscriptionPaywallEnabled as isSubscriptionPaywallActive } from './system-settings';
