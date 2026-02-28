import { NextResponse } from 'next/server';
import { LeagueService } from '@/database/services/league.service';
import { connectMongo } from '@/lib/mongoose';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __POST(request: Request) {
  try {
    await connectMongo();
    
    const body = await request.json();
    const { clubId, creatorId, name, description } = body;

    if (!clubId || !creatorId || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: clubId, creatorId, name' },
        { status: 400 }
      );
    }

    // Create the league
    const league = await LeagueService.createLeague(clubId, creatorId, {
      name,
      description,
      startDate: new Date(),
      // Default to 1 year duration or similar, or let service handle defaults
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      pointSystemType: 'platform', // Default point system
    });

    return NextResponse.json({ league }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating league:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: error.statusCode || 500 }
    );
  }
}

export const POST = withApiTelemetry('/api/clubs/leagues', __POST as any);
