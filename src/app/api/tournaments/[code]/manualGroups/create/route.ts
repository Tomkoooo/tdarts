import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { TournamentService } from '@/database/services/tournament.service';
import { CreateManualGroupsRequest, CreateManualGroupsResponse } from '@/interface/tournament.interface';

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    await connectMongo();
    const { code } = params;
    const body: CreateManualGroupsRequest = await request.json();
    const { groups } = body || { groups: [] };
    if (!Array.isArray(groups) || groups.length === 0) {
      return NextResponse.json({ success: false, error: 'groups are required' }, { status: 400 });
    }
    const created = await TournamentService.createManualGroups(code, groups);
    const response: CreateManualGroupsResponse = { groups: created };
    return NextResponse.json({ success: true, ...response });
  } catch (error: any) {
    console.error('Manual group creation error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}


