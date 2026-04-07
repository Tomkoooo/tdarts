'use server';

import { z } from 'zod';
import { ClubService } from '@/database/services/club.service';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';

const listSelectedTournamentsShareLinksSchema = z.object({
  clubId: z.string().min(1),
});

export type ListSelectedTournamentsShareLinksActionInput = z.infer<
  typeof listSelectedTournamentsShareLinksSchema
>;

export async function listSelectedTournamentsShareLinksAction(
  input: ListSelectedTournamentsShareLinksActionInput
) {
  const run = withTelemetry(
    'clubs.listSelectedTournamentsShareLinks',
    async (params: ListSelectedTournamentsShareLinksActionInput) => {
      const parsed = listSelectedTournamentsShareLinksSchema.safeParse(params);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid list selected tournaments payload');
      }
      return ClubService.listSelectedTournamentsShareTokens(parsed.data.clubId);
    },
    {
      method: 'ACTION',
      metadata: { feature: 'clubs', actionName: 'listSelectedTournamentsShareLinks' },
    }
  );

  return run(input);
}
