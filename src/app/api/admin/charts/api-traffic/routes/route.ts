import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectMongo } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';
import { ApiRequestMetricModel } from '@/database/models/api-request-metric.model';
import { withApiTelemetry } from '@/lib/api-telemetry';
import { resolveTimeRange } from '@/lib/admin-telemetry';

async function __GET(request: NextRequest) {
  try {
    await connectMongo();

    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const adminUser = await UserModel.findById(decoded.id).select('isAdmin');
    if (!adminUser?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const method = (searchParams.get('method') || '').toUpperCase();
    const search = (searchParams.get('search') || '').trim();
    const limit = Math.min(1000, Math.max(10, Number(searchParams.get('limit') || 200)));
    const hasErrors = searchParams.get('hasErrors') === 'true';
    const minCalls = Math.max(0, Number(searchParams.get('minCalls') || 0));
    const minTrafficKb = Math.max(0, Number(searchParams.get('minTrafficKb') || 0));
    const minAvgLatencyMs = Math.max(0, Number(searchParams.get('minAvgLatencyMs') || 0));
    const sortByRaw = (searchParams.get('sortBy') || 'route').toLowerCase();
    const sortDir = (searchParams.get('sortDir') || 'desc').toLowerCase() === 'asc' ? 1 : -1;
    const { startDate, endDate } = resolveTimeRange(searchParams);

    const match: Record<string, any> = {
      bucket: { $gte: startDate, $lte: endDate },
    };
    if (method && method !== 'ALL') {
      match.method = method;
    }
    if (search) {
      match.routeKey = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }

    const rows = await ApiRequestMetricModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: { routeKey: '$routeKey', method: '$method' },
          totalCalls: { $sum: '$count' },
          totalErrors: { $sum: '$errorCount' },
          totalDurationMs: { $sum: '$totalDurationMs' },
          totalRequestBytes: { $sum: '$totalRequestBytes' },
          totalResponseBytes: { $sum: '$totalResponseBytes' },
          lastSeen: { $max: '$bucket' },
        },
      },
      {
        $addFields: {
          totalTrafficKb: {
            $divide: [{ $add: ['$totalRequestBytes', '$totalResponseBytes'] }, 1024],
          },
          avgLatencyMs: {
            $cond: [{ $gt: ['$totalCalls', 0] }, { $divide: ['$totalDurationMs', '$totalCalls'] }, 0],
          },
        },
      },
      {
        $match: {
          ...(hasErrors ? { totalErrors: { $gt: 0 } } : {}),
          ...(minCalls > 0 ? { totalCalls: { $gte: minCalls } } : {}),
          ...(minTrafficKb > 0 ? { totalTrafficKb: { $gte: minTrafficKb } } : {}),
          ...(minAvgLatencyMs > 0 ? { avgLatencyMs: { $gte: minAvgLatencyMs } } : {}),
        },
      },
      {
        $sort: (() => {
          const keyMap: Record<string, string> = {
            route: '_id.routeKey',
            calls: 'totalCalls',
            errors: 'totalErrors',
            traffic: 'totalTrafficKb',
            latency: 'avgLatencyMs',
            lastseen: 'lastSeen',
          };
          const sortKey = keyMap[sortByRaw] || '_id.routeKey';
          return { [sortKey]: sortDir, '_id.routeKey': 1, '_id.method': 1 };
        })(),
      },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          routeKey: '$_id.routeKey',
          method: '$_id.method',
          totalCalls: 1,
          totalErrors: 1,
          totalTrafficKb: { $round: ['$totalTrafficKb', 2] },
          avgLatencyMs: { $round: ['$avgLatencyMs', 2] },
          lastSeen: 1,
        },
      },
    ]);

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching registered api routes:', error);
    return NextResponse.json({ error: 'Failed to fetch registered api routes' }, { status: 500 });
  }
}

export const GET = withApiTelemetry('/api/admin/charts/api-traffic/routes', __GET as any);
