import { NextRequest, NextResponse } from 'next/server';
import { PlayerModel } from '@/database/models/player.model';
import { UserModel } from '@/database/models/user.model';
import { connectMongo } from '@/lib/mongoose';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    await connectMongo();

    const { playerId } = await params;

    if (!playerId) {
      return NextResponse.json({ error: 'Player ID required' }, { status: 400 });
    }

    // 1. Fetch player
    let player = await PlayerModel.findById(playerId).select('profilePicture userRef');

    if (!player) {
      player = await UserModel.findById(playerId).select('profilePicture');
      if (!player) {
        return NextResponse.json({ error: 'Player not found' }, { status: 404 });
      }
    }

    // 2. Determine picture URL
    let imageUrl = player.profilePicture;

    // 3. Fallback to linked user if player has no picture
    if (!imageUrl && player.userRef) {
      const user = await UserModel.findById(player.userRef).select('profilePicture');
      if (user?.profilePicture) {
        imageUrl = user.profilePicture;
      }
    }

    if (!imageUrl) {
      return NextResponse.json({ imageUrl: null }, { status: 200 });
    }

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error('Error fetching player avatar:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
