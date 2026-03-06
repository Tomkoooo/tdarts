import { NextRequest, NextResponse } from 'next/server';
import { FeedbackService } from '@/database/services/feedback.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

import { AuthService } from '@/database/services/auth.service';

function resolveStatusCode(error: any): number {
  const status = error?.statusCode ?? error?.status;
  if (typeof status === 'number') return status;
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('invalid token') || message.includes('unauthorized')) {
    return 401;
  }
  return 500;
}

async function __GET(request: NextRequest) {
  try {
   const token = request.cookies.get('token')?.value;
   if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
   }
   const userId = await AuthService.verifyToken(token);

    const tickets = await FeedbackService.getFeedbackByUserId(userId._id.toString());

    return NextResponse.json({
      success: true,
      data: tickets
    });

  } catch (error: any) {
    console.error('Error fetching tickets:', error);
    const status = resolveStatusCode(error);
    return NextResponse.json(
      { error: status >= 500 ? 'Internal Server Error' : (error?.message || 'Request failed') },
      { status }
    );
  }
}

export const GET = withApiTelemetry('/api/profile/tickets', __GET as any);
