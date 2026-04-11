import { SubscriptionService } from '@tdarts/services';

export async function canCreateTournamentForSubscription(
  clubId: string,
  startDate: Date,
  isSandbox: boolean,
  isVerified: boolean
) {
  return SubscriptionService.canCreateTournament(clubId, startDate, isSandbox, isVerified);
}
