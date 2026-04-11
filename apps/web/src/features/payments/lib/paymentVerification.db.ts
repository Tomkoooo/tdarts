import { PendingTournamentModel, TournamentModel, LeagueModel } from '@tdarts/core';

export async function findTournamentByStripeSessionId(sessionId: string) {
  return TournamentModel.findOne({ stripeSessionId: sessionId });
}

export async function findPendingTournamentByStripeSessionId(sessionId: string) {
  return PendingTournamentModel.findOne({ stripeSessionId: sessionId });
}

export async function deletePendingTournamentByStripeSessionId(sessionId: string) {
  return PendingTournamentModel.deleteOne({ stripeSessionId: sessionId });
}

export async function findLeagueByIdWithAttachedTournament(leagueId: string, tournamentObjectId: unknown) {
  return LeagueModel.findOne({
    _id: leagueId,
    attachedTournaments: tournamentObjectId,
  });
}

export async function setTournamentInvoiceId(tournamentId: string, invoiceId: string) {
  return TournamentModel.findByIdAndUpdate(tournamentId, { invoiceId });
}
