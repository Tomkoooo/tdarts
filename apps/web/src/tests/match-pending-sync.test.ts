const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  Object.defineProperty(global, 'window', { value: global, configurable: true });
  const mockStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
  };
  Object.defineProperty(global, 'localStorage', { value: mockStorage, writable: true });
});

jest.mock('@/features/matches/actions/matchGameplay.action', () => ({
  finishMatchLegAction: jest.fn(),
}));

jest.mock('@/features/board/actions/boardPage.action', () => ({
  finishBoardMatchAction: jest.fn(),
}));

import { finishMatchLegAction } from '@/features/matches/actions/matchGameplay.action';
import { finishBoardMatchAction } from '@/features/board/actions/boardPage.action';
import {
  appendPendingLeg,
  flushPendingMatchSync,
  getPendingMatchSync,
  setPendingMatchFinish,
} from '@/lib/matchPendingSync';

describe('matchPendingSync', () => {
  const matchId = 'match-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('flushes pending legs in leg number order', async () => {
    appendPendingLeg(matchId, {
      legNumber: 2,
      winner: 2,
      player1Throws: [100],
      player2Throws: [100, 50],
    });
    appendPendingLeg(matchId, {
      legNumber: 1,
      winner: 1,
      player1Throws: [180],
      player2Throws: [60],
    });

    (finishMatchLegAction as jest.Mock)
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true });

    const result = await flushPendingMatchSync(matchId);

    expect(result.legsFlushed).toBe(2);
    expect(finishMatchLegAction).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ legNumber: 1 })
    );
    expect(finishMatchLegAction).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ legNumber: 2 })
    );
    expect(getPendingMatchSync(matchId)).toBeNull();
  });

  it('finishes match when pendingMatchFinish is set after legs', async () => {
    appendPendingLeg(matchId, {
      legNumber: 1,
      winner: 1,
      player1Throws: [180],
      player2Throws: [],
    });
    setPendingMatchFinish(matchId, {
      player1LegsWon: 3,
      player2LegsWon: 1,
      tournamentId: 'T1',
    });

    (finishMatchLegAction as jest.Mock).mockResolvedValue({ success: true });
    (finishBoardMatchAction as jest.Mock).mockResolvedValue({ success: true });

    const result = await flushPendingMatchSync(matchId);

    expect(result.matchFinished).toBe(true);
    expect(finishBoardMatchAction).toHaveBeenCalledWith(
      expect.objectContaining({ player1LegsWon: 3, player2LegsWon: 1 })
    );
  });
});
