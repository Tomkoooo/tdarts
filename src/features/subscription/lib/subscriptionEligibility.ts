import { SubscriptionService } from '@/database/services/subscription.service';

export async function canCreateTournamentForSubscription(
  clubId: string,
  startDate: Date,
  isSandbox: boolean,
  isVerified: boolean
) {
  return SubscriptionService.canCreateTournament(clubId, startDate, isSandbox, isVerified);
}
