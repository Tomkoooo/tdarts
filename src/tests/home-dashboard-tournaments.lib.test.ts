import { filterUserHomeTournamentsForDashboard } from "@/features/home/ui/homeUtils";
import type { HomeTournament } from "@/features/home/ui/types";

describe("filterUserHomeTournamentsForDashboard", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("keeps any status on the user's local calendar today; future days only pending; past days drop pending", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2025, 2, 21, 15, 0, 0));

    const base: Omit<HomeTournament, "date" | "status" | "_id"> = { name: "T", code: "c" };
    const today = new Date(2025, 2, 21, 10, 0, 0).toISOString();
    const tomorrow = new Date(2025, 2, 22, 10, 0, 0).toISOString();
    const yesterday = new Date(2025, 2, 20, 10, 0, 0).toISOString();

    const rows: HomeTournament[] = [
      { ...base, _id: "a", date: today, status: "finished" },
      { ...base, _id: "b", date: tomorrow, status: "pending" },
      { ...base, _id: "c", date: tomorrow, status: "ongoing" },
      { ...base, _id: "d", date: yesterday, status: "pending" },
      { ...base, _id: "e", date: yesterday, status: "finished" },
    ];

    const out = filterUserHomeTournamentsForDashboard(rows);
    const ids = new Set(out.map((x) => x._id));
    expect(ids.has("a")).toBe(true);
    expect(ids.has("b")).toBe(true);
    expect(ids.has("c")).toBe(false);
    expect(ids.has("d")).toBe(false);
    expect(ids.has("e")).toBe(true);
  });
});
