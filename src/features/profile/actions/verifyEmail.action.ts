'use server';

import { z } from 'zod';
import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { ProfileService } from '@/database/services/profile.service';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';

const verifyEmailSchema = z.object({
  code: z.string().min(1),
});

export async function verifyEmailAction(input: { code: string }) {
  const run = withTelemetry(
    'profile.verifyEmail',
    async (payload: { code: string }) => {
      const authResult = await authorizeUserResult();
      if (!authResult.ok) {
        return authResult;
      }

      const parsed = verifyEmailSchema.safeParse(payload);
      if (!parsed.success) {
        return {
          ok: false as const,
          code: 'BAD_REQUEST' as const,
          status: 400,
          message: 'Verification code is required',
        };
      }

      await ProfileService.verifyEmail(authResult.data.userId, parsed.data.code);
      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'profile', actionName: 'verifyEmail' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(input);
}
