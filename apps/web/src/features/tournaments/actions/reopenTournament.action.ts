'use server';

import { z } from 'zod';
import { TournamentService } from '@tdarts/services';
import { authorizeUserResult } from '@/shared/lib/guards';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { connectMongo } from '@/lib/mongoose';
import { AuthorizationService } from '@tdarts/services';
import { BadRequestError } from '@/middleware/errorHandle';
import { serializeForClient } from '@/shared/lib/serializeForClient';
import { revalidateTag } from 'next/cache';

const schema = z.object({
  code: z.string().min(1),
});

export async function reopenTournamentAction(input: z.infer<typeof schema>) {
  const run = withTelemetry(
    'tournaments.reopen',
    async (params: z.infer<typeof schema>) => {
      const parsed = schema.safeParse(params);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
      }

      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;

      await connectMongo();
      const isGlobalAdmin = await AuthorizationService.isGlobalAdmin(authResult.data.userId);
      if (!isGlobalAdmin) {
        return {
          ok: false as const,
          code: 'UNAUTHORIZED' as const,
          status: 403 as const,
          message: 'Only global admins can reopen tournaments',
        };
      }

      const tournament = await TournamentService.reopenTournament(parsed.data.code, authResult.data.userId);
      revalidateTag(`tournament:${parsed.data.code}`, 'max');
      revalidateTag(`tournament:stable:${parsed.data.code}`, 'max');
      revalidateTag(`tournament:volatile:${parsed.data.code}`, 'max');
      revalidateTag('search', 'max');
      revalidateTag('home:tournaments', 'max');
      return serializeForClient({ success: true, tournament });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'tournaments', actionName: 'reopenTournament' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(input);
}
