import { calculatePlayerArrows } from "@/lib/match-recap/calculatePlayerArrows";

describe("calculatePlayerArrows", () => {
  it("sums per-visit darts when throw objects include darts", () => {
    const throws = [
      { score: 100, darts: 3 },
      { score: 100, darts: 3 },
      { score: 100, darts: 3 },
      { score: 100, darts: 3 },
      { score: 100, darts: 3 },
      { score: 100, darts: 3 },
      { score: 100, darts: 3 },
      { score: 100, darts: 3 },
      { score: 1, darts: 2, isCheckout: true },
    ];
    expect(calculatePlayerArrows(throws as any, undefined, true, 3)).toBe(8 * 3 + 2);
  });

  it("prefers stored total when set", () => {
    const throws = [{ score: 60, darts: 3 }];
    expect(calculatePlayerArrows(throws as any, 25, true, 3)).toBe(25);
  });

  it("falls back to winnerArrowCount when no per-visit darts", () => {
    const throws = [{ score: 60 }, { score: 60 }, { score: 81, isCheckout: true }];
    expect(calculatePlayerArrows(throws as any, undefined, true, 1)).toBe(2 * 3 + 1);
  });
});
