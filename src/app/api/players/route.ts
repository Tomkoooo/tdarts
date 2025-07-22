import { NextRequest, NextResponse } from 'next/server';
import { PlayerService } from '@/database/services/player.service';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const player = await PlayerService.createPlayer(data);
    return NextResponse.json(player, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
} 