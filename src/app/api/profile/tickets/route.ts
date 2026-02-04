import { NextRequest, NextResponse } from 'next/server';
import { FeedbackService } from '@/database/services/feedback.service';
import { AuthorizationService } from '@/database/services/authorization.service';
import { connectMongo } from '@/lib/mongoose';

export async function GET(request: NextRequest) {
  try {
    const userId = await AuthorizationService.getUserIdFromRequest(request);
    
    // Ensure database connection
    await connectMongo();

    // Check if user is authenticated
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tickets = await FeedbackService.getFeedbackByUserId(userId);

    return NextResponse.json({
      success: true,
      data: tickets
    });

  } catch (error: any) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
