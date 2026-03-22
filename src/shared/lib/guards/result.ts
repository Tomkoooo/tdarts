import type { GuardFailureResult } from '@/shared/lib/telemetry/types';

type StatusResult = {
  status?: unknown;
};

/** Maps guard failures from feature-flag (and similar) checks to UI messaging */
export type FeatureFlagDenialReason = 'login_required' | 'feature_disabled';

export function isGuardFailureResult(value: unknown): value is GuardFailureResult {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<GuardFailureResult>;
  return (
    candidate.ok === false &&
    (candidate.code === 'UNAUTHORIZED' || candidate.code === 'FEATURE_DISABLED') &&
    (candidate.status === 401 || candidate.status === 403) &&
    typeof candidate.message === 'string'
  );
}

export function guardFailureToFeatureFlagDenial(value: unknown): FeatureFlagDenialReason | null {
  if (!isGuardFailureResult(value)) {
    return null;
  }
  if (value.code === 'UNAUTHORIZED') {
    return 'login_required';
  }
  if (value.code === 'FEATURE_DISABLED') {
    return 'feature_disabled';
  }
  return null;
}

export function resolveGuardAwareStatus(result: unknown): number {
  if (isGuardFailureResult(result)) {
    return result.status;
  }

  if (!result || typeof result !== 'object') {
    return 200;
  }

  const maybeStatus = (result as StatusResult).status;
  return typeof maybeStatus === 'number' ? maybeStatus : 200;
}
