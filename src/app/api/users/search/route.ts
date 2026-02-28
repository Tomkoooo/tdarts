import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/database/services/user.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query') || '';
  try {
    const users = await UserService.searchUsers(query);
    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export const GET = withApiTelemetry('/api/users/search', __GET as any);
