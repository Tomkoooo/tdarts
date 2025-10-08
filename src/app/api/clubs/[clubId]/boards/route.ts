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

    // Boards are now managed at tournament level
    // This endpoint returns empty array for backwards compatibility
    console.log('=== BOARDS INFO ===');
    console.log('Boards are now managed at tournament level');
    console.log('===================');

    return NextResponse.json({ 
      boards: [],
      totalBoards: 0,
      availableBoards: 0,
      assignedBoards: 0,
      message: 'Boards are now managed at tournament level'
    });
  } catch (error: any) {
    console.error('Error fetching boards:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 