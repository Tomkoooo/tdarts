'use server';

import { PostService } from '@/database/services/post.service';
import { z } from 'zod';
import { authorizeUserResult, assertEligibilityResult } from '@/shared/lib/guards';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';

const schema = z.object({
  clubId: z.string(),
  title: z.string().min(1),
  content: z.string(),
  images: z.array(z.string()).optional(),
  video: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function createPostAction(input: z.infer<typeof schema>) {
  const run = withTelemetry(
    'clubs.createPost',
    async (params: z.infer<typeof schema>) => {
      const parsed = schema.safeParse(params);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
      }
      const { clubId, title, content, images, video, tags } = parsed.data;
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      const eligibilityResult = await assertEligibilityResult({ clubId, allowPaidOverride: true });
      if (!eligibilityResult.ok) return eligibilityResult;
      return PostService.createPost(clubId, authResult.data.userId, {
        title,
        content,
        images,
        video,
        tags: tags || [],
      });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'clubs', actionName: 'createPost', clubId: input.clubId },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}
