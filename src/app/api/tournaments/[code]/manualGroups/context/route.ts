import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { TournamentService } from '@/database/services/tournament.service';
import { ManualGroupsContextResponse } from '@/interface/tournament.interface';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await connectMongo();
    const { code } = await params;
    const ctx = await TournamentService.getManualGroupsContext(code);

    return NextResponse.json({ success: true, ...ctx });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


