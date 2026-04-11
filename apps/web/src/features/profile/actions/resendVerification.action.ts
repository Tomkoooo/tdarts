'use server';

import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { AuthService } from '@tdarts/services';
import { UserModel } from '@tdarts/core';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { connectMongo } from '@/lib/mongoose';

export async function resendVerificationAction() {
  const run = withTelemetry(
    'profile.resendVerification',
    async () => {
      const authResult = await authorizeUserResult();
      if (!authResult.ok) {
        return authResult;
      }

      await connectMongo();
      const user = await UserModel.findById(authResult.data.userId);
      if (!user) {
        return {
          ok: false as const,
          code: 'NOT_FOUND' as const,
          status: 404,
          message: 'User not found',
        };
      }

      await AuthService.sendVerificationEmail(user);
      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'profile', actionName: 'resendVerification' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(undefined);
}
