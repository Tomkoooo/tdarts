const recordAggregateMock = jest.fn();
const recordErrorEventMock = jest.fn();
const scheduleFlushMock = jest.fn();

jest.mock('@/shared/lib/telemetry/sinks/apiTelemetrySink', () => ({
  normalizeRouteKey: (routeKey: string) => routeKey,
  recordAggregate: recordAggregateMock,
  recordErrorEvent: recordErrorEventMock,
  scheduleFlush: scheduleFlushMock,
}));

jest.mock('@/features/auth/lib/authorizeUser', () => ({
  authorizeUserResult: jest.fn(),
}));

jest.mock('@/features/flags/lib/eligibility', () => ({
  assertEligibilityResult: jest.fn(),
}));

jest.mock('@/database/services/player.service', () => ({
  PlayerService: {
    createPlayer: jest.fn(),
  },
}));

import { createPlayerAction } from '@/features/players/actions/createPlayer.action';
import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { assertEligibilityResult } from '@/features/flags/lib/eligibility';
import { PlayerService } from '@/database/services/player.service';

describe('createPlayerAction guard chain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns structured unauthorized result and skips business logic', async () => {
    (authorizeUserResult as jest.Mock).mockResolvedValue({
      ok: false,
      code: 'UNAUTHORIZED',
      status: 401,
      message: 'Unauthorized',
    });

    const result = await createPlayerAction({
      data: {
        name: 'Unauthenticated Player',
      },
    });

    expect(result).toEqual({
      ok: false,
      code: 'UNAUTHORIZED',
      status: 401,
      message: 'Unauthorized',
    });
    expect(assertEligibilityResult).not.toHaveBeenCalled();
    expect(PlayerService.createPlayer).not.toHaveBeenCalled();
    expect(recordErrorEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        routeKey: 'players.createPlayer',
        status: 401,
        source: 'http_status',
      })
    );
  });
});
