import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { PlayerModel } from '@/database/models/player.model';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await connectMongo();
    
    const { userId } = await params;
    
    // Find the player document by userRef
    const player = await PlayerModel.findOne({ userRef: userId });
    
    if (!player) {
      return NextResponse.json({ 
        success: false, 
        message: 'Player document not found for this user' 
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      player: {
        _id: player._id,
        name: player.name,
        userRef: player.userRef,
        stats: player.stats
      }
    });
  } catch (error: any) {
    console.error('Error finding player by user:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to find player' 
      }, 
      { status: 500 }
    );
  }
}
