'use server';

import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { FeedbackService } from '@/database/services/feedback.service';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { BadRequestError } from '@/middleware/errorHandle';
import { serializeForClient } from '@/shared/lib/serializeForClient';

type Input = { ticketId: string; content: string };

export async function replyTicketAction(input: Input) {
  const run = withTelemetry(
    'profile.replyTicket',
    async (params: Input) => {
      if (!params.ticketId) {
        throw new BadRequestError('ticketId is required');
      }
      if (!params.content?.trim()) {
        throw new BadRequestError('content is required');
      }

      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;

      const ticket = await FeedbackService.getFeedbackById(params.ticketId);
      if (!ticket) {
        throw new BadRequestError('Ticket not found');
      }
      if (String(ticket.userId) !== authResult.data.userId) {
        throw new BadRequestError('Forbidden');
      }
      if (ticket.status === 'closed') {
        throw new BadRequestError('Ticket is closed');
      }

      const updated = await FeedbackService.addMessage(
        params.ticketId,
        { sender: authResult.data.userId, content: params.content.trim(), isInternal: false },
        true
      );

      return serializeForClient({ success: true, data: updated });
    },
    {
      method: 'ACTION',
      metadata: { feature: 'profile', actionName: 'replyTicket' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(input);
}
