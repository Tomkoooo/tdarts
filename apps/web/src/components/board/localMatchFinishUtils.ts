import type { GameState, Leg } from "@/hooks/useDartGame";

/** Checkout visit can be finished in 1–3 darts depending on score (UI picker). */
export function getPossibleCheckoutDartCounts(checkoutScore: number): number[] {
  if (checkoutScore <= 40 || checkoutScore === 50 || (checkoutScore < 100 && checkoutScore % 3 === 0)) {
    return [1, 2, 3];
  }
  if (
    checkoutScore <= 98 ||
    checkoutScore === 100 ||
    checkoutScore === 101 ||
    checkoutScore === 104 ||
    checkoutScore === 107 ||
    checkoutScore === 110
  ) {
    return [2, 3];
  }
  return [3];
}

/** Completed legs in state plus the deciding leg (still in player `allThrows` when the match ends). */
export function buildLocalMatchLegsSnapshot(
  state: GameState,
  decidingLegWinner: 1 | 2,
  decidingLegCheckoutDarts: number = 3,
): Leg[] {
  const legs: Leg[] = [...state.legs];
  const p1 = [...state.player1.allThrows];
  const p2 = [...state.player2.allThrows];
  if (p1.length === 0 && p2.length === 0) {
    return legs;
  }
  const checkout =
    typeof decidingLegCheckoutDarts === "number" &&
    decidingLegCheckoutDarts >= 1 &&
    decidingLegCheckoutDarts <= 3
      ? decidingLegCheckoutDarts
      : 3;
  legs.push({
    legNumber: state.currentLeg,
    player1Throws: p1,
    player2Throws: p2,
    player1Score: p1.reduce((a, b) => a + b, 0),
    player2Score: p2.reduce((a, b) => a + b, 0),
    winner: decidingLegWinner,
    checkoutDarts: checkout,
    createdAt: new Date(),
  });
  return legs;
}

export type LocalThrowCell = {
  score: number;
  isCheckout: boolean;
};

export function createLocalLegVisitRows(
  p1Throws: number[],
  p2Throws: number[],
  startingScore: number,
  legWinner: 1 | 2,
): Array<{
  throwIndex: number;
  p1Throw?: LocalThrowCell;
  p2Throw?: LocalThrowCell;
  p1After: number | null;
  p2After: number | null;
  arrowCount: number;
}> {
  const visits = Math.max(p1Throws.length, p2Throws.length);
  let p1Rem = startingScore;
  let p2Rem = startingScore;

  return Array.from({ length: visits }, (_, throwIndex) => {
    const p1s = p1Throws[throwIndex];
    const p2s = p2Throws[throwIndex];
    let p1After: number | null = null;
    let p2After: number | null = null;

    if (p1s !== undefined) {
      p1Rem = Math.max(0, p1Rem - p1s);
      p1After = p1Rem;
    }
    if (p2s !== undefined) {
      p2Rem = Math.max(0, p2Rem - p2s);
      p2After = p2Rem;
    }

    const p1Throw =
      p1s !== undefined
        ? {
            score: p1s,
            isCheckout: legWinner === 1 && p1After === 0,
          }
        : undefined;
    const p2Throw =
      p2s !== undefined
        ? {
            score: p2s,
            isCheckout: legWinner === 2 && p2After === 0,
          }
        : undefined;

    return {
      throwIndex,
      p1Throw,
      p2Throw,
      p1After,
      p2After,
      arrowCount: (throwIndex + 1) * 3,
    };
  });
}

export function estimateLegDartsForPlayer(throws: number[]): number {
  if (throws.length === 0) return 0;
  return throws.length * 3;
}

/** Dart count for one player in one leg (visit-based local history; winner may use 1–3 darts on checkout visit). */
export function dartCountForLocalPlayerInLeg(leg: Leg, player: 1 | 2): number {
  const throws = player === 1 ? leg.player1Throws : leg.player2Throws;
  if (!throws.length) return 0;
  if (leg.winner === player) {
    const c = leg.checkoutDarts;
    const checkout = typeof c === "number" && c >= 1 && c <= 3 ? c : 3;
    return (throws.length - 1) * 3 + checkout;
  }
  return throws.length * 3;
}

export function remainingForPlayerAfterLeg(
  leg: Leg,
  startingScore: number,
  player: 1 | 2,
): number {
  const throws = player === 1 ? leg.player1Throws : leg.player2Throws;
  return Math.max(0, startingScore - throws.reduce((a, b) => a + b, 0));
}

/**
 * Best = min darts among won legs.
 * Worst = max darts among won legs (sloppiest win); if no wins, max among all legs with visits.
 * With exactly one leg won, best and worst are always equal.
 */
export function computeBestWorstLegDartsForLocal(
  legs: Leg[],
  player: 1 | 2,
): { best: number | null; worst: number | null } {
  const played: number[] = [];
  const won: number[] = [];
  for (const leg of legs) {
    const throws = player === 1 ? leg.player1Throws : leg.player2Throws;
    if (!throws.length) continue;
    const d = dartCountForLocalPlayerInLeg(leg, player);
    played.push(d);
    if (leg.winner === player) won.push(d);
  }
  if (played.length === 0) return { best: null, worst: null };
  const best = won.length > 0 ? Math.min(...won) : null;
  const worst =
    won.length > 0 ? Math.max(...won) : Math.max(...played);
  return { best, worst };
}
