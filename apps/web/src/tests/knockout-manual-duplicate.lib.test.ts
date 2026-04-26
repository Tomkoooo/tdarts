import { TournamentService } from "@tdarts/services";

describe("Knockout manual match round occupancy helpers", () => {
  const extract = (TournamentService as any).extractKnockoutRoundSlotPlayerId.bind(TournamentService);
  const collect = (TournamentService as any).collectPlayerIdsOccupiedInKnockoutRound.bind(TournamentService);

  it("extractKnockoutRoundSlotPlayerId normalizes string and _id objects", () => {
    expect(extract("  pid1  ")).toBe("pid1");
    expect(extract({ _id: "pid2" })).toBe("pid2");
    expect(extract(null)).toBeNull();
  });

  it("collectPlayerIdsOccupiedInKnockoutRound gathers both slots", () => {
    const used = collect({
      matches: [{ player1: "a", player2: { _id: "b" } }, { player1: null, player2: "c" }],
    });
    expect(Array.from(used).sort()).toEqual(["a", "b", "c"]);
  });
});
