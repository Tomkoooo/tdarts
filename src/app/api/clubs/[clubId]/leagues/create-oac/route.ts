import { NextResponse } from 'next/server';
import { LeagueModel } from '@/database/models/league.model';
import { connectMongo } from '@/lib/mongoose';
import { DEFAULT_LEAGUE_POINTS_CONFIG } from '@/interface/league.interface';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __POST(
  request: Request,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    await connectMongo();
    
    // 1. Security Check
    const internalSecret = request.headers.get('x-internal-secret');
    const expectedSecret = process.env.INTERNAL_API_SECRET || 'development-secret-change-in-production';
    
    if (internalSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clubId } = await params;
    const body = await request.json();
    const { creatorId, name, description } = body;

    if (!clubId || !creatorId || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: creatorId, name' },
        { status: 400 }
      );
    }

    // 2. Check for duplicate league names within the club
    const existingLeague = await LeagueModel.findOne({ 
      club: clubId, 
      name: name,
      isActive: true 
    });
    
    if (existingLeague) {
      return NextResponse.json(
        { error: 'A league with this name already exists in the club' },
        { status: 400 }
      );
    }

    // 3. Create Verified League Directly
    const league = new LeagueModel({
      name,
      description,
      club: clubId,
      pointsConfig: DEFAULT_LEAGUE_POINTS_CONFIG,
      pointSystemType: 'remiz_christmas', // Set to Remiz scoring
      createdBy: creatorId,
      startDate: new Date(),
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      attachedTournaments: [],
      players: [],
      verified: true, // Mark as verified OAC league
      isActive: true
    });

    await league.save();

    // 4. Verify the Club
    const { ClubModel } = await import('@/database/models/club.model');
    // Use { new: true } to get the updated document back after update
    const updatedClub = await ClubModel.findByIdAndUpdate(
      clubId, 
      { verified: true }, 
      { new: true }
    );
    // Optionally fetch fresh if not found (paranoid, not usually needed if inputs valid)
    // const updatedClub = await ClubModel.findById(clubId);

    return NextResponse.json({ league, updatedClub }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating OAC league:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export const POST = withApiTelemetry('/api/clubs/[clubId]/leagues/create-oac', __POST as any);
