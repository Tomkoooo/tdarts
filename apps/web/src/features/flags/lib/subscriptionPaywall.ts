/**
 * Re-export from the core subpath only — do not import `@tdarts/core` barrel here.
 * Client components (e.g. FeatureFlagService → CreateTournamentModal) would otherwise
 * bundle nodemailer and break Turbopack (child_process / dns).
 */
export { isSubscriptionPaywallActive } from '@tdarts/core/subscription-paywall';
