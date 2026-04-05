import { extractTournamentPayload } from "@/features/tournament/lib/tournamentPageData";

describe("extractTournamentPayload", () => {
  it("returns normalized payload with root viewer fallback", () => {
    const input = {
      tournament: {
        tournamentId: "ABC",
        tournamentPlayers: [{ _id: "p1" }],
      },
      viewer: {
        userClubRole: "admin",
        userPlayerStatus: "applied",
      },
    };

    const result = extractTournamentPayload(input);

    expect(result).not.toBeNull();
    expect(result?.tournament?.tournamentId).toBe("ABC");
    expect(result?.players).toHaveLength(1);
    expect(result?.viewer).toEqual({
      userClubRole: "admin",
      userPlayerStatus: "applied",
    });
  });

  it("prefers tournament embedded viewer and defaults to none", () => {
    const input = {
      tournament: {
        tournamentId: "DEF",
        tournamentPlayers: [],
        viewer: {
          userClubRole: "moderator",
          userPlayerStatus: "none",
        },
      },
      viewer: {
        userClubRole: "admin",
        userPlayerStatus: "applied",
      },
    };

    const result = extractTournamentPayload(input);
    expect(result?.viewer).toEqual({
      userClubRole: "moderator",
      userPlayerStatus: "none",
    });
  });

  it("returns null when tournament is missing", () => {
    expect(extractTournamentPayload({})).toBeNull();
  });
});
