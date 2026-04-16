import {
  buildTvPlayerLegMeta,
  getRankings180,
  getRankingsCheckout,
  TvLegMatchLite,
} from '@/lib/tv/slideshow';

describe('buildTvPlayerLegMeta', () => {
  it('collects 180 and checkout events per player', () => {
    const matches: TvLegMatchLite[] = [
      {
        player1: { playerId: 'p1' },
        player2: { playerId: 'p2' },
        legs: [
          {
            createdAt: '2026-04-10T10:00:00.000Z',
            player1Throws: [{ score: 180 }],
            player2Throws: [],
            winnerId: 'p1',
            checkoutScore: 81,
          },
        ],
      },
    ];
    const meta = buildTvPlayerLegMeta(matches);
    expect(meta.get('p1')?.times180).toEqual([new Date('2026-04-10T10:00:00.000Z').getTime()]);
    expect(meta.get('p1')?.checkouts[0]?.score).toBe(81);
  });
});

describe('getRankings180 with leg matches', () => {
  it('breaks ties by earlier Nth 180 time', () => {
    const matches: TvLegMatchLite[] = [
      {
        player1: { playerId: 'p1' },
        player2: { playerId: 'p2' },
        legs: [
          {
            createdAt: '2026-01-01T10:00:00.000Z',
            player1Throws: [{ score: 180 }],
            player2Throws: [],
          },
          {
            createdAt: '2026-01-01T11:00:00.000Z',
            player1Throws: [{ score: 180 }],
            player2Throws: [],
          },
          {
            createdAt: '2026-01-01T09:00:00.000Z',
            player1Throws: [],
            player2Throws: [{ score: 180 }],
          },
          {
            createdAt: '2026-01-01T12:00:00.000Z',
            player1Throws: [],
            player2Throws: [{ score: 180 }],
          },
        ],
      },
    ];

    const tournament = {
      tournamentPlayers: [
        {
          _id: 'tp1',
          playerReference: { _id: 'p1', name: 'Alice' },
          stats: { oneEightiesCount: 2 },
        },
        {
          _id: 'tp2',
          playerReference: { _id: 'p2', name: 'Bob' },
          stats: { oneEightiesCount: 2 },
        },
      ],
    };

    const rows = getRankings180(tournament, 10, matches);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('Alice');
    expect(rows[1].name).toBe('Bob');
    expect(rows[0].timeLabel).toBeDefined();
  });
});

describe('getRankingsCheckout with leg matches', () => {
  it('breaks ties by earlier first occurrence of max checkout', () => {
    const matches: TvLegMatchLite[] = [
      {
        player1: { playerId: 'p1' },
        player2: { playerId: 'p2' },
        legs: [
          {
            createdAt: '2026-01-01T15:00:00.000Z',
            winnerId: 'p1',
            checkoutScore: 170,
            player1Throws: [],
            player2Throws: [],
          },
          {
            createdAt: '2026-01-01T14:00:00.000Z',
            winnerId: 'p2',
            checkoutScore: 170,
            player1Throws: [],
            player2Throws: [],
          },
        ],
      },
    ];

    const tournament = {
      tournamentPlayers: [
        {
          _id: 'tp1',
          playerReference: { _id: 'p1', name: 'Late' },
          stats: { highestCheckout: 170 },
        },
        {
          _id: 'tp2',
          playerReference: { _id: 'p2', name: 'Early' },
          stats: { highestCheckout: 170 },
        },
      ],
    };

    const rows = getRankingsCheckout(tournament, 10, matches);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('Early');
    expect(rows[1].name).toBe('Late');
  });
});
