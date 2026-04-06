import mongoose, { Types } from "mongoose";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { connectMongo } from "@/lib/mongoose";
import { MatchModel } from "@/database/models/match.model";
import { PlayerModel } from "@/database/models/player.model";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "../../..");
const repoRoot = path.resolve(appRoot, "../..");

function loadEnvFile(envPath: string): void {
  if (!fs.existsSync(envPath)) return;
  const parsed = dotenv.parse(fs.readFileSync(envPath));
  for (const [key, value] of Object.entries(parsed)) {
    // Preserve explicitly provided non-empty process env values.
    if (process.env[key] === undefined || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(appRoot, ".env.local"));
loadEnvFile(path.join(appRoot, ".env"));
loadEnvFile(path.join(repoRoot, ".env.local"));
loadEnvFile(path.join(repoRoot, ".env"));
loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));


type AggregateRow = {
  _id: Types.ObjectId;
  values?: number[];
};

function toAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

async function recalculateBatch(playerIds: Types.ObjectId[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  for (const playerId of playerIds) {
    result.set(playerId.toString(), 0);
  }
  if (playerIds.length === 0) return result;

  const rows = await MatchModel.aggregate<AggregateRow>([
    {
      $match: {
        status: "finished",
        $or: [{ "player1.playerId": { $in: playerIds } }, { "player2.playerId": { $in: playerIds } }],
      },
    },
    {
      $project: {
        tournamentRef: 1,
        createdAt: 1,
        sides: [
          { playerId: "$player1.playerId", average: "$player1.average" },
          { playerId: "$player2.playerId", average: "$player2.average" },
        ],
      },
    },
    { $unwind: "$sides" },
    {
      $match: {
        "sides.playerId": { $in: playerIds },
        "sides.average": { $gt: 0 },
      },
    },
    {
      $lookup: {
        from: "tournaments",
        let: { tournamentId: "$tournamentRef" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$tournamentId"] } } },
          { $match: { "tournamentSettings.status": "finished" } },
          { $project: { _id: 1 } },
        ],
        as: "tournamentMatch",
      },
    },
    { $match: { tournamentMatch: { $ne: [] } } },
    { $sort: { "sides.playerId": 1, createdAt: -1 } },
    {
      $group: {
        _id: "$sides.playerId",
        values: { $push: "$sides.average" },
      },
    },
    {
      $project: {
        values: { $slice: ["$values", 10] },
      },
    },
  ]);

  for (const row of rows) {
    const normalized = (row.values || [])
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);
    result.set(row._id.toString(), toAverage(normalized));
  }

  return result;
}

async function runBackfill(): Promise<void> {
  await connectMongo();

  const batchSize = 500;
  let page = 0;
  let updatedCount = 0;

  while (true) {
    const players = await PlayerModel.find({}, { _id: 1 }).sort({ _id: 1 }).skip(page * batchSize).limit(batchSize).lean();
    if (players.length === 0) break;

    const playerIds = players
      .map((player) => player?._id)
      .filter((id): id is Types.ObjectId => Boolean(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const averages = await recalculateBatch(playerIds);

    const operations = playerIds.map((id) => ({
      updateOne: {
        filter: { _id: id },
        // Only touch the new metric to keep the backfill fully backward-safe.
        update: { $set: { "stats.last10ClosedAvg": averages.get(id.toString()) ?? 0 } },
      },
    }));

    if (operations.length > 0) {
      // Use the native collection bulk API to avoid Mongoose mutation of update documents.
      const res = await PlayerModel.collection.bulkWrite(operations as any[], { ordered: false });
      updatedCount += res.modifiedCount ?? 0;
    }

    page += 1;
    console.log(`Processed ${page * batchSize} players (updated: ${updatedCount})`);
  }

  console.log(`Backfill completed. Updated players: ${updatedCount}`);
}

runBackfill()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error("Backfill failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  });
