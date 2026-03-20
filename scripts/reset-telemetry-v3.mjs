import mongoose from 'mongoose';

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('Missing MONGO_URI or MONGODB_URI.');
  process.exit(1);
}

const dryRun = String(process.env.TELEMETRY_RESET_DRY_RUN || 'true').toLowerCase() !== 'false';
const collectionsToDrop = ['api_request_metrics', 'api_request_error_events', 'api_route_anomalies'];

async function main() {
  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('Failed to resolve db connection');

  const existing = await db.listCollections({}, { nameOnly: true }).toArray();
  const existingSet = new Set(existing.map((x) => x.name));

  for (const name of collectionsToDrop) {
    if (!existingSet.has(name)) {
      console.log(`[skip] ${name} does not exist`);
      continue;
    }
    if (dryRun) {
      console.log(`[dry-run] would drop ${name}`);
      continue;
    }
    await db.dropCollection(name);
    console.log(`[dropped] ${name}`);
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
