import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

for (const envFile of ['.env.load-test', '.env']) {
  const envPath = path.join(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

function parseArg(name, fallback = undefined) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

function toObjectId(value) {
  if (!value || !mongoose.isValidObjectId(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

async function resolveIds(db) {
  const tournaments = db.collection('tournaments');
  const matches = db.collection('matches');

  const clubIdArg = parseArg('clubId', process.env.BASELINE_CLUB_ID);
  const tournamentIdArg = parseArg('tournamentId', process.env.BASELINE_TOURNAMENT_ID);
  const playerIdArg = parseArg('playerId', process.env.BASELINE_PLAYER_ID);

  let tournamentDoc = null;
  if (tournamentIdArg) {
    tournamentDoc = await tournaments.findOne({
      $or: [{ tournamentId: tournamentIdArg }, { _id: toObjectId(tournamentIdArg) }],
    });
  }

  if (!tournamentDoc) {
    tournamentDoc = await tournaments.findOne(
      {
        isDeleted: { $ne: true },
        isArchived: { $ne: true },
      },
      { sort: { createdAt: -1 } },
    );
  }

  const tournamentObjectId = tournamentDoc?._id ?? null;
  const tournamentCode = tournamentDoc?.tournamentId ?? null;
  const clubId = toObjectId(clubIdArg) ?? tournamentDoc?.clubId ?? null;

  let playerId = toObjectId(playerIdArg);
  if (!playerId && tournamentDoc?.tournamentPlayers?.length) {
    const ref = tournamentDoc.tournamentPlayers[0]?.playerReference;
    playerId = toObjectId(ref?.toString?.() || String(ref || ''));
  }

  if (!playerId && tournamentObjectId) {
    const matchWithPlayer = await matches.findOne({
      tournamentRef: tournamentObjectId,
      status: 'finished',
      $or: [{ 'player1.playerId': { $exists: true } }, { 'player2.playerId': { $exists: true } }],
    });
    playerId =
      toObjectId(matchWithPlayer?.player1?.playerId?.toString?.()) ||
      toObjectId(matchWithPlayer?.player2?.playerId?.toString?.()) ||
      null;
  }

  return { clubId, tournamentObjectId, tournamentCode, playerId };
}

async function explain(collection, query, options = {}) {
  const cursor = collection.find(query, options);
  if (options.sort) cursor.sort(options.sort);
  if (options.limit) cursor.limit(options.limit);
  return cursor.explain('executionStats');
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is required');
  }

  const dbName = process.env.MONGODB_DB_NAME || 'tdarts_v2_test';
  const outFile =
    parseArg('out') ||
    path.join('src', 'features', 'tests', 'load', 'artifacts', `baseline-${Date.now()}.json`);

  await mongoose.connect(mongoUri, { dbName });
  const db = mongoose.connection.db;

  const ids = await resolveIds(db);
  if (!ids.tournamentObjectId || !ids.clubId) {
    throw new Error('Could not resolve baseline tournament/club IDs. Pass --clubId and --tournamentId.');
  }

  const tournaments = db.collection('tournaments');
  const matches = db.collection('matches');

  const results = {
    generatedAt: new Date().toISOString(),
    dbName,
    resolvedIds: {
      clubId: ids.clubId.toString(),
      tournamentObjectId: ids.tournamentObjectId.toString(),
      tournamentCode: ids.tournamentCode,
      playerId: ids.playerId ? ids.playerId.toString() : null,
    },
    explains: {},
  };

  results.explains.activeTournamentsByClub = await explain(
    tournaments,
    {
      clubId: ids.clubId,
      'tournamentSettings.status': { $in: ['pending', 'group-stage', 'knockout'] },
      isDeleted: { $ne: true },
      isArchived: { $ne: true },
    },
    { sort: { createdAt: -1 }, projection: { tournamentId: 1, createdAt: 1 }, limit: 50 },
  );

  results.explains.tournamentByCodeAndPlayerStatus = await explain(
    tournaments,
    {
      tournamentId: ids.tournamentCode,
      'tournamentPlayers.playerReference': ids.playerId || { $exists: true },
    },
    { projection: { _id: 1, tournamentId: 1, 'tournamentPlayers.$': 1 }, limit: 1 },
  );

  results.explains.listMatchesLifecycle = await explain(
    matches,
    { tournamentRef: ids.tournamentObjectId, status: { $in: ['pending', 'ongoing'] } },
    { projection: { _id: 1, status: 1, boardReference: 1 }, sort: { createdAt: 1 }, limit: 120 },
  );

  if (ids.playerId) {
    results.explains.finishedMatchesByTournamentAndPlayer = await explain(
      matches,
      {
        tournamentRef: ids.tournamentObjectId,
        status: 'finished',
        $or: [{ 'player1.playerId': ids.playerId }, { 'player2.playerId': ids.playerId }],
      },
      { projection: { _id: 1, createdAt: 1 }, sort: { createdAt: -1 }, limit: 150 },
    );
  } else {
    results.explains.finishedMatchesByTournamentAndPlayer = {
      skipped: true,
      reason: 'playerId not resolved',
    };
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2));

  console.log(`Baseline explain report written to ${outFile}`);
  console.log('Use this with db profiler snapshots for before/after comparisons.');
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
