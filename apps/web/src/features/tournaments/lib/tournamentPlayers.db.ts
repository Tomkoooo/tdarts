import { Types } from 'mongoose';
import { PlayerModel, TournamentModel, UserModel } from '@tdarts/core';

export async function findTournamentForAuth(code: string) {
  return TournamentModel.findOne({ tournamentId: code }).select('clubId tournamentSettings tournamentPlayers');
}

export async function findTournamentForInvitation(code: string) {
  return TournamentModel.findOne({ tournamentId: code }).select('clubId tournamentSettings');
}

export async function findPlayerById(playerId: string) {
  return PlayerModel.findById(playerId);
}

export async function findPlayerWithRelations(playerId: string) {
  return PlayerModel.findById(playerId).select('userRef members');
}

export async function findPlayersByIds(playerIds: Types.ObjectId[]) {
  return PlayerModel.find({ _id: { $in: playerIds } }).select('userRef');
}

export async function findUserById(userId: string | Types.ObjectId) {
  return UserModel.findById(userId);
}

export async function findUserByEmail(email: string) {
  return UserModel.findOne({ email: email.toLowerCase() });
}

export async function pushWaitingListEntry(code: string, playerId: string, note: string) {
  return TournamentModel.findOneAndUpdate(
    { tournamentId: code },
    {
      $push: {
        waitingList: {
          playerReference: playerId,
          addedAt: new Date(),
          note,
        },
      },
    }
  );
}
