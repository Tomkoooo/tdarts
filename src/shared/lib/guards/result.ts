import { GuardFailureResult } from '@/shared/lib/telemetry/types';

type StatusResult = {
  status?: unknown;
};

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
