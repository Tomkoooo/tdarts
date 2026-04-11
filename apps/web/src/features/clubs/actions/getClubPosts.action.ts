'use server';

import { PostService } from '@tdarts/services';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { serializeForClient } from '@/shared/lib/serializeForClient';

export type GetClubPostsActionInput = {
  clubId: string;
  page?: number;
  limit?: number;
  requestId?: string;
};

export async function getClubPostsAction(input: GetClubPostsActionInput) {
  const run = withTelemetry(
    'clubs.getClubPosts',
    async (params: GetClubPostsActionInput) => {
      const { clubId, page = 1, limit = 10, requestId } = params;
      if (!clubId) {
        throw new BadRequestError('clubId is required');
      }
      const posts = await PostService.getClubPosts(clubId, page, limit, requestId);
      return serializeForClient(posts);
    },
    { method: 'ACTION', metadata: { feature: 'clubs', actionName: 'getClubPosts' } }
  );

  return run(input);
}
