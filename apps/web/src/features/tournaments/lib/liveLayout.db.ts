import { TournamentModel } from '@tdarts/core/models/tournament';

export async function findTournamentByCode(code: string) {
  return TournamentModel.findOne({ tournamentId: code }).select('clubId');
}
