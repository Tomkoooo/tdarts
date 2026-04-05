import { TournamentService } from "@/database/services/tournament.service";
import { PlayerModel } from "@/database/models/player.model";
import { MatchModel } from "@/database/models/match.model";

jest.mock("@/lib/mongoose", () => ({
  connectMongo: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/database/models/player.model", () => ({
  PlayerModel: {
    findById: jest.fn(),
  },
}));

jest.mock("@/database/models/match.model", () => ({
  MatchModel: {
    find: jest.fn(),
  },
}));

describe("TournamentService.getHeadToHead", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns global head-to-head summary and match rows", async () => {
    (PlayerModel.findById as jest.Mock)
      .mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          _id: { toString: () => "player-a" },
          name: "Player A",
          country: "HU",
        }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockResolvedValue({
          _id: { toString: () => "player-b" },
          name: "Player B",
          country: "GB",
        }),
      });

    const matches = [
      {
        _id: { toString: () => "m2" },
        type: "group",
        round: 2,
        createdAt: new Date("2025-02-10T00:00:00.000Z"),
        winnerId: { toString: () => "player-b" },
        player1: { playerId: { _id: { toString: () => "player-a" } }, legsWon: 1, average: 58.5, highestCheckout: 80 },
        player2: { playerId: { _id: { toString: () => "player-b" } }, legsWon: 3, average: 63.1, highestCheckout: 121 },
        tournamentRef: {
          _id: { toString: () => "t2" },
          tournamentId: "T002",
          tournamentSettings: { name: "Winter Open", startDate: new Date("2025-02-01T00:00:00.000Z") },
        },
      },
      {
        _id: { toString: () => "m1" },
        type: "knockout",
        round: 1,
        createdAt: new Date("2025-01-10T00:00:00.000Z"),
        winnerId: { toString: () => "player-a" },
        player1: { playerId: { _id: { toString: () => "player-b" } }, legsWon: 2, average: 61.2, highestCheckout: 100 },
        player2: { playerId: { _id: { toString: () => "player-a" } }, legsWon: 3, average: 62.9, highestCheckout: 110 },
        tournamentRef: {
          _id: { toString: () => "t1" },
          tournamentId: "T001",
          tournamentSettings: { name: "Spring Cup", startDate: new Date("2025-01-01T00:00:00.000Z") },
        },
      },
    ];

    const queryChain = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue(matches),
    };
    (MatchModel.find as jest.Mock).mockReturnValue(queryChain);

    const result = await TournamentService.getHeadToHead("player-a", "player-b");

    expect(result.summary.matchesPlayed).toBe(2);
    expect(result.summary.playerAWins).toBe(1);
    expect(result.summary.playerBWins).toBe(1);
    expect(result.summary.playerALegsWon).toBe(4);
    expect(result.summary.playerBLegsWon).toBe(5);
    expect(result.summary.playerAHighestCheckout).toBe(110);
    expect(result.summary.playerBHighestCheckout).toBe(121);
    expect(result.matches[0].tournament.tournamentId).toBe("T002");
  });
});
