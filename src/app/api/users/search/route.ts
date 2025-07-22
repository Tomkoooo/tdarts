import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/database/services/user.service';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query') || '';
  try {
    const users = await UserService.searchUsers(query);
    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
} 