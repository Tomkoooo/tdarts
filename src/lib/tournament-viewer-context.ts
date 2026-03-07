import { AuthService } from '@/database/services/auth.service';
import { ClubService } from '@/database/services/club.service';
import { TournamentService } from '@/database/services/tournament.service';

export type TournamentViewerContext = {
  userClubRole: 'admin' | 'moderator' | 'member' | 'none';
  userPlayerStatus: 'applied' | 'checked-in' | 'none';
};

export const EMPTY_TOURNAMENT_VIEWER_CONTEXT: TournamentViewerContext = {
  userClubRole: 'none',
  userPlayerStatus: 'none',
};

export async function getTournamentViewerContextForUser(
  code: string,
  userId: string
): Promise<TournamentViewerContext> {
  const { clubId } = await TournamentService.getTournamentRoleContext(code);
  const [userClubRole, userPlayerStatus] = await Promise.all([
    ClubService.getUserRoleInClub(userId, clubId),
    TournamentService.getPlayerStatusInTournament(code, userId),
  ]);

  return {
    userClubRole: (userClubRole || 'none') as TournamentViewerContext['userClubRole'],
    userPlayerStatus: (userPlayerStatus || 'none') as TournamentViewerContext['userPlayerStatus'],
  };
}

export async function getTournamentViewerContextFromToken(
  code: string,
  token: string
): Promise<TournamentViewerContext> {
  const user = await AuthService.verifyToken(token);
  return getTournamentViewerContextForUser(code, user._id.toString());
}
