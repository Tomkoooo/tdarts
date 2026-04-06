import { sortAndGroupHonors } from "@/features/profile/lib/honorSorting";

describe("sortAndGroupHonors", () => {
  it("orders categories as special -> rank -> tournament", () => {
    const grouped = sortAndGroupHonors([
      { title: "Tournament 2026", year: 2026, type: "tournament" },
      { title: "Rank 2024", year: 2024, type: "rank" },
      { title: "Special 2025", year: 2025, type: "special" },
    ]);

    expect(grouped[0].category).toBe("special");
    expect(grouped[1].category).toBe("rank");
    expect(grouped[2].category).toBe("tournament");
    expect(grouped[0].honors[0]?.title).toBe("Special 2025");
  });

  it("sorts honors newest-first inside each category", () => {
    const grouped = sortAndGroupHonors([
      { title: "T 2025", year: 2025, type: "tournament" },
      { title: "T 2026", year: 2026, type: "tournament" },
      { title: "R 2022", year: 2022, type: "rank" },
      { title: "R 2024", year: 2024, type: "rank" },
    ]);

    const tournaments = grouped.find((g) => g.category === "tournament")?.honors || [];
    const ranks = grouped.find((g) => g.category === "rank")?.honors || [];

    expect(tournaments.map((h) => h.year)).toEqual([2026, 2025]);
    expect(ranks.map((h) => h.year)).toEqual([2024, 2022]);
  });
});
