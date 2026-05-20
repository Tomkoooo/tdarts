import { TournamentService } from '@tdarts/services';

describe('Single-group knockout generation', () => {
  const createPlayer = (id: string, standing: number) => ({
    playerReference: id,
    groupId: 'group1',
    groupStanding: standing,
  });

  const generateSingleGroup = (players: ReturnType<typeof createPlayer>[], advanceCount: number) =>
    (TournamentService as any).generateSingleGroupKnockoutRounds(players, advanceCount);

  test('6 players, advance 4 → 1st vs 4th, 2nd vs 3rd', () => {
    const players = [1, 2, 3, 4, 5, 6].map((s) => createPlayer(`p${s}`, s));
    const result = generateSingleGroup(players, 4);
    const matches = result[0].matches;

    expect(matches).toHaveLength(2);
    expect(matches[0].player1).toBe('p1');
    expect(matches[0].player2).toBe('p4');
    expect(matches[1].player1).toBe('p2');
    expect(matches[1].player2).toBe('p3');
  });

  test('5 players advance (odd) → bye for middle player', () => {
    const players = [1, 2, 3, 4, 5].map((s) => createPlayer(`p${s}`, s));
    const result = generateSingleGroup(players, 5);
    const matches = result[0].matches;

    expect(matches).toHaveLength(3);
    expect(matches[0].player1).toBe('p1');
    expect(matches[0].player2).toBe('p5');
    expect(matches[1].player1).toBe('p2');
    expect(matches[1].player2).toBe('p4');
    expect(matches[2].player1).toBe('p3');
    expect(matches[2].player2).toBeUndefined();
  });
});
