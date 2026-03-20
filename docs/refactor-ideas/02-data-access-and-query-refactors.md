# Data Access and Query Refactors

## A) Split tournament reads into explicit read models

- **Current issue**
  - Tournament read path retrieves many nested relations regardless of active tab.
- **Files to change**
  - `src/database/services/tournament.service.ts`
  - `src/features/tournaments/actions/getTournamentPageData.action.ts`
- **Refactor direction**
  - Add separate methods for `overview`, `players`, `boards`, `groups`, `bracket`.
  - Keep projection narrow per tab and use `lean()` consistently.

```ts
// tournament.service.ts
export async function getTournamentOverviewReadModel(code: string) {
  return TournamentModel.findOne(buildCodeOrIdFilter(code))
    .select("tournamentId clubId tournamentSettings boards.boardNumber boards.status tournamentPlayers.playerReference")
    .populate("clubId", "name location")
    .populate("tournamentPlayers.playerReference", "name profilePicture")
    .lean();
}
```

## B) Fix lookup order in search aggregation

- **Current issue**
  - `$lookup` runs before enough `$match`, inflating docs processed.
- **Files to change**
  - `src/database/services/search.service.ts`
- **Refactor direction**
  - Apply base and user filters before joins.
  - Lookup only minimal needed fields.

```ts
const pipeline = [
  { $match: baseMatch },
  { $match: userFilters },
  { $project: { clubId: 1, league: 1, tournamentSettings: 1, verified: 1 } },
  { $lookup: { from: "clubs", localField: "clubId", foreignField: "_id", as: "club" } },
  { $lookup: { from: "leagues", localField: "league", foreignField: "_id", as: "leagueData" } },
];
```

## C) Remove N+1 recalculations in finish flow

- **Current issue**
  - Per-player recalculation + save loops cause O(players x matches) behavior.
- **Files to change**
  - `src/database/services/tournament.service.ts`
- **Refactor direction**
  - Precompute seasonal aggregates once.
  - Apply updates through `bulkWrite`.

```ts
const seasonAgg = await MatchModel.aggregate([
  { $match: { status: "finished", createdAt: { $gte: seasonStart, $lt: seasonEnd } } },
  // normalize p1/p2 and group by playerId
]);

await PlayerModel.bulkWrite(
  seasonAgg.map((row) => ({
    updateOne: {
      filter: { _id: row.playerId },
      update: { $set: { "stats.avg": row.avg, "stats.firstNineAvg": row.firstNineAvg } },
    },
  })),
  { ordered: false }
);
```

## D) Index refinement checklist

- **Files to inspect/update**
  - `src/database/models/player.model.ts`
  - `src/database/models/match.model.ts`
  - `src/database/models/league.model.ts`
  - `src/database/models/club.model.ts`
- **Likely additions**
  - ranking and search filter indexes (`stats.oacMmr`, `verified`, `isActive`, `createdAt`)
  - match history selectors by status/date/player
- **Rollout guidance**
  - Use hidden index canary flow from `docs/performance/index-rollout-canary.md`.

