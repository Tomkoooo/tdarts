import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';
import { ApiRequestMetricModel } from '@/database/models/api-request-metric.model';
import jwt from 'jsonwebtoken';
import { withApiTelemetry } from '@/lib/api-telemetry';
import { resolveGranularity, resolveRouteFilters, resolveTimeRange } from '@/lib/admin-telemetry';

async function __GET(request: NextRequest) {
  try {
    await connectMongo();

    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const adminUser = await UserModel.findById(decoded.id).select('isAdmin');
    if (!adminUser?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(5, parseInt(searchParams.get('limit') || '10', 10)));
    const hasErrors = searchParams.get('hasErrors') === 'true';
    const sortByRaw = (searchParams.get('sortBy') || 'calls').toLowerCase();
    const sortDir = (searchParams.get('sortDir') || 'desc').toLowerCase() === 'asc' ? 1 : -1;
    const granularity = resolveGranularity(searchParams);
    void granularity;
    const { startDate, endDate } = resolveTimeRange(searchParams);
    const { routeKey, method } = resolveRouteFilters(searchParams);

    const matchCriteria: Record<string, any> = { bucket: { $gte: startDate, $lte: endDate } };
    if (routeKey) matchCriteria.routeKey = routeKey;
    if (method) matchCriteria.method = method;

    const topRoutes = await ApiRequestMetricModel.aggregate([
      { $match: matchCriteria },
      {
        $lookup: {
          from: 'api_request_error_resets',
          let: { routeKey: '$routeKey', method: '$method' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$routeKey', '$$routeKey'] },
                    {
                      $or: [
                        { $eq: ['$method', '$$method'] },
                        { $eq: ['$method', 'ALL'] },
                      ],
                    },
                  ],
                },
              },
            },
            { $sort: { resetAt: -1 } },
            { $limit: 1 },
          ],
          as: 'resetRows',
        },
      },
      {
        $addFields: {
          effectiveResetAt: { $arrayElemAt: ['$resetRows.resetAt', 0] },
        },
      },
      {
        $match: {
          $expr: {
            $or: [
              { $eq: ['$effectiveResetAt', null] },
              { $gte: ['$bucket', '$effectiveResetAt'] },
            ],
          },
        },
      },
      {
        $group: {
          _id: { routeKey: '$routeKey', method: '$method' },
          count: { $sum: '$count' },
          errorCount: { $sum: '$errorCount' },
          totalDurationMs: { $sum: '$totalDurationMs' },
          maxDurationMs: { $max: '$maxDurationMs' },
          totalRequestBytes: { $sum: '$totalRequestBytes' },
          totalResponseBytes: { $sum: '$totalResponseBytes' },
        },
      },
      {
        $addFields: {
          totalTrafficKb: {
            $divide: [{ $add: ['$totalRequestBytes', '$totalResponseBytes'] }, 1024],
          },
          avgDurationMs: {
            $cond: [{ $gt: ['$count', 0] }, { $divide: ['$totalDurationMs', '$count'] }, 0],
          },
        },
      },
      ...(hasErrors ? [{ $match: { errorCount: { $gt: 0 } } }] : []),
      {
        $sort: (() => {
          const keyMap: Record<string, string> = {
            calls: 'count',
            errors: 'errorCount',
            traffic: 'totalTrafficKb',
            latency: 'avgDurationMs',
          };
          const sortKey = keyMap[sortByRaw] || 'count';
          return { [sortKey]: sortDir, count: -1 };
        })(),
      },
      { $limit: limit },
    ]);

    const data = topRoutes.map((row) => {
      const avgDurationMs = row.count > 0 ? row.totalDurationMs / row.count : 0;
      const errorRate = row.count > 0 ? (row.errorCount / row.count) * 100 : 0;
      const requestTrafficKb = (row.totalRequestBytes || 0) / 1024;
      const responseTrafficKb = (row.totalResponseBytes || 0) / 1024;
      const totalTrafficKb = requestTrafficKb + responseTrafficKb;
      return {
        routeKey: row._id.routeKey,
        method: row._id.method,
        count: row.count,
        errorCount: row.errorCount,
        errorRate: Math.round(errorRate * 100) / 100,
        avgDurationMs: Math.round(avgDurationMs * 100) / 100,
        maxDurationMs: row.maxDurationMs || 0,
        requestTrafficKb: Math.round(requestTrafficKb * 100) / 100,
        responseTrafficKb: Math.round(responseTrafficKb * 100) / 100,
        totalTrafficKb: Math.round(totalTrafficKb * 100) / 100,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching api traffic top routes:', error);
    return NextResponse.json({ error: 'Failed to fetch top api routes' }, { status: 500 });
  }
}

export const GET = withApiTelemetry('/api/admin/charts/api-traffic/top-routes', __GET as any);
