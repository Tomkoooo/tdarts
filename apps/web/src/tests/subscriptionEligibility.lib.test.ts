import { SubscriptionService } from '@tdarts/services';
import { canCreateTournamentForSubscription } from '@/features/subscription/lib/subscriptionEligibility';

jest.mock('@tdarts/services', () => ({
  ...jest.requireActual('@tdarts/services'),
  SubscriptionService: {
    canCreateTournament: jest.fn(),
  },
}));

describe('subscriptionEligibility lib', () => {
  it('delegates to SubscriptionService.canCreateTournament', async () => {
    const expected = { canCreate: true };
    (SubscriptionService.canCreateTournament as jest.Mock).mockResolvedValue(expected);
    const startDate = new Date('2026-03-01T00:00:00.000Z');

    const result = await canCreateTournamentForSubscription('club-1', startDate, false, true);

    expect(SubscriptionService.canCreateTournament).toHaveBeenCalledWith('club-1', startDate, false, true);
    expect(result).toEqual(expected);
  });
});
