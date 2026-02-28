import { NextRequest, NextResponse } from 'next/server';
import { FeedbackService } from '@/database/services/feedback.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

import { AuthService } from '@/database/services/auth.service';

async function __GET(request: NextRequest) {
  try {
   const token = request.cookies.get('token')?.value;
   console.log('token', token);
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
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const GET = withApiTelemetry('/api/profile/tickets', __GET as any);
