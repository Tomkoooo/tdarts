import { NextResponse } from 'next/server';
import { LeagueModel } from '@/database/models/league.model';
import { connectMongo } from '@/lib/mongoose';

export async function DELETE(
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
    
    // Get removalType from request body
    const body = await request.json();
    const { removalType = 'delete_league' } = body; // 'delete_league' or 'terminate_league'

    if (!clubId) {
      return NextResponse.json(
        { error: 'Missing required fields: clubId' },
        { status: 400 }
      );
    }

    // 2. Find the verified league
    const league = await LeagueModel.findOne({ 
      club: clubId, 
      verified: true 
    });
    
    if (!league) {
      return NextResponse.json(
        { error: 'Verified league not found for this club' },
        { status: 404 }
      );
    }

    // 3. Handle removal based on type
    if (removalType === 'delete_league') {
      // Delete league entirely (loses all player points)
      await LeagueModel.findByIdAndDelete(league._id);
    } else if (removalType === 'terminate_league') {
      // Terminate league (keeps player points but league becomes inactive)
      await LeagueModel.findByIdAndUpdate(league._id, { 
        isActive: false,
        verified: false,
        endDate: new Date()
      });
    }

    // 4. Unverify the Club
    const { ClubModel } = await import('@/database/models/club.model');
    await ClubModel.findByIdAndUpdate(clubId, { verified: false });

    return NextResponse.json({ 
      message: removalType === 'delete_league' 
        ? 'OAC league deleted and club unverified' 
        : 'OAC league terminated and club unverified'
    });
  } catch (error: any) {
    console.error('Error removing OAC league:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
