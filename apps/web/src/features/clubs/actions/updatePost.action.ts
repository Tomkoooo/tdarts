'use server';

import { PostService } from '@tdarts/services';
import { z } from 'zod';
import { authorizeUserResult, assertEligibilityResult } from '@/shared/lib/guards';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';

const schema = z.object({
  clubId: z.string(),
  postId: z.string(),
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  images: z.array(z.string()).optional(),
  video: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function updatePostAction(input: z.infer<typeof schema>) {
  const run = withTelemetry(
    'clubs.updatePost',
    async (params: z.infer<typeof schema>) => {
      const parsed = schema.safeParse(params);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
      }
      const { clubId, postId, title, content, images, video, tags } = parsed.data;
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      const eligibilityResult = await assertEligibilityResult({ clubId, allowPaidOverride: true });
      if (!eligibilityResult.ok) return eligibilityResult;
      const postData: Parameters<typeof PostService.updatePost>[1] = {};
      if (title !== undefined) postData.title = title;
      if (content !== undefined) postData.content = content;
      if (images !== undefined) postData.images = images;
      if (video !== undefined) postData.video = video;
      if (tags !== undefined) postData.tags = tags;
      return PostService.updatePost(postId, postData);
    },
    {
      method: 'ACTION',
      metadata: { feature: 'clubs', actionName: 'updatePost', clubId: input.clubId },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}
