import { connectMongo } from '@/lib/mongoose';
import { ClubModel } from '@/database/models/club.model';
import { TournamentModel } from '@/database/models/tournament.model';
import { GeocodingService } from '@/database/services/geocoding.service';

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

async function backfillClubs(batchSize = 50) {
  let processed = 0;
  while (true) {
    const retryBefore = new Date(Date.now() - COOLDOWN_MS);
    const clubs = await ClubModel.find({
      $or: [{ location: { $exists: true, $ne: '' } }, { address: { $exists: true, $ne: '' } }],
      $and: [
        {
          $or: [
            { 'structuredLocation.lat': { $exists: false } },
            { 'structuredLocation.lat': null },
            { 'structuredLocation.lng': { $exists: false } },
            { 'structuredLocation.lng': null },
            { 'structuredLocation.geocodeStatus': { $in: ['pending', 'failed', 'needs_review'] } },
          ],
        },
        {
          $or: [
            { 'structuredLocation.geocodeUpdatedAt': { $exists: false } },
            { 'structuredLocation.geocodeUpdatedAt': null },
            { 'structuredLocation.geocodeUpdatedAt': { $lte: retryBefore } },
          ],
        },
      ],
    })
      .select('_id location address')
      .limit(batchSize);

    if (clubs.length === 0) break;

    for (const club of clubs) {
      const rawLocation = (club.location || club.address || '').trim();
      if (!rawLocation) continue;
      const geocodeResult = await GeocodingService.geocodeAddress(rawLocation, 'backfill');
      club.set('structuredLocation', geocodeResult.location);
      await club.save();
      processed += 1;
    }
  }
  return processed;
}

async function backfillTournaments(batchSize = 50) {
  let processed = 0;
  while (true) {
    const retryBefore = new Date(Date.now() - COOLDOWN_MS);
    const tournaments = await TournamentModel.find({
      'tournamentSettings.location': { $exists: true, $ne: '' },
      $and: [
        {
          $or: [
            { 'tournamentSettings.locationData.lat': { $exists: false } },
            { 'tournamentSettings.locationData.lat': null },
            { 'tournamentSettings.locationData.lng': { $exists: false } },
            { 'tournamentSettings.locationData.lng': null },
            { 'tournamentSettings.locationData.geocodeStatus': { $in: ['pending', 'failed', 'needs_review'] } },
          ],
        },
        {
          $or: [
            { 'tournamentSettings.locationData.geocodeUpdatedAt': { $exists: false } },
            { 'tournamentSettings.locationData.geocodeUpdatedAt': null },
            { 'tournamentSettings.locationData.geocodeUpdatedAt': { $lte: retryBefore } },
          ],
        },
      ],
    })
      .select('_id tournamentSettings.location')
      .limit(batchSize);

    if (tournaments.length === 0) break;

    for (const tournament of tournaments) {
      const rawLocation = tournament.tournamentSettings?.location;
      if (!rawLocation) continue;
      const geocodeResult = await GeocodingService.geocodeAddress(rawLocation, 'backfill');
      tournament.set('tournamentSettings.locationData', geocodeResult.location);
      await tournament.save();
      processed += 1;
    }
  }
  return processed;
}

async function main() {
  await connectMongo();
  const clubCount = await backfillClubs();
  const tournamentCount = await backfillTournaments();
  console.log(`Backfill finished. clubs=${clubCount}, tournaments=${tournamentCount}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  });
