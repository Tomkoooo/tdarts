import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectMongo } from "@/lib/mongoose";
import { MatchModel } from "@/database/models/match.model";
import { TournamentModel } from "@/database/models/tournament.model";
import { PlayerModel } from "@/database/models/player.model";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

type ScoreDarts = { score: number; darts: number };

const round2 = (value: number) => Math.round(value * 100) / 100;
const toAvg = (value: ScoreDarts): number => (value.darts > 0 ? round2((value.score / value.darts) * 3) : 0);

const getId = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (typeof value === "object") {
    if (value._id) return getId(value._id);
    if (typeof value.toString === "function") return value.toString();
  }
  return String(value);
};

const getLegDarts = (throws: any[] | undefined, storedTotalDarts?: number | null): number => {
  if (!Array.isArray(throws) || throws.length === 0) return 0;
  if (storedTotalDarts !== undefined && storedTotalDarts !== null) return Number(storedTotalDarts);
  return throws.reduce((sum, t) => sum + Number(t?.darts || 3), 0);
};

const firstNineFromThrows = (throws: any[] | undefined): ScoreDarts => {
  if (!Array.isArray(throws) || throws.length === 0) return { score: 0, darts: 0 };
  const firstVisits = throws.slice(0, 3);
  return {
    score: firstVisits.reduce((sum, t) => sum + Number(t?.score || 0), 0),
    darts: firstVisits.reduce((sum, t) => sum + Number(t?.darts || 3), 0),
  };
};

const addScoreDarts = (target: ScoreDarts, source: ScoreDarts) => {
  target.score += source.score;
  target.darts += source.darts;
};

const ensureNestedMapScoreDarts = (root: Map<string, Map<string, ScoreDarts>>, key1: string, key2: string): ScoreDarts => {
  if (!root.has(key1)) root.set(key1, new Map<string, ScoreDarts>());
  const inner = root.get(key1)!;
  if (!inner.has(key2)) inner.set(key2, { score: 0, darts: 0 });
  return inner.get(key2)!;
};

const ensureSeasonMapScoreDarts = (root: Map<string, Map<number, ScoreDarts>>, playerId: string, year: number): ScoreDarts => {
  if (!root.has(playerId)) root.set(playerId, new Map<number, ScoreDarts>());
  const seasonMap = root.get(playerId)!;
  if (!seasonMap.has(year)) seasonMap.set(year, { score: 0, darts: 0 });
  return seasonMap.get(year)!;
};

async function buildAggregates(dryRun: boolean) {
  console.log(`Step 1/3: Scanning finished matches and preparing recalculations (dryRun=${dryRun}) ...`);

  const perTournamentPlayerAvg = new Map<string, Map<string, ScoreDarts>>();
  const perTournamentPlayerFirstNine = new Map<string, Map<string, ScoreDarts>>();
  const perTournamentPlayer180 = new Map<string, Map<string, number>>();
  const perPlayerSeasonAvg = new Map<string, Map<number, ScoreDarts>>();
  const perPlayerSeasonFirstNine = new Map<string, Map<number, ScoreDarts>>();
  const perPlayerSeason180 = new Map<string, Map<number, number>>();
  const perPlayerTournamentAvg = new Map<string, Map<string, ScoreDarts>>();
  const perPlayerTournamentFirstNine = new Map<string, Map<string, ScoreDarts>>();
  const perPlayerTournament180 = new Map<string, Map<string, number>>();

  const bulkOps: any[] = [];
  const mismatchSamples: string[] = [];
  let scanned = 0;
  let changed = 0;

  const cursor = MatchModel.find({ status: "finished", "legs.0": { $exists: true } })
    .select("_id tournamentRef createdAt legs player1 player2")
    .cursor();

  for await (const match of cursor) {
    scanned += 1;

    const tournamentKey = getId(match.tournamentRef);
    const year = new Date(match.createdAt).getFullYear();
    const p1Id = getId(match.player1?.playerId);
    const p2Id = getId(match.player2?.playerId);

    const p1AvgTotals: ScoreDarts = { score: 0, darts: 0 };
    const p2AvgTotals: ScoreDarts = { score: 0, darts: 0 };
    const p1FirstNineTotals: ScoreDarts = { score: 0, darts: 0 };
    const p2FirstNineTotals: ScoreDarts = { score: 0, darts: 0 };
    let p1OneEighties = 0;
    let p2OneEighties = 0;

    for (const leg of match.legs || []) {
      if (p1Id) {
        p1AvgTotals.score += Number(leg?.player1Score || 0);
        p1AvgTotals.darts += getLegDarts(leg?.player1Throws, leg?.player1TotalDarts);
        addScoreDarts(p1FirstNineTotals, firstNineFromThrows(leg?.player1Throws));
        for (const throwData of leg?.player1Throws || []) {
          if (Number(throwData?.score || 0) === 180) p1OneEighties += 1;
        }
      }
      if (p2Id) {
        p2AvgTotals.score += Number(leg?.player2Score || 0);
        p2AvgTotals.darts += getLegDarts(leg?.player2Throws, leg?.player2TotalDarts);
        addScoreDarts(p2FirstNineTotals, firstNineFromThrows(leg?.player2Throws));
        for (const throwData of leg?.player2Throws || []) {
          if (Number(throwData?.score || 0) === 180) p2OneEighties += 1;
        }
      }
    }

    const nextP1Avg = toAvg(p1AvgTotals);
    const nextP2Avg = toAvg(p2AvgTotals);
    const nextP1FirstNine = toAvg(p1FirstNineTotals);
    const nextP2FirstNine = toAvg(p2FirstNineTotals);
    const currP1Avg = Number(match.player1?.average ?? 0);
    const currP2Avg = Number(match.player2?.average ?? 0);
    const currP1FirstNine = Number(match.player1?.firstNineAvg ?? 0);
    const currP2FirstNine = Number(match.player2?.firstNineAvg ?? 0);
    const currP1OneEighties = Number(match.player1?.oneEightiesCount ?? 0);
    const currP2OneEighties = Number(match.player2?.oneEightiesCount ?? 0);

    const p1Changed =
      round2(currP1Avg) !== nextP1Avg || round2(currP1FirstNine) !== nextP1FirstNine || currP1OneEighties !== p1OneEighties;
    const p2Changed =
      round2(currP2Avg) !== nextP2Avg || round2(currP2FirstNine) !== nextP2FirstNine || currP2OneEighties !== p2OneEighties;

    if (p1Changed || p2Changed) {
      changed += 1;
      if (mismatchSamples.length < 10) {
        mismatchSamples.push(
          `match=${match._id.toString()} p1(avg ${round2(currP1Avg)}->${nextP1Avg}, f9 ${round2(currP1FirstNine)}->${nextP1FirstNine}) ` +
            `p2(avg ${round2(currP2Avg)}->${nextP2Avg}, f9 ${round2(currP2FirstNine)}->${nextP2FirstNine})`
        );
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: match._id },
          update: {
            $set: {
              ...(p1Id
                ? { "player1.average": nextP1Avg, "player1.firstNineAvg": nextP1FirstNine, "player1.oneEightiesCount": p1OneEighties }
                : {}),
              ...(p2Id
                ? { "player2.average": nextP2Avg, "player2.firstNineAvg": nextP2FirstNine, "player2.oneEightiesCount": p2OneEighties }
                : {}),
            },
          },
        },
      });
    }

    if (p1Id) {
      addScoreDarts(ensureNestedMapScoreDarts(perTournamentPlayerAvg, tournamentKey, p1Id), p1AvgTotals);
      addScoreDarts(ensureNestedMapScoreDarts(perTournamentPlayerFirstNine, tournamentKey, p1Id), p1FirstNineTotals);
      addScoreDarts(ensureSeasonMapScoreDarts(perPlayerSeasonAvg, p1Id, year), p1AvgTotals);
      addScoreDarts(ensureSeasonMapScoreDarts(perPlayerSeasonFirstNine, p1Id, year), p1FirstNineTotals);
      addScoreDarts(ensureNestedMapScoreDarts(perPlayerTournamentAvg, p1Id, tournamentKey), p1AvgTotals);
      addScoreDarts(ensureNestedMapScoreDarts(perPlayerTournamentFirstNine, p1Id, tournamentKey), p1FirstNineTotals);
      if (!perTournamentPlayer180.has(tournamentKey)) perTournamentPlayer180.set(tournamentKey, new Map<string, number>());
      perTournamentPlayer180.set(
        tournamentKey,
        perTournamentPlayer180.get(tournamentKey)!.set(p1Id, (perTournamentPlayer180.get(tournamentKey)!.get(p1Id) || 0) + p1OneEighties)
      );
      if (!perPlayerSeason180.has(p1Id)) perPlayerSeason180.set(p1Id, new Map<number, number>());
      perPlayerSeason180.set(p1Id, perPlayerSeason180.get(p1Id)!.set(year, (perPlayerSeason180.get(p1Id)!.get(year) || 0) + p1OneEighties));
      if (!perPlayerTournament180.has(p1Id)) perPlayerTournament180.set(p1Id, new Map<string, number>());
      perPlayerTournament180.set(
        p1Id,
        perPlayerTournament180.get(p1Id)!.set(tournamentKey, (perPlayerTournament180.get(p1Id)!.get(tournamentKey) || 0) + p1OneEighties)
      );
    }
    if (p2Id) {
      addScoreDarts(ensureNestedMapScoreDarts(perTournamentPlayerAvg, tournamentKey, p2Id), p2AvgTotals);
      addScoreDarts(ensureNestedMapScoreDarts(perTournamentPlayerFirstNine, tournamentKey, p2Id), p2FirstNineTotals);
      addScoreDarts(ensureSeasonMapScoreDarts(perPlayerSeasonAvg, p2Id, year), p2AvgTotals);
      addScoreDarts(ensureSeasonMapScoreDarts(perPlayerSeasonFirstNine, p2Id, year), p2FirstNineTotals);
      addScoreDarts(ensureNestedMapScoreDarts(perPlayerTournamentAvg, p2Id, tournamentKey), p2AvgTotals);
      addScoreDarts(ensureNestedMapScoreDarts(perPlayerTournamentFirstNine, p2Id, tournamentKey), p2FirstNineTotals);
      if (!perTournamentPlayer180.has(tournamentKey)) perTournamentPlayer180.set(tournamentKey, new Map<string, number>());
      perTournamentPlayer180.set(
        tournamentKey,
        perTournamentPlayer180.get(tournamentKey)!.set(p2Id, (perTournamentPlayer180.get(tournamentKey)!.get(p2Id) || 0) + p2OneEighties)
      );
      if (!perPlayerSeason180.has(p2Id)) perPlayerSeason180.set(p2Id, new Map<number, number>());
      perPlayerSeason180.set(p2Id, perPlayerSeason180.get(p2Id)!.set(year, (perPlayerSeason180.get(p2Id)!.get(year) || 0) + p2OneEighties));
      if (!perPlayerTournament180.has(p2Id)) perPlayerTournament180.set(p2Id, new Map<string, number>());
      perPlayerTournament180.set(
        p2Id,
        perPlayerTournament180.get(p2Id)!.set(tournamentKey, (perPlayerTournament180.get(p2Id)!.get(tournamentKey) || 0) + p2OneEighties)
      );
    }

    if (bulkOps.length >= 500) {
      if (!dryRun) await MatchModel.bulkWrite(bulkOps, { ordered: false });
      bulkOps.length = 0;
    }
  }

  if (bulkOps.length > 0 && !dryRun) {
    await MatchModel.bulkWrite(bulkOps, { ordered: false });
  }

  console.log(`  matches scanned=${scanned}, match docs updated=${changed}`);
  if (mismatchSamples.length > 0) {
    console.log("  match mismatch samples:");
    mismatchSamples.forEach((line) => console.log(`   - ${line}`));
  }

  return {
    perTournamentPlayerAvg,
    perTournamentPlayerFirstNine,
    perTournamentPlayer180,
    perPlayerSeasonAvg,
    perPlayerSeasonFirstNine,
    perPlayerSeason180,
    perPlayerTournamentAvg,
    perPlayerTournamentFirstNine,
    perPlayerTournament180,
  };
}

async function backfillTournamentPlayers(
  aggregates: Awaited<ReturnType<typeof buildAggregates>>,
  dryRun: boolean
) {
  console.log("Step 2/3: Recomputing tournamentPlayers.stats avg/firstNineAvg/180 ...");

  const tournaments = await TournamentModel.find({})
    .select("_id tournamentId tournamentPlayers.playerReference tournamentPlayers.stats")
    .lean();

  let scanned = 0;
  let changed = 0;
  const mismatchSamples: string[] = [];

  for (const tournament of tournaments) {
    scanned += 1;
    const tournamentKey = getId(tournament._id);
    const avgByPlayer = aggregates.perTournamentPlayerAvg.get(tournamentKey) || new Map<string, ScoreDarts>();
    const firstNineByPlayer = aggregates.perTournamentPlayerFirstNine.get(tournamentKey) || new Map<string, ScoreDarts>();
    const oneEightiesByPlayer = aggregates.perTournamentPlayer180.get(tournamentKey) || new Map<string, number>();

    let tournamentChanged = false;
    const updatedTournamentPlayers = (tournament.tournamentPlayers || []).map((tp: any) => {
      const playerId = getId(tp.playerReference);
      if (!playerId) return tp;
      const nextAvg = toAvg(avgByPlayer.get(playerId) || { score: 0, darts: 0 });
      const nextFirstNine = toAvg(firstNineByPlayer.get(playerId) || { score: 0, darts: 0 });
      const nextOneEighties = Number(oneEightiesByPlayer.get(playerId) || 0);
      const currAvg = Number(tp?.stats?.avg ?? 0);
      const currFirstNine = Number(tp?.stats?.firstNineAvg ?? 0);
      const currOneEighties = Number(tp?.stats?.oneEightiesCount ?? 0);

      if (round2(currAvg) !== nextAvg || round2(currFirstNine) !== nextFirstNine || currOneEighties !== nextOneEighties) {
        tournamentChanged = true;
        changed += 1;
        if (mismatchSamples.length < 10) {
          mismatchSamples.push(
            `tournament=${tournament.tournamentId} player=${playerId} avg ${round2(currAvg)}->${nextAvg}, f9 ${round2(currFirstNine)}->${nextFirstNine}, 180 ${currOneEighties}->${nextOneEighties}`
          );
        }
      }

      return {
        ...tp,
        stats: {
          ...(tp.stats || {}),
          avg: nextAvg,
          firstNineAvg: nextFirstNine,
          oneEightiesCount: nextOneEighties,
        },
      };
    });

    if (tournamentChanged && !dryRun) {
      await TournamentModel.updateOne(
        { _id: tournament._id },
        { $set: { tournamentPlayers: updatedTournamentPlayers } }
      );
    }
  }

  console.log(`  tournaments scanned=${scanned}, tournament-player stat rows changed=${changed}`);
  if (mismatchSamples.length > 0) {
    console.log("  tournament mismatch samples:");
    mismatchSamples.forEach((line) => console.log(`   - ${line}`));
  }
}

async function backfillPlayers(
  aggregates: Awaited<ReturnType<typeof buildAggregates>>,
  dryRun: boolean
) {
  console.log("Step 3/3: Recomputing player stats/tournamentHistory/previousSeasons averages + 180 ...");

  const players = await PlayerModel.find({})
    .select("_id stats tournamentHistory previousSeasons")
    .lean();
  const tournaments = await TournamentModel.find({}).select("_id tournamentId").lean();
  const tournamentObjectIdByCode = new Map<string, string>();
  for (const t of tournaments) {
    tournamentObjectIdByCode.set(String(t.tournamentId), getId(t._id));
  }

  const currentYear = new Date().getFullYear();
  let scanned = 0;
  let changed = 0;
  const mismatchSamples: string[] = [];
  const bulkOps: any[] = [];

  for (const player of players) {
    scanned += 1;
    const playerId = getId(player._id);
    const seasonAvg = aggregates.perPlayerSeasonAvg.get(playerId) || new Map<number, ScoreDarts>();
    const seasonFirstNine = aggregates.perPlayerSeasonFirstNine.get(playerId) || new Map<number, ScoreDarts>();
    const seasonOneEighties = aggregates.perPlayerSeason180.get(playerId) || new Map<number, number>();
    const tournamentAvg = aggregates.perPlayerTournamentAvg.get(playerId) || new Map<string, ScoreDarts>();
    const tournamentFirstNine = aggregates.perPlayerTournamentFirstNine.get(playerId) || new Map<string, ScoreDarts>();
    const tournamentOneEighties = aggregates.perPlayerTournament180.get(playerId) || new Map<string, number>();

    const nextCurrentAvg = toAvg(seasonAvg.get(currentYear) || { score: 0, darts: 0 });
    const nextCurrentFirstNine = toAvg(seasonFirstNine.get(currentYear) || { score: 0, darts: 0 });
    const nextCurrentOneEighties = Number(seasonOneEighties.get(currentYear) || 0);
    const currCurrentAvg = Number(player?.stats?.avg ?? 0);
    const currCurrentFirstNine = Number(player?.stats?.firstNineAvg ?? 0);
    const currCurrentOneEighties = Number(player?.stats?.oneEightiesCount ?? 0);
    const currCurrentTotal180s = Number(player?.stats?.total180s ?? 0);

    let playerChanged = false;

    if (
      round2(currCurrentAvg) !== nextCurrentAvg ||
      round2(currCurrentFirstNine) !== nextCurrentFirstNine ||
      currCurrentOneEighties !== nextCurrentOneEighties ||
      currCurrentTotal180s !== nextCurrentOneEighties
    ) {
      playerChanged = true;
      if (mismatchSamples.length < 10) {
        mismatchSamples.push(
          `player=${playerId} current avg ${round2(currCurrentAvg)}->${nextCurrentAvg}, f9 ${round2(currCurrentFirstNine)}->${nextCurrentFirstNine}, 180 ${currCurrentOneEighties}->${nextCurrentOneEighties}`
        );
      }
    }

    const updatedHistory = (player.tournamentHistory || []).map((entry: any) => {
      const tournamentId = entry?.tournamentId;
      if (!tournamentId) return entry;
      const tournamentKey = tournamentObjectIdByCode.get(String(tournamentId)) || String(tournamentId);
      const nextHistoryAvg = toAvg(tournamentAvg.get(tournamentKey) || { score: 0, darts: 0 });
      const nextHistoryFirstNine = toAvg(tournamentFirstNine.get(tournamentKey) || { score: 0, darts: 0 });
      const nextHistoryOneEighties = Number(tournamentOneEighties.get(tournamentKey) || 0);
      const currHistoryAvg = Number(entry?.stats?.average ?? 0);
      const currHistoryFirstNine = Number(entry?.stats?.firstNineAvg ?? 0);
      const currHistoryOneEighties = Number(entry?.stats?.oneEightiesCount ?? 0);

      if (
        round2(currHistoryAvg) !== nextHistoryAvg ||
        round2(currHistoryFirstNine) !== nextHistoryFirstNine ||
        currHistoryOneEighties !== nextHistoryOneEighties
      ) {
        playerChanged = true;
      }

      return {
        ...entry,
        stats: {
          ...(entry.stats || {}),
          average: nextHistoryAvg,
          firstNineAvg: nextHistoryFirstNine,
          oneEightiesCount: nextHistoryOneEighties,
        },
      };
    });

    const updatedPreviousSeasons = (player.previousSeasons || []).map((season: any) => {
      const seasonYear = Number(season?.year);
      const nextSeasonAvg = toAvg(seasonAvg.get(seasonYear) || { score: 0, darts: 0 });
      const nextSeasonFirstNine = toAvg(seasonFirstNine.get(seasonYear) || { score: 0, darts: 0 });
      const nextSeasonOneEighties = Number(seasonOneEighties.get(seasonYear) || 0);
      const currSeasonAvg = Number(season?.stats?.avg ?? 0);
      const currSeasonFirstNine = Number(season?.stats?.firstNineAvg ?? 0);
      const currSeasonOneEighties = Number(season?.stats?.oneEightiesCount ?? 0);
      const currSeasonTotal180s = Number(season?.stats?.total180s ?? 0);

      if (
        round2(currSeasonAvg) !== nextSeasonAvg ||
        round2(currSeasonFirstNine) !== nextSeasonFirstNine ||
        currSeasonOneEighties !== nextSeasonOneEighties ||
        currSeasonTotal180s !== nextSeasonOneEighties
      ) {
        playerChanged = true;
      }

      const updatedSeasonHistory = (season.tournamentHistory || []).map((entry: any) => {
        const tournamentId = entry?.tournamentId;
        if (!tournamentId) return entry;
        const tournamentKey = tournamentObjectIdByCode.get(String(tournamentId)) || String(tournamentId);
        const nextHistoryAvg = toAvg(tournamentAvg.get(tournamentKey) || { score: 0, darts: 0 });
        const nextHistoryFirstNine = toAvg(tournamentFirstNine.get(tournamentKey) || { score: 0, darts: 0 });
        const nextHistoryOneEighties = Number(tournamentOneEighties.get(tournamentKey) || 0);
        const currHistoryAvg = Number(entry?.stats?.average ?? 0);
        const currHistoryFirstNine = Number(entry?.stats?.firstNineAvg ?? 0);
        const currHistoryOneEighties = Number(entry?.stats?.oneEightiesCount ?? 0);

        if (
          round2(currHistoryAvg) !== nextHistoryAvg ||
          round2(currHistoryFirstNine) !== nextHistoryFirstNine ||
          currHistoryOneEighties !== nextHistoryOneEighties
        ) {
          playerChanged = true;
        }

        return {
          ...entry,
          stats: {
            ...(entry.stats || {}),
            average: nextHistoryAvg,
            firstNineAvg: nextHistoryFirstNine,
            oneEightiesCount: nextHistoryOneEighties,
          },
        };
      });

      return {
        ...season,
        stats: {
          ...(season.stats || {}),
          avg: nextSeasonAvg,
          firstNineAvg: nextSeasonFirstNine,
          oneEightiesCount: nextSeasonOneEighties,
          total180s: nextSeasonOneEighties,
        },
        tournamentHistory: updatedSeasonHistory,
      };
    });

    if (!playerChanged) continue;
    changed += 1;

    bulkOps.push({
      updateOne: {
        filter: { _id: player._id },
        update: {
          $set: {
            stats: {
              ...(player.stats || {}),
              avg: nextCurrentAvg,
              firstNineAvg: nextCurrentFirstNine,
              oneEightiesCount: nextCurrentOneEighties,
              total180s: nextCurrentOneEighties,
            },
            tournamentHistory: updatedHistory,
            previousSeasons: updatedPreviousSeasons,
          },
        },
      },
    });

    if (bulkOps.length >= 300) {
      if (!dryRun) await PlayerModel.bulkWrite(bulkOps, { ordered: false });
      bulkOps.length = 0;
    }
  }

  if (bulkOps.length > 0 && !dryRun) {
    await PlayerModel.bulkWrite(bulkOps, { ordered: false });
  }

  console.log(`  players scanned=${scanned}, player docs updated=${changed}`);
  if (mismatchSamples.length > 0) {
    console.log("  player mismatch samples:");
    mismatchSamples.forEach((line) => console.log(`   - ${line}`));
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.log(`Starting average backfill (dryRun=${dryRun}) ...`);

  if (!process.env.MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is missing. Put it in .env.local/.env or run with MONGODB_URI=... npm run backfill:match-averages"
    );
  }

  await connectMongo();

  const aggregates = await buildAggregates(dryRun);
  await backfillTournamentPlayers(aggregates, dryRun);
  await backfillPlayers(aggregates, dryRun);

  console.log("Average backfill completed.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Average backfill failed:", error);
    process.exit(1);
  });
