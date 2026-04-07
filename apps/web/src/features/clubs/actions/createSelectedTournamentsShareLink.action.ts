'use server';

import { z } from 'zod';
import { ClubService } from '@/database/services/club.service';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';

const createSelectedTournamentsShareLinkSchema = z.object({
  clubId: z.string().min(1),
  tournamentIds: z.array(z.string().min(1)).min(1),
});

export type CreateSelectedTournamentsShareLinkActionInput = z.infer<
  typeof createSelectedTournamentsShareLinkSchema
>;

export async function createSelectedTournamentsShareLinkAction(
  input: CreateSelectedTournamentsShareLinkActionInput
) {
  const run = withTelemetry(
    'clubs.createSelectedTournamentsShareLink',
    async (params: CreateSelectedTournamentsShareLinkActionInput) => {
      const parsed = createSelectedTournamentsShareLinkSchema.safeParse(params);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid selected tournaments share payload');
      }
      const token = await ClubService.createSelectedTournamentsShareToken(parsed.data.clubId, parsed.data.tournamentIds);
      return { token };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'clubs', actionName: 'createSelectedTournamentsShareLink' },
    }
  );

  return run(input);
}
