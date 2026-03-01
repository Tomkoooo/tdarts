
import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { LogModel } from '@/database/models/log.model';
import { FeedbackModel } from '@/database/models/feedback.model';
import { UserModel } from '@/database/models/user.model';
import { ApiRouteAnomalyModel } from '@/database/models/api-route-anomaly.model';
import jwt from 'jsonwebtoken';
import { withApiTelemetry } from '@/lib/api-telemetry';

function buildStructuredMatcher() {
  return [
    { errorCode: { $exists: true, $nin: [null, ''] } },
    { operation: { $exists: true, $nin: [null, ''] } },
    { requestId: { $exists: true, $nin: [null, ''] } },
    { errorType: { $exists: true, $nin: [null, ''] } },
    { expected: { $exists: true } },
  ];
}

async function __GET(request: NextRequest) {
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
    const structuredMatcher = buildStructuredMatcher();
    const errorCount = await LogModel.countDocuments({
      level: 'error',
      category: { $ne: 'auth' },
      expected: { $ne: true },
      timestamp: { $gte: oneDayAgo },
      $or: structuredMatcher,
    });

    // 2. Unread/Pending Feedback
    const pendingFeedbackCount = await FeedbackModel.countDocuments({
      status: 'pending'
    });

    // 3. Critical Log Count (Total Unresolved? Or just high severity?)
    // For now, let's stick to the requested 2 main alerts
    
    const anomalies = await ApiRouteAnomalyModel.find({ isActive: true })
      .sort({ ratio: -1, lastDetectedAt: -1 })
      .limit(5)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        errors24h: errorCount,
        pendingFeedback: pendingFeedbackCount,
        anomalyCount: anomalies.length,
        anomalies: anomalies.map((item) => ({
          routeKey: item.routeKey,
          method: item.method,
          signal: item.signal,
          ratio: Math.round(item.ratio * 100) / 100,
          currentValue: Math.round(item.currentValue * 100) / 100,
          baselineValue: Math.round(item.baselineValue * 100) / 100,
          lastDetectedAt: item.lastDetectedAt,
        })),
      }
    });

  } catch (error) {
    console.error('Error fetching admin alerts:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export const GET = withApiTelemetry('/api/admin/alerts', __GET as any);
