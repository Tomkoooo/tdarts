'use server';

import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { TeamInvitationService } from '@/database/services/teaminvitation.service';
import { UserModel } from '@/database/models/user.model';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { connectMongo } from '@/lib/mongoose';

export async function getPendingInvitationsAction() {
  const run = withTelemetry(
    'profile.getPendingInvitations',
    async () => {
      const authResult = await authorizeUserResult();
      if (!authResult.ok) {
        return authResult;
      }

      await connectMongo();
      const user = await UserModel.findById(authResult.data.userId).select('email');
      const email = user?.email;

      const invitations = await TeamInvitationService.getPendingInvitationsForUser(
        authResult.data.userId,
        email
      );

      const data = invitations.map((inv: any) => ({
        _id: inv._id?.toString(),
        token: inv.token,
        createdAt: inv.createdAt?.toISOString?.() || '',
        expiresAt: inv.expiresAt?.toISOString?.() || '',
        tournament: {
          tournamentId: inv.tournamentId?.tournamentId || inv.tournamentId,
          name: inv.tournamentId?.tournamentSettings?.name || 'Tournament',
        },
        team: {
          _id: inv.teamId?._id?.toString(),
          name: inv.teamId?.name || 'Team',
        },
        inviter: {
          _id: inv.inviterId?._id?.toString(),
          name: inv.inviterId?.name || '',
          email: inv.inviterId?.email || '',
        },
        invitee: inv.inviteeId
          ? {
              _id: inv.inviteeId?._id?.toString(),
              name: inv.inviteeId?.name,
              email: inv.inviteeId?.email,
            }
          : undefined,
      }));

      return {
        success: true,
        data: {
          count: invitations.length,
          invitations: data,
        },
      };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'profile', actionName: 'getPendingInvitations' },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(undefined);
}
