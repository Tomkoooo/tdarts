import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { ClubModel } from '@/database/models/club.model';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    await connectMongo();
    const { clubId } = await params;
    
    const club = await ClubModel.findById(clubId);
    if (!club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    // Get all boards for the club
    const boards = club.boards || [];
    
    // Filter out boards that are assigned to active tournaments
    // A board is available if tournamentId is undefined, null, empty string, or doesn't exist
    const availableBoards = boards.filter((board: any) => {
      const tournamentId = board.tournamentId;
      return !tournamentId || tournamentId === '' || tournamentId === null || tournamentId === undefined;
    });
    const assignedBoards = boards.filter((board: any) => {
      const tournamentId = board.tournamentId;
      return tournamentId && tournamentId !== '' && tournamentId !== null && tournamentId !== undefined;
    });

    console.log('=== BOARDS DEBUG ===');
    console.log('Total boards:', boards.length);
    console.log('Available boards:', availableBoards.length);
    console.log('Assigned boards:', assignedBoards.length);
    console.log('Assigned boards details:', assignedBoards.map((b: any) => ({
      boardNumber: b.boardNumber,
      tournamentId: b.tournamentId
    })));
    console.log('========================');

    return NextResponse.json({ 
      boards: availableBoards,
      totalBoards: boards.length,
      availableBoards: availableBoards.length,
      assignedBoards: assignedBoards.length
    });
  } catch (error: any) {
    console.error('Error fetching boards:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 