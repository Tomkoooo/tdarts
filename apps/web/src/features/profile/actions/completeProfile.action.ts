'use server';

import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { ProfileService } from '@tdarts/services';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';

const schema = z.object({
  acceptTerms: z.boolean().refine((v) => v === true, { message: 'Az elfogadás kötelező' }),
  country: z.string().min(2).max(2).optional(),
});

export async function completeProfileAction(input: { acceptTerms: boolean; country?: string }) {
  const run = withTelemetry(
    'profile.completeProfile',
    async (payload: { acceptTerms: boolean; country?: string }) => {
      const authResult = await authorizeUserResult();
      if (!authResult.ok) {
        return authResult;
      }

      const parsed = schema.safeParse({
        acceptTerms: payload.acceptTerms === true,
        country: payload.country,
      });
      if (!parsed.success) {
        return {
          ok: false as const,
          code: 'BAD_REQUEST' as const,
          status: 400,
          message: 'Invalid payload',
        };
      }

      const uid = authResult.data.userId;
      await ProfileService.completeLegalAndCountry(uid, {
        acceptTerms: true,
        ...(parsed.data.country !== undefined ? { country: parsed.data.country } : {}),
      });
      revalidateTag('home:stats', 'max');
      revalidateTag(`home:stats:${uid}`, 'max');
      return { ok: true as const };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'profile', actionName: 'completeProfile' },
      resolveStatus: resolveGuardAwareStatus,
    },
  );

  return run(input);
}
