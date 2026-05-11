/**
 * Backward-compatible facade. The paywall flag now lives in the SystemSettings
 * singleton document (see {@link import('./system-settings').isSubscriptionPaywallEnabled}).
 *
 * This async function is the canonical way to read the paywall toggle from
 * server code. Callers must `await` it; reading from `process.env` directly
 * is unsafe because Next.js inlines `NEXT_PUBLIC_*` at build time.
 */
export { isSubscriptionPaywallEnabled as isSubscriptionPaywallActive } from './system-settings';
