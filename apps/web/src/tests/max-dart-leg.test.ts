import { shouldPromptMaxDartLegWinner, isPlayerAtMaxDartCap } from '@/lib/maxDartLeg';

describe('maxDartLeg', () => {
  it('does not prompt until both players reach the cap', () => {
    expect(shouldPromptMaxDartLegWinner([180, 180, 180, 180], [], 12)).toBe(false);
    expect(shouldPromptMaxDartLegWinner([180, 180, 180, 180], [180, 180, 180, 180], 12)).toBe(true);
  });

  it('isPlayerAtMaxDartCap respects per-player dart count', () => {
    expect(isPlayerAtMaxDartCap([180, 180, 180, 180], 12)).toBe(true);
    expect(isPlayerAtMaxDartCap([180, 180], 12)).toBe(false);
  });
});
