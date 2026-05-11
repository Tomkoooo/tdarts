/**
 * Server-only re-export: do NOT import from client components.
 * The paywall toggle now lives in the SystemSettings DB doc; reading it
 * requires a Mongo round-trip (with cache) and therefore returns Promise<boolean>.
 *
 * Client components should call a server action that returns the value, or use
 * the runtime `/api/runtime/socket-config` endpoint for socket-specific gating.
 */
export { isSubscriptionPaywallEnabled as isSubscriptionPaywallActive } from '@tdarts/core/system-settings';
