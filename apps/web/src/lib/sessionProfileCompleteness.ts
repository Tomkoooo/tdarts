import { isUserCountryCompleteForOnboarding } from '@tdarts/core/profile-country';

/** Matches {@link HomeProfileCompletenessIssue} without importing client-marked UI types on the server. */
export type SessionProfileCompletenessIssue = 'photo' | 'country' | 'terms';

function hasAcceptedTerms(termsAcceptedAt?: string | null): boolean {
  if (termsAcceptedAt == null || termsAcceptedAt === '') return false;
  const d = new Date(termsAcceptedAt);
  return !Number.isNaN(d.getTime());
}

/**
 * Profile items required for legal/onboarding, derived from the same session/JWT user
 * snapshot as {@link getServerUser}. Use with stats-based completeness (photo, etc.)
 * so the home dashboard stays consistent when cached stats lag or omit fields.
 */
export function sessionProfileGateIssues(input: {
  termsAcceptedAt?: string | null;
  country?: string | null;
}): SessionProfileCompletenessIssue[] {
  const issues: SessionProfileCompletenessIssue[] = [];
  if (!hasAcceptedTerms(input.termsAcceptedAt)) issues.push('terms');
  if (!isUserCountryCompleteForOnboarding(input.country ?? null)) issues.push('country');
  return issues;
}

export function mergeHomeProfileCompletenessIssues(
  fromStats: SessionProfileCompletenessIssue[],
  fromSessionGate: SessionProfileCompletenessIssue[],
): { issues: SessionProfileCompletenessIssue[]; count: number } {
  const set = new Set<SessionProfileCompletenessIssue>([...fromStats, ...fromSessionGate]);
  const issues = Array.from(set);
  return { issues, count: issues.length };
}
