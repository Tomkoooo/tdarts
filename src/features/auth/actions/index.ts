'use server';

import { withTelemetry } from '@/shared/lib/withTelemetry';
import { authorizeUserResult, assertEligibilityResult } from '@/shared/lib/guards';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';

export const getAuthorizedSessionAction = withTelemetry('auth.getAuthorizedSession', async (input: void) => {
  void input;
  const authResult = await authorizeUserResult();
  if (!authResult.ok) {
    return authResult;
  }

  const eligibilityResult = await assertEligibilityResult({ allowPaidOverride: true });
  if (!eligibilityResult.ok) {
    return eligibilityResult;
  }

  return authResult.data;
}, {
  method: 'ACTION',
  metadata: {
    feature: 'auth',
    actionName: 'getAuthorizedSession',
  },
  resolveStatus: resolveGuardAwareStatus,
});
