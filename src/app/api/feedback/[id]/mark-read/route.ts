import { NextRequest, NextResponse } from 'next/server';
import { FeedbackService } from '@/database/services/feedback.service';
import { AuthorizationService } from '@/database/services/authorization.service';
import { UserModel } from '@/database/models/user.model';
import { connectMongo } from '@/lib/mongoose';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const userId = await AuthorizationService.getUserIdFromRequest(request);
    
    await connectMongo();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user to check if admin
    const user = await UserModel.findById(userId);
    const feedback = await FeedbackService.getFeedbackById(params.id);

    if (!feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    const isOwner = feedback.userId?.toString() === userId.toString();
    const isAdmin = user?.isAdmin;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Update read status based on who is marking it
    if (isAdmin) {
      // Admin marking as read
      await FeedbackService.updateFeedback(
        params.id,
        { isReadByAdmin: true },
        userId.toString()
      );
    } else {
      // User marking as read
      await FeedbackService.updateFeedback(
        params.id,
        { isReadByUser: true },
        userId.toString()
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Ticket marked as read'
    });

  } catch (error: any) {
    console.error('Error marking ticket as read:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const POST = withApiTelemetry('/api/feedback/[id]/mark-read', __POST as any);
