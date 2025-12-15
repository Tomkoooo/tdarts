import { NextRequest, NextResponse } from 'next/server';
import { TournamentService } from '@/database/services/tournament.service';
import { ClubService } from '@/database/services/club.service';
import { SubscriptionService } from '@/database/services/subscription.service';
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

    if (!payload) {
        console.log('Invalid payload');
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    
    if (!payload.boards || payload.boards.length === 0) {
        console.log('No boards provided');
        return NextResponse.json({ error: 'At least one board is required' }, { status: 400 });
    }

    // Authorization check
    const { AuthorizationService } = await import('@/database/services/authorization.service');
    const userId = await AuthorizationService.getUserIdFromRequest(request);
    
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAuthorized = await AuthorizationService.checkAdminOrModerator(userId, clubId);
    if (!isAuthorized) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check subscription limits
    // Check subscription limits (Skip for sandbox tournaments)
    const tournamentStartDate = payload.startDate ? new Date(payload.startDate) : new Date();
    
    if (!payload.isSandbox) {
        const subscriptionCheck = await SubscriptionService.canCreateTournament(clubId, tournamentStartDate);
        
        if (!subscriptionCheck.canCreate) {
            console.log('Subscription limit exceeded:', subscriptionCheck.errorMessage);
            return NextResponse.json({ 
                error: subscriptionCheck.errorMessage,
                subscriptionError: true,
                currentCount: subscriptionCheck.currentCount,
                maxAllowed: subscriptionCheck.maxAllowed,
                planName: subscriptionCheck.planName
            }, { status: 403 });
        }
    }

    // Check Verified League constraints
    if (payload.leagueId) {
        const { LeagueModel } = await import('@/database/models/league.model');
        const { TournamentModel } = await import('@/database/models/tournament.model');
        
        const league = await LeagueModel.findById(payload.leagueId);
        if (league && league.verified) {
            // Calculate start and end of the ISO week for the tournament start date
            const date = new Date(tournamentStartDate);
            const day = date.getDay() || 7; // Get current day number, converting Sun (0) to 7
            if (day !== 1) date.setHours(-24 * (day - 1)); // Set to Monday of this week
            date.setHours(0, 0, 0, 0);
            
            const weekStart = new Date(date);
            const weekEnd = new Date(date);
            weekEnd.setDate(weekEnd.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);

            // Check for existing tournaments in this league within the same week
            const existingTournament = await TournamentModel.findOne({
                league: payload.leagueId,
                'tournamentSettings.startDate': {
                    $gte: weekStart,
                    $lte: weekEnd
                },
                isDeleted: false,
                isCancelled: false
            });

            if (existingTournament) {
                return NextResponse.json({ 
                    error: 'Verified leagues can only host one tournament per week.' 
                }, { status: 400 });
            }
        }
    }

    // Tournament alapértelmezett értékek
    const now = new Date();
    const tournament = {
        clubId: club._id,
        league: payload.leagueId || undefined, // Optional league assignment
        tournamentPlayers: [],
        groups: [],
        knockout: [],
        boards: payload.boards || [], // Boards are now part of tournament
        tournamentSettings: {
            status: 'pending',
            name: payload.name,
            description: payload.description || '',
            startDate: payload.startDate ? new Date(payload.startDate) : now,
            maxPlayers: payload.maxPlayers,
            format: payload.format,
            startingScore: payload.startingScore,
            boardCount: payload.boards?.length || 0,
            entryFee: payload.entryFee,
            tournamentPassword: payload.tournamentPassword,
            location: payload.location || null,
            type: payload.type || 'amateur',
            registrationDeadline: payload.registrationDeadline ? new Date(payload.registrationDeadline) : null,
        },
        createdAt: now,
        updatedAt: now,
        isActive: true,
        isDeleted: false,
        isArchived: false,
        isCancelled: false,
        isSandbox: payload.isSandbox || false,
    } as Partial<Omit<TournamentDocument, keyof Document>>;

    
    const newTournament = await TournamentService.createTournament(tournament);
    
    console.log('Created tournament boards:', JSON.stringify(newTournament.boards, null, 2));
    console.log('================================');

    // Attach tournament to league if leagueId is provided
    if (payload.leagueId && newTournament) {
        try {
            const { LeagueService } = await import('@/database/services/league.service');
            const { AuthorizationService } = await import('@/database/services/authorization.service');
            
            // Get user ID from request (you'll need to implement this based on your auth)
            const userId = await AuthorizationService.getUserIdFromRequest(request);
            if (userId) {
                await LeagueService.attachTournamentToLeague(payload.leagueId, newTournament._id.toString(), userId);
                console.log('Tournament attached to league successfully');
            }
        } catch (error) {
            console.error('Error attaching tournament to league:', error);
            // Don't fail tournament creation if league attachment fails
        }
    }
    
    return NextResponse.json(newTournament);
}
