import { TournamentModel } from '@tdarts/core';

export async function findTournamentByCode(code: string) {
  return TournamentModel.findOne({ tournamentId: code }).select('clubId');
}
