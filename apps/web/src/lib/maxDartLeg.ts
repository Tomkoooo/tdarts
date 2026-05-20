import { countPlayerDartsInLeg } from '@/lib/legDartCount';

export function isPlayerAtMaxDartCap(
  throws: number[],
  maxDartsPerLeg: number | null | undefined
): boolean {
  if (maxDartsPerLeg == null || maxDartsPerLeg <= 0) return false;
  return countPlayerDartsInLeg(throws) >= maxDartsPerLeg;
}

export function shouldPromptMaxDartLegWinner(
  player1Throws: number[],
  player2Throws: number[],
  maxDartsPerLeg: number | null | undefined
): boolean {
  if (maxDartsPerLeg == null || maxDartsPerLeg <= 0) return false;
  return (
    isPlayerAtMaxDartCap(player1Throws, maxDartsPerLeg) &&
    isPlayerAtMaxDartCap(player2Throws, maxDartsPerLeg)
  );
}
