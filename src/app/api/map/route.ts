import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { ClubModel } from '@/database/models/club.model';
import { TournamentModel } from '@/database/models/tournament.model';

const hasCoordinates = (lat?: number | null, lng?: number | null) =>
  typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng);

export async function POST(request: Request) {
  try {
    await connectMongo();
    const body = await request.json().catch(() => ({}));
    const query = (body?.query || '').trim();
    const showClubs = body?.showClubs !== false;
    const showTournaments = body?.showTournaments !== false;
    const queryRegex = query ? new RegExp(query, 'i') : null;
    const now = new Date();

    const [clubs, tournaments] = await Promise.all([
      showClubs
        ? ClubModel.find({
            isActive: { $ne: false },
            ...(queryRegex
              ? {
                  $or: [
                    { name: queryRegex },
                    { location: queryRegex },
                    { address: queryRegex },
                    { 'structuredLocation.formattedAddress': queryRegex },
                  ],
                }
              : {}),
          })
            .select('name location address structuredLocation landingPage.logo updatedAt')
            .lean()
        : [],
      showTournaments
        ? TournamentModel.find({
            isDeleted: { $ne: true },
            isArchived: { $ne: true },
            isSandbox: { $ne: true },
            'tournamentSettings.startDate': { $gte: now },
            ...(queryRegex
              ? {
                  $or: [
                    { 'tournamentSettings.name': queryRegex },
                    { 'tournamentSettings.location': queryRegex },
                    { 'tournamentSettings.locationData.formattedAddress': queryRegex },
                  ],
                }
              : {}),
          })
            .select(
              'tournamentId tournamentSettings.name tournamentSettings.startDate tournamentSettings.location tournamentSettings.locationData tournamentSettings.coverImage updatedAt'
            )
            .lean()
        : [],
    ]);

    const clubItems = clubs.map((club: any) => ({
        id: club._id.toString(),
        kind: 'club' as const,
        name: club.name,
        address: club.structuredLocation?.formattedAddress || club.location || club.address || null,
        lat: club.structuredLocation?.lat ?? null,
        lng: club.structuredLocation?.lng ?? null,
        mapReady: hasCoordinates(club.structuredLocation?.lat, club.structuredLocation?.lng),
        previewImage: club.landingPage?.logo || club.structuredLocation?.previewImage || null,
        geocodeStatus: club.structuredLocation?.geocodeStatus || 'needs_review',
        updatedAt: club.updatedAt,
        href: `/clubs/${club._id.toString()}`,
      }));

    const tournamentItems = tournaments.map((tournament: any) => ({
        id: tournament.tournamentId,
        kind: 'tournament' as const,
        name: tournament.tournamentSettings?.name,
        address:
          tournament.tournamentSettings?.locationData?.formattedAddress || tournament.tournamentSettings?.location || null,
        lat: tournament.tournamentSettings?.locationData?.lat ?? null,
        lng: tournament.tournamentSettings?.locationData?.lng ?? null,
        mapReady: hasCoordinates(
          tournament.tournamentSettings?.locationData?.lat,
          tournament.tournamentSettings?.locationData?.lng
        ),
        previewImage:
          tournament.tournamentSettings?.coverImage || tournament.tournamentSettings?.locationData?.previewImage || null,
        geocodeStatus: tournament.tournamentSettings?.locationData?.geocodeStatus || 'needs_review',
        startDate: tournament.tournamentSettings?.startDate || null,
        updatedAt: tournament.updatedAt,
        href: `/tournaments/${tournament.tournamentId}`,
      }));

    return NextResponse.json({
      items: [...clubItems, ...tournamentItems],
      counts: {
        clubs: clubItems.length,
        tournaments: tournamentItems.length,
        total: clubItems.length + tournamentItems.length,
      },
    });
  } catch (error) {
    console.error('Map API error:', error);
    return NextResponse.json({ error: 'Failed to load map items' }, { status: 500 });
  }
}
