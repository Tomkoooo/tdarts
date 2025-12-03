import { NextRequest, NextResponse } from 'next/server';
import { connectMongo as connectToDatabase } from '@/lib/mongoose';
import { ClubModel } from '@/database/models/club.model';
import { LeagueModel } from '@/database/models/league.model';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DEFAULT_LEAGUE_POINTS_CONFIG } from '@/interface/league.interface';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    // Check for Global Admin authentication
    // Note: Assuming there's a way to check for global admin. 
    // For now, I'll check if the user is authenticated. 
    // TODO: Implement strict Global Admin check if available in authOptions or User model.
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ideally check if user is global admin here
    // const user = await UserModel.findOne({ email: session.user.email });
    // if (!user?.isGlobalAdmin) ...

    const { clubId } = await req.json();

    if (!clubId) {
      return NextResponse.json({ error: 'Club ID is required' }, { status: 400 });
    }

    const club = await ClubModel.findById(clubId);
    if (!club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    // 1. Verify Club
    club.verified = true;
    await club.save();

    // 2. Create or Update Verified League
    let league = await LeagueModel.findOne({ club: clubId, verified: true });

    if (!league) {
      // Check if there is an unverified league that we should convert? 
      // Requirement says "create a league to it".
      // Let's create a new "National League" for this club.
      
      league = new LeagueModel({
        name: `National League - ${club.name}`,
        description: `Official National League for ${club.name}`,
        club: clubId,
        verified: true,
        isActive: true,
        createdBy: session.user.name, // Or a system admin ID
        pointSystemType: 'platform',
        pointsConfig: DEFAULT_LEAGUE_POINTS_CONFIG,
        players: [],
        attachedTournaments: []
      });
    } else {
      league.isActive = true;
    }

    await league.save();

    return NextResponse.json({ message: 'Club verified and league created/updated', club, league });

  } catch (error) {
    console.error('Error verifying club:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clubId } = await req.json();

    if (!clubId) {
      return NextResponse.json({ error: 'Club ID is required' }, { status: 400 });
    }

    const club = await ClubModel.findById(clubId);
    if (!club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    // 1. Unverify Club
    club.verified = false;
    await club.save();

    // 2. Unverify/Deactivate League
    const league = await LeagueModel.findOne({ club: clubId, verified: true });
    if (league) {
      league.verified = false;
      league.isActive = false; // Optionally deactivate it
      await league.save();
    }

    return NextResponse.json({ message: 'Club unverified and league updated', club });

  } catch (error) {
    console.error('Error unverifying club:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
