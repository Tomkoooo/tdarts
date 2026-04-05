import {
  guardFailureToFeatureFlagDenial,
  isGuardFailureResult,
  resolveGuardAwareStatus,
} from '@/shared/lib/guards/result';

describe('guards/result', () => {
  it('identifies guard failures correctly', () => {
    expect(
      isGuardFailureResult({
        ok: false,
        code: 'UNAUTHORIZED',
        status: 401,
        message: 'Unauthorized',
      })
    ).toBe(true);
    expect(isGuardFailureResult({ ok: true })).toBe(false);
  });

  it('resolves status from guard result and generic status objects', () => {
    expect(
      resolveGuardAwareStatus({
        ok: false,
        code: 'FEATURE_DISABLED',
        status: 403,
        message: 'Feature disabled',
      })
    ).toBe(403);
    expect(resolveGuardAwareStatus({ status: 418 })).toBe(418);
    expect(resolveGuardAwareStatus(undefined)).toBe(200);
  });

  it('maps guard failures to feature-flag denial reasons', () => {
    expect(
      guardFailureToFeatureFlagDenial({
        ok: false,
        code: 'UNAUTHORIZED',
        status: 401,
        message: 'Unauthorized',
      })
    ).toBe('login_required');
    expect(
      guardFailureToFeatureFlagDenial({
        ok: false,
        code: 'FEATURE_DISABLED',
        status: 403,
        message: 'Feature disabled',
      })
    ).toBe('feature_disabled');
    expect(guardFailureToFeatureFlagDenial({ ok: true })).toBeNull();
  });
});
