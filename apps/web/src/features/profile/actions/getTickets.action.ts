'use server';

import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';

function mapFeedbackStatusToTicketStatus(
  status: string
): 'open' | 'closed' | 'replied' {
  if (status === 'resolved' || status === 'rejected' || status === 'closed')
    return 'closed';
  if (status === 'in-progress') return 'replied';
  return 'open';
}
import { FeedbackService } from '@tdarts/services';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { serializeForClient } from '@/shared/lib/serializeForClient';

export async function getTicketsAction() {
  const run = withTelemetry(
    'profile.getTickets',
    async () => {
      const authResult = await authorizeUserResult();
      if (!authResult.ok) {
        return authResult;
      }
      const rawTickets = await FeedbackService.getFeedbackByUserId(authResult.data.userId);
      const tickets = rawTickets.map((t: any) => {
        const obj = typeof t.toObject === 'function' ? t.toObject() : t;
        return {
          ...obj,
          id: (obj._id || t._id)?.toString?.(),
          subject: obj.title || obj.description?.slice?.(0, 50) || 'Ticket',
          status: mapFeedbackStatusToTicketStatus(obj.status || t.status),
          priority: obj.priority || t.priority || 'medium',
        };
      });
      return serializeForClient({ success: true, data: tickets });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'profile', actionName: 'getTickets' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(undefined);
}
