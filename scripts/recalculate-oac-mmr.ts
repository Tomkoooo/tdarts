import path from "path";
import dotenv from "dotenv";
import { connectMongo } from "@/lib/mongoose";
import { PlayerModel } from "@/database/models/player.model";
import { TournamentModel } from "@/database/models/tournament.model";
import { OacMmrService } from "@/database/services/oac-mmr.service";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

type CliOptions = {
  dryRun: boolean;
  playerId?: string;
  minParticipants: number;
  includeUnverified: boolean;
  requireWinGate: boolean;
  baseMmr: number;
};

type TournamentMeta = {
  verified: boolean;
  totalParticipants: number;
};

const toNumber = (value: unknown, fallback = 0): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const parseOptions = (): CliOptions => {
  const args = process.argv.slice(2);
  const getValue = (key: string): string | undefined => {
    const prefix = `--${key}=`;
    const found = args.find((arg) => arg.startsWith(prefix));
    return found ? found.slice(prefix.length) : undefined;
  };

  return {
    dryRun: !args.includes("--write"),
    playerId: getValue("player-id"),
    minParticipants: toNumber(getValue("min-participants"), 16),
    includeUnverified: args.includes("--include-unverified"),
    requireWinGate: args.includes("--require-win"),
    baseMmr: toNumber(getValue("base-mmr"), OacMmrService.BASE_OAC_MMR),
  };
};

const buildTournamentMeta = async (): Promise<Map<string, TournamentMeta>> => {
  const tournaments = await TournamentModel.find({})
    .select("tournamentId verified tournamentPlayers.status")
    .lean();

  const result = new Map<string, TournamentMeta>();

  for (const tournament of tournaments) {
    const checkedIn = (tournament.tournamentPlayers || []).filter((p: any) => p?.status === "checked-in").length;
    const totalParticipants = checkedIn > 0 ? checkedIn : (tournament.tournamentPlayers || []).length;

    if (tournament.tournamentId) {
      result.set(String(tournament.tournamentId), {
        verified: Boolean(tournament.verified),
        totalParticipants,
      });
    }
  }

  return result;
};

const computeNextMmr = (
  currentMmr: number,
  entry: any,
  verifiedAverage: number,
  participants: number,
  tournamentAverage: number,
  options: CliOptions
): number => {
  const matchesWon = toNumber(entry?.stats?.matchesWon);

  if (options.requireWinGate && matchesWon === 0) {
    return currentMmr;
  }

  return OacMmrService.calculateMMRChange({
    currentOacMmr: currentMmr,
    placement: Math.max(1, toNumber(entry?.position, participants || 1)),
    totalParticipants: Math.max(1, participants),
    currentAverage: toNumber(entry?.stats?.average),
    verifiedAverage,
    tournamentAverage,
    firstNineAvg: toNumber(entry?.stats?.firstNineAvg),
    oneEightiesCount: toNumber(entry?.stats?.oneEightiesCount),
    highestCheckout: toNumber(entry?.stats?.highestCheckout),
    matchesWon,
  });
};

async function main() {
  const options = parseOptions();

  if (!process.env.MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is missing. Put it in .env.local/.env or run with MONGODB_URI=... npm run recalc:oac-mmr"
    );
  }

  await connectMongo();
  const tournamentMeta = await buildTournamentMeta();

  const playerFilter = options.playerId ? { _id: options.playerId } : {};
  const players = await PlayerModel.find(playerFilter)
    .select("_id name stats.oacMmr tournamentHistory")
    .lean();

  const tournamentAverageAccumulator = new Map<string, { total: number; count: number }>();
  for (const player of players) {
    const history = Array.isArray(player.tournamentHistory) ? player.tournamentHistory : [];
    for (const entry of history) {
      const tournamentId = String(entry?.tournamentId || "");
      const avg = toNumber(entry?.stats?.average);
      if (!tournamentId || avg <= 0) continue;
      const existing = tournamentAverageAccumulator.get(tournamentId) || { total: 0, count: 0 };
      existing.total += avg;
      existing.count += 1;
      tournamentAverageAccumulator.set(tournamentId, existing);
    }
  }
  const tournamentAverageById = new Map<string, number>();
  for (const [tournamentId, value] of tournamentAverageAccumulator) {
    tournamentAverageById.set(tournamentId, value.count > 0 ? value.total / value.count : 0);
  }

  console.log(
    `Starting OAC MMR recalculation (dryRun=${options.dryRun}) for ${players.length} player(s), minParticipants=${options.minParticipants}, includeUnverified=${options.includeUnverified}, requireWinGate=${options.requireWinGate}`
  );

  let playersChanged = 0;
  let historyEntriesUpdated = 0;

  const zeroReasonCounters = {
    ineligibleParticipants: 0,
    ineligibleUnverified: 0,
    ineligibleZeroWins: 0,
    missingTournamentMeta: 0,
  };

  const bulkOps: any[] = [];

  for (const player of players) {
    const history = Array.isArray(player.tournamentHistory) ? [...player.tournamentHistory] : [];
    if (history.length === 0) {
      continue;
    }

    const withIndex = history.map((entry: any, index: number) => ({ entry, index }));
    withIndex.sort((a, b) => {
      const aDate = new Date(a.entry?.date || 0).getTime();
      const bDate = new Date(b.entry?.date || 0).getTime();
      return aDate - bDate;
    });

    let runningMmr = options.baseMmr;
    const verifiedForAverage: any[] = [];
    const updatedByOriginalIndex = new Map<number, any>();
    let playerChanged = false;

    for (const { entry, index } of withIndex) {
      const tournamentId = String(entry?.tournamentId || "");
      const meta = tournamentMeta.get(tournamentId);
      const isVerifiedTournament = meta ? meta.verified : Boolean(entry?.verified ?? entry?.isVerified);
      const participants = meta ? meta.totalParticipants : 0;
      const matchesWon = toNumber(entry?.stats?.matchesWon);

      const eligibleByVerification = options.includeUnverified || isVerifiedTournament;
      const eligibleByParticipants = participants >= options.minParticipants;
      const eligibleByWins = options.requireWinGate ? matchesWon > 0 : true;
      const shouldRecalculate = eligibleByVerification && eligibleByParticipants && eligibleByWins;

      if (!meta) {
        zeroReasonCounters.missingTournamentMeta += 1;
      }
      if (!eligibleByVerification) {
        zeroReasonCounters.ineligibleUnverified += 1;
      }
      if (!eligibleByParticipants) {
        zeroReasonCounters.ineligibleParticipants += 1;
      }
      if (!eligibleByWins) {
        zeroReasonCounters.ineligibleZeroWins += 1;
      }

      const verifiedAverage = isVerifiedTournament ? OacMmrService.calculateVerifiedAverage(verifiedForAverage) : 0;
      const tournamentAverage = tournamentAverageById.get(tournamentId) || 0;
      const prevMmr = runningMmr;
      runningMmr = shouldRecalculate
        ? computeNextMmr(prevMmr, entry, verifiedAverage, participants, tournamentAverage, options)
        : prevMmr;
      const nextChange = runningMmr - prevMmr;

      const currentStored = toNumber(entry?.oacMmrChange);
      if (currentStored !== nextChange) {
        playerChanged = true;
        historyEntriesUpdated += 1;
      }

      updatedByOriginalIndex.set(index, {
        ...entry,
        oacMmrChange: nextChange,
        verified: isVerifiedTournament,
        isVerified: isVerifiedTournament,
      });

      if (isVerifiedTournament && toNumber(entry?.stats?.average) > 0) {
        verifiedForAverage.push({
          ...entry,
          verified: true,
        });
      }
    }

    const updatedHistory = history.map((entry: any, idx: number) => updatedByOriginalIndex.get(idx) || entry);
    const storedCurrent = toNumber(player?.stats?.oacMmr, options.baseMmr);
    if (storedCurrent !== runningMmr) {
      playerChanged = true;
    }

    if (playerChanged) {
      playersChanged += 1;
      bulkOps.push({
        updateOne: {
          filter: { _id: player._id },
          update: {
            $set: {
              tournamentHistory: updatedHistory,
              "stats.oacMmr": runningMmr,
            },
          },
        },
      });
    }

    if (bulkOps.length >= 300) {
      if (!options.dryRun) {
        await PlayerModel.bulkWrite(bulkOps, { ordered: false });
      }
      bulkOps.length = 0;
    }
  }

  if (bulkOps.length > 0 && !options.dryRun) {
    await PlayerModel.bulkWrite(bulkOps, { ordered: false });
  }

  console.log("OAC MMR recalculation summary:");
  console.log(`  players scanned: ${players.length}`);
  console.log(`  players changed: ${playersChanged}`);
  console.log(`  history entries updated: ${historyEntriesUpdated}`);
  console.log("  zero-change reason counters:");
  console.log(`    - ineligible participants (<${options.minParticipants}): ${zeroReasonCounters.ineligibleParticipants}`);
  console.log(`    - ineligible unverified: ${zeroReasonCounters.ineligibleUnverified}`);
  console.log(`    - ineligible zero wins: ${zeroReasonCounters.ineligibleZeroWins}`);
  console.log(`    - missing tournament metadata: ${zeroReasonCounters.missingTournamentMeta}`);
  console.log(`  mode: ${options.dryRun ? "dry-run (no writes)" : "write"}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("OAC MMR recalculation failed:", error);
    process.exit(1);
  });
