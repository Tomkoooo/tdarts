import { TournamentModel } from '@/database/models/tournament.model';

export async function findTournamentByCode(code: string) {
  return TournamentModel.findOne({ tournamentId: code }).select('clubId');
}
