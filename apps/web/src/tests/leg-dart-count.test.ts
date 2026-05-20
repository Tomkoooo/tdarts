import {
  countPlayerDartsInLeg,
  countLegDartsBothPlayers,
} from '@/lib/legDartCount';

describe('countPlayerDartsInLeg', () => {
  it('returns 0 for empty throws', () => {
    expect(countPlayerDartsInLeg([])).toBe(0);
  });

  it('counts visits as 3 darts each without checkout', () => {
    expect(countPlayerDartsInLeg([100, 60, 40])).toBe(9);
  });

  it('uses checkout darts on final visit when provided', () => {
    expect(countPlayerDartsInLeg([100, 60, 40, 32], 2)).toBe(11);
  });
});

describe('countLegDartsBothPlayers', () => {
  it('sums per-player counts', () => {
    const result = countLegDartsBothPlayers([100, 60], [80, 50]);
    expect(result.player1).toBe(6);
    expect(result.player2).toBe(6);
    expect(result.total).toBe(12);
  });
});
