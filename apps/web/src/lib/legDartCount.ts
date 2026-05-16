/**
 * Per-player dart count in a leg from visit scores (tournament board scoring).
 * Mirrors MatchService.finishLeg / calculatePlayerArrows logic.
 */
export function countPlayerDartsInLeg(
  throws: number[],
  checkoutDarts?: number
): number {
  if (!throws.length) return 0;
  if (checkoutDarts !== undefined && checkoutDarts >= 1) {
    return (throws.length - 1) * 3 + checkoutDarts;
  }
  return throws.length * 3;
}

export function countLegDartsBothPlayers(
  player1Throws: number[],
  player2Throws: number[],
  options?: {
    player1CheckoutDarts?: number;
    player2CheckoutDarts?: number;
  }
): { player1: number; player2: number; total: number } {
  const player1 = countPlayerDartsInLeg(
    player1Throws,
    options?.player1CheckoutDarts
  );
  const player2 = countPlayerDartsInLeg(
    player2Throws,
    options?.player2CheckoutDarts
  );
  return { player1, player2, total: player1 + player2 };
}
