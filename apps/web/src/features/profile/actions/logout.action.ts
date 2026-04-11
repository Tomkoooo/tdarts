'use server';

import { cookies } from 'next/headers';
import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { ProfileService } from '@tdarts/services';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';

export async function logoutAction() {
  const run = withTelemetry(
    'profile.logout',
    async () => {
      const authResult = await authorizeUserResult();
      if (!authResult.ok) {
        return authResult;
      }
      await ProfileService.logout(authResult.data.userId);
      const cookieStore = await cookies();
      cookieStore.set('token', '', { maxAge: 0, path: '/' });
      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'profile', actionName: 'logout' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(undefined);
}
