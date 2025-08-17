import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { TournamentService } from '@/database/services/tournament.service';
import { CreateManualGroupsRequest, CreateManualGroupsResponse } from '@/interface/tournament.interface';
import { AuthService } from '@/database/services/auth.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await connectMongo();
    const { code } = await params;
    
    // Get user from JWT token
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await AuthService.verifyToken(token);
    const requesterId = user._id.toString();
    
    const body: CreateManualGroupsRequest = await request.json();
    const { groups } = body || { groups: [] };
    if (!Array.isArray(groups) || groups.length === 0) {
      return NextResponse.json({ success: false, error: 'groups are required' }, { status: 400 });
    }
    const created = await TournamentService.createManualGroups(code, requesterId, groups);
    const response: CreateManualGroupsResponse = { groups: created };
    return NextResponse.json({ success: true, ...response });
  } catch (error: any) {
    console.error('Manual group creation error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}


