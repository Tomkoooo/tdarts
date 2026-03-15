'use server';

import { PostService } from '@/database/services/post.service';
import { z } from 'zod';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';

const schema = z.object({
  clubId: z.string(),
  postId: z.string(),
});

export async function getClubPostAction(input: z.infer<typeof schema>) {
  const run = withTelemetry(
    'clubs.getClubPost',
    async (params: z.infer<typeof schema>) => {
      const parsed = schema.safeParse(params);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
      }
      const { clubId, postId } = parsed.data;
      const post = await PostService.getPostById(postId, clubId);
      return post;
    },
    { method: 'ACTION', metadata: { feature: 'clubs', actionName: 'getClubPost', clubId: input.clubId } }
  );
  return run(input);
}
