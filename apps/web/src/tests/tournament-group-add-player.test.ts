import { roundRobin } from '@tdarts/core';
import { MAX_PLAYERS_PER_GROUP } from '@tdarts/services';

describe('Add player to group — round-robin regeneration', () => {
  it('enforces max players per group (service contract)', () => {
    expect(MAX_PLAYERS_PER_GROUP).toBe(7);
    expect(roundRobin(7).length).toBe(21);
  });
  it('match count increases when group grows from 4 to 5 players', () => {
    const four = roundRobin(4);
    const five = roundRobin(5);
    expect(five.length).toBeGreaterThan(four.length);
    expect(four.length).toBe(6);
    expect(five.length).toBe(10);
  });

  it('supports up to 7 players per group schedule', () => {
    const seven = roundRobin(7);
    expect(seven.length).toBeGreaterThan(0);
  });
});
