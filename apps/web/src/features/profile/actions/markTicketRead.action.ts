'use server';

import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { FeedbackService } from '@/database/services/feedback.service';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { BadRequestError } from '@/middleware/errorHandle';

type Input = { ticketId: string };

export async function markTicketReadAction(input: Input) {
  const run = withTelemetry(
    'profile.markTicketRead',
    async (params: Input) => {
      if (!params.ticketId) {
        throw new BadRequestError('ticketId is required');
      }

      const authResult = await authorizeUserResult();
      if (!authResult.ok) return authResult;

      const ticket = await FeedbackService.getFeedbackById(params.ticketId);
      if (!ticket) {
        return {
          success: false,
          status: 404,
          code: 'TICKET_NOT_FOUND',
          message: 'Ticket not found',
        };
      }

      if (String(ticket.userId) !== authResult.data.userId) {
        return {
          success: false,
          status: 403,
          code: 'PERMISSION_REQUIRED',
          message: 'Forbidden',
        };
      }

      await FeedbackService.updateFeedback(
        params.ticketId,
        { isReadByUser: true },
        authResult.data.userId
      );

      return { success: true };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'profile', actionName: 'markTicketRead' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(input);
}
