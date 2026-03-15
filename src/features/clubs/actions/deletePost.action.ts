'use server';

import { PostService } from '@/database/services/post.service';
import { z } from 'zod';
import { authorizeUserResult, assertEligibilityResult } from '@/shared/lib/guards';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';

const schema = z.object({
  clubId: z.string(),
  postId: z.string(),
});

export async function deletePostAction(input: z.infer<typeof schema>) {
  const run = withTelemetry(
    'clubs.deletePost',
    async (params: z.infer<typeof schema>) => {
      const parsed = schema.safeParse(params);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid input');
      }
      const { clubId, postId } = parsed.data;
      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;
      const eligibilityResult = await assertEligibilityResult({ clubId, allowPaidOverride: true });
      if (!eligibilityResult.ok) return eligibilityResult;
      await PostService.deletePost(postId);
    },
    {
      method: 'ACTION',
      metadata: { feature: 'clubs', actionName: 'deletePost', clubId: input.clubId },
      resolveStatus: resolveGuardAwareStatus,
    }
  );
  return run(input);
}
