import path from "path";
import dotenv from "dotenv";
import { connectMongo } from "@/lib/mongoose";
import { MatchModel } from "@/database/models/match.model";
import { TournamentModel } from "@/database/models/tournament.model";
import { PlayerModel } from "@/database/models/player.model";
import mongoose from "mongoose";

// Standalone scripts don't always auto-load Next env files.
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

type ScoreDarts = { score: number; darts: number };

const round2 = (value: number) => Math.round(value * 100) / 100;

const toAvg = ({ score, darts }: ScoreDarts) => (darts > 0 ? round2((score / darts) * 3) : 0);

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

const firstNineFromThrows = (throws: any[] | undefined): ScoreDarts => {
  if (!Array.isArray(throws) || throws.length === 0) return { score: 0, darts: 0 };
  const firstVisits = throws.slice(0, 3);
  const score = firstVisits.reduce((sum, t) => sum + Number(t?.score || 0), 0);
  const darts = firstVisits.reduce((sum, t) => sum + Number(t?.darts || 3), 0);
  return { score, darts };
};

const addScoreDarts = (target: ScoreDarts, next: ScoreDarts) => {
  target.score += next.score;
  target.darts += next.darts;
};

const calculateMatchFirstNine = (match: any) => {
  const p1: ScoreDarts = { score: 0, darts: 0 };
  const p2: ScoreDarts = { score: 0, darts: 0 };

  for (const leg of match.legs || []) {
    addScoreDarts(p1, firstNineFromThrows(leg?.player1Throws));
    addScoreDarts(p2, firstNineFromThrows(leg?.player2Throws));
  }

  return {
    player1FirstNineAvg: toAvg(p1),
    player2FirstNineAvg: toAvg(p2),
  };
};

async function backfillMatches(dryRun: boolean) {
  console.log("Step 1/3: Backfilling match.playerX.firstNineAvg ...");
  const cursor = MatchModel.find({ "legs.0": { $exists: true } })
    .select("_id legs player1 player2")
    .cursor();

  const bulkOps: any[] = [];
  let scanned = 0;
  let changed = 0;

  for await (const match of cursor) {
    scanned += 1;
    const hasP1 = Boolean(match.player1?.playerId);
    const hasP2 = Boolean(match.player2?.playerId);
    if (!hasP1 && !hasP2) continue;

    const { player1FirstNineAvg, player2FirstNineAvg } = calculateMatchFirstNine(match);
    const currentP1 = Number(match.player1?.firstNineAvg ?? 0);
    const currentP2 = Number(match.player2?.firstNineAvg ?? 0);

    if (round2(currentP1) === player1FirstNineAvg && round2(currentP2) === player2FirstNineAvg) continue;

    changed += 1;
    bulkOps.push({
      updateOne: {
        filter: { _id: match._id },
        update: {
          $set: {
            ...(hasP1 ? { "player1.firstNineAvg": player1FirstNineAvg } : {}),
            ...(hasP2 ? { "player2.firstNineAvg": player2FirstNineAvg } : {}),
          },
        },
      },
    });

    if (bulkOps.length >= 500) {
      if (!dryRun) {
        await MatchModel.bulkWrite(bulkOps, { ordered: false });
      }
      bulkOps.length = 0;
    }
  }

  if (bulkOps.length > 0 && !dryRun) {
    await MatchModel.bulkWrite(bulkOps, { ordered: false });
  }

  console.log(`  matches scanned=${scanned}, updated=${changed}, dryRun=${dryRun}`);
}

async function backfillTournamentPlayers(dryRun: boolean) {
  console.log("Step 2/3: Backfilling tournamentPlayers.stats.firstNineAvg ...");

  const tournaments = await TournamentModel.find({})
    .select("_id tournamentId tournamentPlayers.playerReference tournamentPlayers.stats")
    .lean();

  let scanned = 0;
  let changed = 0;

  for (const tournament of tournaments) {
    scanned += 1;
    const perPlayer = new Map<string, ScoreDarts>();

    const matches = await MatchModel.find({
      tournamentRef: tournament._id,
      status: "finished",
      "legs.0": { $exists: true },
    })
      .select("player1 player2 legs")
      .lean();

    for (const match of matches) {
      const p1Id = getId(match.player1?.playerId);
      const p2Id = getId(match.player2?.playerId);

      if (p1Id) {
        if (!perPlayer.has(p1Id)) perPlayer.set(p1Id, { score: 0, darts: 0 });
        const acc = perPlayer.get(p1Id)!;
        for (const leg of match.legs || []) {
          addScoreDarts(acc, firstNineFromThrows(leg?.player1Throws));
        }
      }

      if (p2Id) {
        if (!perPlayer.has(p2Id)) perPlayer.set(p2Id, { score: 0, darts: 0 });
        const acc = perPlayer.get(p2Id)!;
        for (const leg of match.legs || []) {
          addScoreDarts(acc, firstNineFromThrows(leg?.player2Throws));
        }
      }
    }

    const updatePlayers = (tournament.tournamentPlayers || []).map((tp: any) => {
      const playerId = getId(tp.playerReference);
      const avg = toAvg(perPlayer.get(playerId) || { score: 0, darts: 0 });
      const current = Number(tp?.stats?.firstNineAvg ?? 0);
      if (round2(current) !== avg) changed += 1;
      return {
        ...tp,
        stats: {
          ...(tp.stats || {}),
          firstNineAvg: avg,
        },
      };
    });

    if (!dryRun) {
      await TournamentModel.updateOne(
        { _id: tournament._id },
        { $set: { tournamentPlayers: updatePlayers } }
      );
    }
  }

  console.log(`  tournaments scanned=${scanned}, tournament-player updates=${changed}, dryRun=${dryRun}`);
}

async function backfillPlayers(dryRun: boolean) {
  console.log("Step 3/3: Backfilling player stats/history/previousSeasons firstNineAvg ...");

  // Build per-player and per-season accumulators from finished matches.
  const perPlayerSeason = new Map<string, Map<number, ScoreDarts>>();
  const matches = await MatchModel.find({
    status: "finished",
    "legs.0": { $exists: true },
  })
    .select("player1 player2 legs createdAt")
    .lean();

  const addForPlayerSeason = (playerId: string, year: number, data: ScoreDarts) => {
    if (!playerId) return;
    if (!perPlayerSeason.has(playerId)) perPlayerSeason.set(playerId, new Map<number, ScoreDarts>());
    const seasonMap = perPlayerSeason.get(playerId)!;
    if (!seasonMap.has(year)) seasonMap.set(year, { score: 0, darts: 0 });
    addScoreDarts(seasonMap.get(year)!, data);
  };

  for (const match of matches) {
    const year = new Date(match.createdAt).getFullYear();
    const p1Id = getId(match.player1?.playerId);
    const p2Id = getId(match.player2?.playerId);

    const p1: ScoreDarts = { score: 0, darts: 0 };
    const p2: ScoreDarts = { score: 0, darts: 0 };
    for (const leg of match.legs || []) {
      addScoreDarts(p1, firstNineFromThrows(leg?.player1Throws));
      addScoreDarts(p2, firstNineFromThrows(leg?.player2Throws));
    }

    addForPlayerSeason(p1Id, year, p1);
    addForPlayerSeason(p2Id, year, p2);
  }

  const tournamentMap = new Map<string, any>();
  const tournaments = await TournamentModel.find({})
    .select("tournamentId tournamentPlayers.playerReference tournamentPlayers.stats.firstNineAvg")
    .lean();
  for (const tournament of tournaments) {
    tournamentMap.set(tournament.tournamentId, tournament);
  }

  const players = await PlayerModel.find({}).lean();
  let changed = 0;
  const currentYear = new Date().getFullYear();

  for (const player of players) {
    const playerId = getId(player._id);
    const seasonMap = perPlayerSeason.get(playerId) || new Map<number, ScoreDarts>();

    const currentFirstNine = toAvg(seasonMap.get(currentYear) || { score: 0, darts: 0 });
    const currentStats = { ...(player.stats || {}), firstNineAvg: currentFirstNine };

    const tournamentHistory = (player.tournamentHistory || []).map((entry: any) => {
      const tournament = tournamentMap.get(entry.tournamentId);
      const tp = tournament?.tournamentPlayers?.find(
        (p: any) => getId(p.playerReference) === playerId
      );
      const firstNineAvg = Number(tp?.stats?.firstNineAvg ?? entry?.stats?.firstNineAvg ?? 0);
      return {
        ...entry,
        stats: {
          ...(entry.stats || {}),
          firstNineAvg,
        },
      };
    });

    const previousSeasons = (player.previousSeasons || []).map((season: any) => {
      const seasonYear = Number(season.year);
      const seasonFirstNine = toAvg(seasonMap.get(seasonYear) || { score: 0, darts: 0 });
      const seasonHistory = (season.tournamentHistory || []).map((entry: any) => {
        const tournament = tournamentMap.get(entry.tournamentId);
        const tp = tournament?.tournamentPlayers?.find(
          (p: any) => getId(p.playerReference) === playerId
        );
        const firstNineAvg = Number(tp?.stats?.firstNineAvg ?? entry?.stats?.firstNineAvg ?? 0);
        return {
          ...entry,
          stats: {
            ...(entry.stats || {}),
            firstNineAvg,
          },
        };
      });

      return {
        ...season,
        stats: {
          ...(season.stats || {}),
          firstNineAvg: seasonFirstNine,
        },
        tournamentHistory: seasonHistory,
      };
    });

    if (!dryRun) {
      await PlayerModel.updateOne(
        { _id: player._id },
        {
          $set: {
            stats: currentStats,
            tournamentHistory,
            previousSeasons,
          },
        }
      );
    }
    changed += 1;
  }

  console.log(`  players updated=${changed}, dryRun=${dryRun}`);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.log(`Starting firstNineAvg backfill (dryRun=${dryRun}) ...`);
  if (!process.env.MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is missing. Put it in .env.local/.env or run with MONGODB_URI=... npm run backfill:first-nine-avg"
    );
  }
  await connectMongo();

  await backfillMatches(dryRun);
  await backfillTournamentPlayers(dryRun);
  await backfillPlayers(dryRun);

  console.log("firstNineAvg backfill completed.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("firstNineAvg backfill failed:", error);
    process.exit(1);
  });
