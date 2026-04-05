import { getGroupTableStats } from '@/lib/tournament-player-group-stats';

describe('getGroupTableStats', () => {
  it('uses groupStats when tournament is finished and groupStats.matchesWon is set', () => {
    const player = {
      stats: { matchesWon: 5, matchesLost: 2, legsWon: 12, legsLost: 5, avg: 51, firstNineAvg: 53, oneEightiesCount: 0, highestCheckout: 99 },
      groupStats: { matchesWon: 3, matchesLost: 1, legsWon: 7, legsLost: 2, avg: 52, firstNineAvg: 54, oneEightiesCount: 0, highestCheckout: 99 },
    };
    const g = getGroupTableStats(player, 'finished');
    expect(g.matchesWon).toBe(3);
    expect(g.matchesLost).toBe(1);
    expect(g.legsWon).toBe(7);
    expect(g.legsLost).toBe(2);
    expect(g.avg).toBe(52);
  });

  it('uses stats during live group-stage', () => {
    const player = {
      stats: { matchesWon: 2, matchesLost: 0, legsWon: 4, legsLost: 2, avg: 48, firstNineAvg: 50, oneEightiesCount: 1, highestCheckout: 80 },
      groupStats: { matchesWon: 99, matchesLost: 0, legsWon: 0, legsLost: 0, avg: 0, firstNineAvg: 0, oneEightiesCount: 0, highestCheckout: 0 },
    };
    const g = getGroupTableStats(player, 'group-stage');
    expect(g.matchesWon).toBe(2);
    expect(g.avg).toBe(48);
  });

  it('falls back to stats when finished but groupStats missing matchesWon', () => {
    const player = {
      stats: { matchesWon: 4, matchesLost: 1, legsWon: 8, legsLost: 3, avg: 50, firstNineAvg: 51, oneEightiesCount: 0, highestCheckout: 100 },
      groupStats: {},
    };
    const g = getGroupTableStats(player, 'finished');
    expect(g.matchesWon).toBe(4);
  });
});
