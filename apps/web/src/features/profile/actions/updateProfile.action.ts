'use server';

import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { ProfileService } from '@/database/services/profile.service';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';

const updateProfileSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  country: z.string().nullable().optional(),
  locale: z.enum(['hu', 'en', 'de']).optional(),
  profilePicture: z.string().nullable().optional(),
  publicConsent: z.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export async function updateProfileAction(updates: UpdateProfileInput) {
  const run = withTelemetry(
    'profile.updateProfile',
    async (payload: UpdateProfileInput) => {
      const authResult = await authorizeUserResult();
      if (!authResult.ok) {
        return authResult;
      }

      const parsed = updateProfileSchema.safeParse(payload);
      if (!parsed.success) {
        return {
          ok: false as const,
          code: 'BAD_REQUEST' as const,
          status: 400,
          message: parsed.error.issues[0]?.message || 'Invalid payload',
        };
      }

      const { confirmPassword, ...rest } = parsed.data;
      if (rest.password && rest.password !== confirmPassword) {
        return {
          ok: false as const,
          code: 'BAD_REQUEST' as const,
          status: 400,
          message: 'Passwords do not match',
        };
      }

      const user = await ProfileService.updateProfile(authResult.data.userId, rest);
      const uid = authResult.data.userId;
      revalidateTag('home:stats', 'max');
      revalidateTag(`home:stats:${uid}`, 'max');
      return {
        success: true,
        message: 'Profile updated successfully',
        user: {
          _id: user._id.toString(),
          email: user.email,
          name: user.name,
          username: user.username,
          isVerified: user.isVerified,
          country: user.country,
          locale: user.locale,
        },
      };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'profile', actionName: 'updateProfile' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(updates);
}
