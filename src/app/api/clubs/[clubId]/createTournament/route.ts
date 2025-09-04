import { NextRequest, NextResponse } from 'next/server';
import { TournamentService } from '@/database/services/tournament.service';
import { ClubService } from '@/database/services/club.service';
import { SubscriptionService } from '@/database/services/subscription.service';
import { TournamentDocument } from '@/interface/tournament.interface';
import { Document } from 'mongoose';
import { ClubModel } from '@/database/models/club.model';

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

    if (club.boards.length === 0) {
        console.log('Club has no boards');
        return NextResponse.json({ error: 'Club has no boards' }, { status: 400 });
    }

    if (!payload) {
        console.log('Invalid payload');
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Validate selected boards
    if (!payload.selectedBoards || payload.selectedBoards.length === 0) {
        console.log('No boards selected');
        return NextResponse.json({ error: 'No boards selected' }, { status: 400 });
    }

    // Check if selected boards are available
    // A board is available if tournamentId is undefined, null, empty string, or doesn't exist
    const availableBoards = club.boards.filter((board: any) => {
      const tournamentId = board.tournamentId;
      return !tournamentId || tournamentId === '' || tournamentId === null || tournamentId === undefined;
    });
    const selectedBoardNumbers = payload.selectedBoards;
    const availableBoardNumbers = availableBoards.map((board: any) => board.boardNumber);
    
    const invalidBoards = selectedBoardNumbers.filter((boardNumber: number) => 
        !availableBoardNumbers.includes(boardNumber)
    );
    
    if (invalidBoards.length > 0) {
        console.log('Selected boards are not available');
        return NextResponse.json({ 
            error: `Selected boards are not available: ${invalidBoards.join(', ')}` 
        }, { status: 400 });
    }

    // Check subscription limits
    const tournamentStartDate = payload.startDate ? new Date(payload.startDate) : new Date();
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

    // Tournament alapértelmezett értékek
    const now = new Date();
    const tournament = {
        clubId: club._id,
        league: payload.leagueId || undefined, // Optional league assignment
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
            boardCount: payload.selectedBoards.length,
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
    } as Partial<Omit<TournamentDocument, keyof Document>>;

    const newTournament = await TournamentService.createTournament(tournament);
    
    // Assign boards to tournament
    if (newTournament) {
        console.log('=== BOARD ASSIGNMENT DEBUG ===');
        console.log('Tournament ID:', newTournament.tournamentId);
        console.log('Selected boards:', selectedBoardNumbers);
        
        // Update each selected board individually
        for (const boardNumber of selectedBoardNumbers) {
            const updateResult = await ClubModel.updateOne(
                { 
                    _id: club._id,
                    'boards.boardNumber': boardNumber
                },
                { 
                    $set: { 
                        'boards.$.tournamentId': newTournament.tournamentId 
                    } 
                }
            );
            console.log(`Board ${boardNumber} update result:`, updateResult);
        }
        
        // Verify the assignment
        const updatedClub = await ClubModel.findById(club._id);
        const assignedBoards = updatedClub.boards.filter((board: any) => 
            board.tournamentId === newTournament.tournamentId
        );
        console.log('Assigned boards after update:', assignedBoards.map((b: any) => ({
            boardNumber: b.boardNumber,
            tournamentId: b.tournamentId
        })));
        console.log('================================');
    }

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
