import { TournamentService, AuthorizationService } from '@tdarts/services';
import { authorizeUserResult } from '@/shared/lib/guards';

export async function assertBoardAccess(params: {
  tournamentId: string;
  password?: string;
}): Promise<void> {
  const authResult = await authorizeUserResult();
  if (authResult.ok) {
    const status = await TournamentService.getPlayerStatusInTournament(
      params.tournamentId,
      authResult.data.userId
    );
    if (status === 'checked-in') {
      return;
    }

    try {
      const { clubId } = await TournamentService.getTournamentRoleContext(params.tournamentId);
      const [isPrivileged, isGlobalAdmin] = await Promise.all([
        AuthorizationService.checkAdminOrModerator(authResult.data.userId, clubId),
        AuthorizationService.isGlobalAdmin(authResult.data.userId),
      ]);
      if (isPrivileged || isGlobalAdmin) {
        return;
      }
    } catch {
      // Ignore role check failures and continue to password fallback.
    }
  }

  if (params.password) {
    const ok = await TournamentService.validateTournamentByPassword(
      params.tournamentId,
      params.password
    );
    if (ok) {
      return;
    }
  }

  throw new Error('Unauthorized board access');
}
