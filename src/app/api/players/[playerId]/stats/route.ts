import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { PlayerModel } from '@/database/models/player.model';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    await connectMongo();
    const { playerId } = await params;

    const player = await PlayerModel.findById(playerId).lean();

    if (!player) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      player: {
        _id: player._id,
        name: player.name,
        userRef: player.userRef,
        isRegistered: player.isRegistered,
        stats: player.stats || {},
        tournamentHistory: player.tournamentHistory || []
      }
    });

  } catch (error) {
    console.error('Error fetching player stats:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
