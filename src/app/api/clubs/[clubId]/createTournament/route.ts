import { NextRequest, NextResponse } from 'next/server';
import { TournamentService } from '@/database/services/tournament.service';
import { ClubService } from '@/database/services/club.service';
import { TournamentDocument } from '@/interface/tournament.interface';
import { Document } from 'mongoose';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await params;
    const payload = await request.json();
    const club = await ClubService.getClub(clubId);
    if (!club) {
        return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    // Tournament alapértelmezett értékek
    const now = new Date();
    const tournament = {
        clubId: club._id,
        tournamentPlayers: [],
        groups: [],
        knockout: [],
        tournamentSettings: {
            status: 'pending',
            name: payload.name,
            description: payload.description || '',
            startDate: payload.startDate ? new Date(payload.startDate) : now,
            maxPlayers: payload.maxPlayers,
            format: payload.format,
            startingScore: payload.startingScore,
            boardCount: club.boards.length,
            entryFee: payload.entryFee,
            tournamentPassword: payload.tournamentPassword,
            // New fields
            location: payload.location || null,
            prize: payload.prize || null,
            type: payload.type || 'amateur',
            registrationOpen: payload.registrationOpen !== undefined ? payload.registrationOpen : true,
            registrationDeadline: payload.registrationDeadline ? new Date(payload.registrationDeadline) : null,
        },
        createdAt: now,
        updatedAt: now,
        isActive: true,
        isDeleted: false,
        isArchived: false,
        isCancelled: false,
    } as Partial<Omit<TournamentDocument, keyof Document>>;

    const newTournament = await TournamentService.createTournament(tournament);
    return NextResponse.json(newTournament);
}
