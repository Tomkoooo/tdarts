jest.mock('@/shared/lib/withTelemetry', () => ({
  withTelemetry: (_name: string, fn: (payload: unknown) => Promise<unknown>) => {
    return (payload: unknown) => fn(payload);
  },
}));

jest.mock('@/features/auth/lib/authorizeUser', () => ({
  authorizeUserResult: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidateTag: jest.fn(),
}));

jest.mock('@tdarts/services', () => ({
  TournamentService: {
    updateMaxDartsPerLeg: jest.fn(),
  },
}));

import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { TournamentService } from '@tdarts/services';
import { updateMaxDartsPerLegAction } from '@/features/tournaments/actions/manageTournament.action';

describe('updateMaxDartsPerLegAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authorizeUserResult as jest.Mock).mockResolvedValue({
      ok: true,
      data: { userId: 'user-1' },
    });
    (TournamentService.updateMaxDartsPerLeg as jest.Mock).mockResolvedValue(undefined);
  });

  it('saves max darts for authorized user', async () => {
    const result = await updateMaxDartsPerLegAction({
      code: 'ABCD',
      maxDartsPerLeg: 45,
    });
    expect(result).toEqual({ success: true });
    expect(TournamentService.updateMaxDartsPerLeg).toHaveBeenCalledWith(
      'ABCD',
      'user-1',
      45
    );
  });

  it('clears max darts when null', async () => {
    await updateMaxDartsPerLegAction({ code: 'ABCD', maxDartsPerLeg: null });
    expect(TournamentService.updateMaxDartsPerLeg).toHaveBeenCalledWith(
      'ABCD',
      'user-1',
      null
    );
  });

  it('rejects invalid values', async () => {
    await expect(
      updateMaxDartsPerLegAction({ code: 'ABCD', maxDartsPerLeg: 0 })
    ).rejects.toThrow();
  });
});
