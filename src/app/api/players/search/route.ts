import { NextRequest, NextResponse } from 'next/server';
import { PlayerService } from '@/database/services/player.service';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query') || '';
  try {
    const players = await PlayerService.searchPlayers(query);
    return NextResponse.json({ players });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}