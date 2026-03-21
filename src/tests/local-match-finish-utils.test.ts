import {
  computeBestWorstLegDartsForLocal,
  dartCountForLocalPlayerInLeg,
  estimateLegDartsForPlayer,
} from "@/components/board/localMatchFinishUtils";
import type { Leg } from "@/hooks/useDartGame";

function leg(
  p1: number[],
  p2: number[],
  winner: 1 | 2,
  legNumber: number,
): Leg {
  return {
    legNumber,
    player1Throws: p1,
    player2Throws: p2,
    player1Score: p1.reduce((a, b) => a + b, 0),
    player2Score: p2.reduce((a, b) => a + b, 0),
    winner,
    createdAt: new Date(),
  };
}

describe("computeBestWorstLegDartsForLocal", () => {
  it("returns min and max darts among won legs only (ignores lost legs for worst)", () => {
    const legs: Leg[] = [
      leg([100, 100], [100, 101], 2, 1),
      leg([180], [60, 60, 60], 1, 2),
    ];
    const p1 = computeBestWorstLegDartsForLocal(legs, 1);
    expect(p1.best).toBe(estimateLegDartsForPlayer([180]));
    expect(p1.worst).toBe(estimateLegDartsForPlayer([180]));
  });

  it("returns null best when player won no legs", () => {
    const legs: Leg[] = [leg([60], [120], 2, 1)];
    const p1 = computeBestWorstLegDartsForLocal(legs, 1);
    expect(p1.best).toBeNull();
    expect(p1.worst).toBe(estimateLegDartsForPlayer([60]));
  });

  it("uses checkoutDarts on won legs instead of visits*3", () => {
    const nineVisitLeg: Leg = {
      legNumber: 1,
      player1Throws: [60, 60, 60, 60, 60, 60, 60, 60, 21],
      player2Throws: [100],
      player1Score: 501,
      player2Score: 100,
      winner: 1,
      checkoutDarts: 2,
      createdAt: new Date(),
    };
    expect(dartCountForLocalPlayerInLeg(nineVisitLeg, 1)).toBe(8 * 3 + 2);
    const p1 = computeBestWorstLegDartsForLocal([nineVisitLeg], 1);
    expect(p1.best).toBe(26);
    expect(p1.worst).toBe(26);
  });

  it("worst leg follows won legs only so a long lost leg does not inflate worst", () => {
    const legs: Leg[] = [
      {
        ...leg([100, 100, 101], [100, 100, 100], 1, 1),
        checkoutDarts: 3,
      },
      leg([60, 60, 60, 60], [180, 100], 2, 2),
    ];
    const p1 = computeBestWorstLegDartsForLocal(legs, 1);
    const p2 = computeBestWorstLegDartsForLocal(legs, 2);
    // P1: only win is leg1 (9 darts); lost leg2 is ignored for worst → best=worst=9.
    expect(p1.best).toBe(9);
    expect(p1.worst).toBe(9);
    // P2: only win is leg2 (6 darts).
    expect(p2.best).toBe(6);
    expect(p2.worst).toBe(6);
  });

  it("with multiple wins, worst is the highest dart count among those wins", () => {
    const legs: Leg[] = [
      { ...leg([100, 100, 101], [100, 100, 100], 1, 1), checkoutDarts: 3 },
      { ...leg([180], [60, 60, 60], 1, 2), checkoutDarts: 3 },
      {
        ...leg([60, 60, 60, 60, 81], [100, 100], 1, 3),
        checkoutDarts: 3,
      },
    ];
    const p1 = computeBestWorstLegDartsForLocal(legs, 1);
    expect(p1.best).toBe(3);
    expect(p1.worst).toBe(15);
  });
});
