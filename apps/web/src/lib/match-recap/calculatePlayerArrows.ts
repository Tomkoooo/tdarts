/** Per-leg dart total for a player (tournament leg throw list). Mirrors LegsViewModal logic. */
export type RecapThrow = {
  score: number;
  darts?: number;
  isDouble?: boolean;
  isCheckout?: boolean;
};

function isStructuredThrow(t: unknown): t is RecapThrow {
  return t !== null && typeof t === "object" && "score" in (t as object);
}

/** Sum per-visit dart counts when throws carry `darts` (tournament legs from DB). */
function sumVisitDarts(throws: RecapThrow[]): number | null {
  if (!throws.length || !isStructuredThrow(throws[0])) return null;
  const hasAny = throws.some((t) => typeof t.darts === "number");
  if (!hasAny) return null;
  return throws.reduce((sum, t) => sum + (typeof t.darts === "number" ? t.darts : 3), 0);
}

export function calculatePlayerArrows(
  throws: RecapThrow[],
  storedTotalDarts?: number,
  isWinner?: boolean,
  winnerArrowCount?: number,
): number {
  if (storedTotalDarts !== undefined && storedTotalDarts !== null) return storedTotalDarts;
  if (!throws.length) return 0;

  const fromVisits = sumVisitDarts(throws);
  if (fromVisits !== null) return fromVisits;

  if (isWinner && typeof winnerArrowCount === "number") {
    return (throws.length - 1) * 3 + winnerArrowCount;
  }
  return throws.length * 3;
}
