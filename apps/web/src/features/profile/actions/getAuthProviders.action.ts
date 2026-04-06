'use server';

import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { UserModel } from '@/database/models/user.model';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { connectMongo } from '@/lib/mongoose';

export type AuthProvidersResult = {
  googleLinked: boolean;
  hasPassword: boolean;
  emailVerified: boolean;
  canUnlinkGoogle: boolean;
};

export async function getAuthProvidersAction() {
  const run = withTelemetry(
    'profile.getAuthProviders',
    async () => {
      const authResult = await authorizeUserResult();
      if (!authResult.ok) {
        return authResult;
      }

      await connectMongo();
      const user = await UserModel.findById(authResult.data.userId).select(
        '+password googleId isVerified'
      );
      if (!user) {
        return {
          ok: false as const,
          code: 'NOT_FOUND' as const,
          status: 404,
          message: 'User not found',
        };
      }

      const googleLinked = !!user.googleId;
      const hasPassword = !!(user as any).password;
      const emailVerified = !!user.isVerified;
      const canUnlinkGoogle = emailVerified && hasPassword;

      return {
        success: true,
        data: {
          googleLinked,
          hasPassword,
          emailVerified,
          canUnlinkGoogle,
        },
      };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'profile', actionName: 'getAuthProviders' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(undefined);
}
