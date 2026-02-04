import { NextRequest, NextResponse } from 'next/server';
import { FeedbackService } from '@/database/services/feedback.service';
import { AuthorizationService } from '@/database/services/authorization.service';
import { UserModel } from '@/database/models/user.model';
import { connectMongo } from '@/lib/mongoose';

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const userId = await AuthorizationService.getUserIdFromRequest(request);
    
    // Ensure database connection
    await connectMongo();

    // Check if user is authenticated
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Get user to check permissions (admin or ticket owner)
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

    const isOwnerAction = feedback.userId?.toString() === userId;
    
    // We update based on who is replying
    const updatedFeedback = await FeedbackService.addMessage(
      params.id,
      {
        sender: userId,
        content,
        isInternal: false // Default to public for now, maybe add option for admins to add internal notes later
      },
      isOwnerAction
    );


    return NextResponse.json({
      success: true,
      data: updatedFeedback
    });

  } catch (error: any) {
    console.error('Error adding reply:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
