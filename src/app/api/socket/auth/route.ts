import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { withApiTelemetry } from '@/lib/api-telemetry';
import { issueSocketAuthToken } from '@/features/socket/lib/socketAuth';

// Environment variables will be checked inside the function

async function __POST(request: NextRequest) {
  try {
    await connectMongo();
    const body = await request.json().catch(() => ({} as { clubId?: string }));
    const token = request.cookies.get('token')?.value;
    const result = await issueSocketAuthToken({ token, clubId: body.clubId });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true, token: result.token });

  } catch (error: any) {
    console.error('Socket auth error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate socket token',
      details: error.message 
    }, { status: 500 });
  }
}

export const POST = withApiTelemetry('/api/socket/auth', __POST as any);
