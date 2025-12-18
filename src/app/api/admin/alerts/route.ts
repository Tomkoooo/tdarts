
import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { LogModel } from '@/database/models/log.model';
import { FeedbackModel } from '@/database/models/feedback.model';
import { UserModel } from '@/database/models/user.model';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    await connectMongo();

    // Standard Admin Auth (Cookie -> JWT -> DB)
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
      const user = await UserModel.findById(decoded.id).select('isAdmin');
      
      if (!user?.isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (error) {
       console.error('Invalid token:', error);
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. System Errors (Last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const errorCount = await LogModel.countDocuments({
      level: 'error',
      timestamp: { $gte: oneDayAgo }
    });

    // 2. Unread/Pending Feedback
    const pendingFeedbackCount = await FeedbackModel.countDocuments({
      status: 'pending'
    });

    // 3. Critical Log Count (Total Unresolved? Or just high severity?)
    // For now, let's stick to the requested 2 main alerts
    
    return NextResponse.json({
      success: true,
      data: {
        errors24h: errorCount,
        pendingFeedback: pendingFeedbackCount
      }
    });

  } catch (error) {
    console.error('Error fetching admin alerts:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
