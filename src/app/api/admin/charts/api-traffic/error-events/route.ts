import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectMongo } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';
import { withApiTelemetry } from '@/lib/api-telemetry';
import { resolveRouteFilters, resolveTimeRange } from '@/lib/admin-telemetry';
import { ApiRequestErrorEventModel } from '@/database/models/api-request-error-event.model';

async function __GET(request: NextRequest) {
  try {
    await connectMongo();

    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const adminUser = await UserModel.findById(decoded.id).select('isAdmin');
    if (!adminUser?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const { startDate, endDate } = resolveTimeRange(searchParams);
    const { routeKey, method } = resolveRouteFilters(searchParams);
    const statusClass = searchParams.get('statusClass');
    const includeResolved = searchParams.get('includeResolved') === 'true';
    const status = Number(searchParams.get('status'));
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Math.max(10, Number(searchParams.get('limit') || 20)));
    const skip = (page - 1) * limit;

    const match: Record<string, any> = {
      occurredAt: { $gte: startDate, $lte: endDate },
    };
    if (routeKey) match.routeKey = routeKey;
    if (method) match.method = method;
    if (!includeResolved) {
      match.isResolved = { $ne: true };
    }
    if (Number.isFinite(status) && status > 0) {
      match.status = status;
    } else if (statusClass === '4xx') {
      match.status = { $gte: 400, $lt: 500 };
    } else if (statusClass === '5xx') {
      match.status = { $gte: 500, $lt: 600 };
    }

    const [rows, total, summary] = await Promise.all([
      ApiRequestErrorEventModel.find(match)
        .sort({ occurredAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ApiRequestErrorEventModel.countDocuments(match),
      ApiRequestErrorEventModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            count4xx: {
              $sum: {
                $cond: [{ $and: [{ $gte: ['$status', 400] }, { $lt: ['$status', 500] }] }, 1, 0],
              },
            },
            count5xx: {
              $sum: {
                $cond: [{ $and: [{ $gte: ['$status', 500] }, { $lt: ['$status', 600] }] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    return NextResponse.json({
      success: true,
      summary: {
        total: summary[0]?.total || 0,
        count4xx: summary[0]?.count4xx || 0,
        count5xx: summary[0]?.count5xx || 0,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      data: rows,
    });
  } catch (error) {
    console.error('Error fetching api error events:', error);
    return NextResponse.json({ error: 'Failed to fetch api error events' }, { status: 500 });
  }
}

async function __DELETE(request: NextRequest) {
  try {
    await connectMongo();

    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const adminUser = await UserModel.findById(decoded.id).select('isAdmin');
    if (!adminUser?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? body.ids.filter((v: unknown) => typeof v === 'string') : [];
    const routeKey = typeof body.routeKey === 'string' ? body.routeKey.trim() : '';
    const method = typeof body.method === 'string' ? body.method.trim().toUpperCase() : '';

    if (ids.length > 0) {
      const deleted = await ApiRequestErrorEventModel.deleteMany({ _id: { $in: ids } });
      return NextResponse.json({
        success: true,
        mode: 'ids',
        deletedCount: deleted.deletedCount || 0,
      });
    }

    if (!routeKey) {
      return NextResponse.json({ error: 'Provide ids or routeKey.' }, { status: 400 });
    }

    const filter: Record<string, any> = { routeKey };
    if (method && method !== 'ALL') {
      filter.method = method;
    }

    const deleted = await ApiRequestErrorEventModel.deleteMany(filter);
    return NextResponse.json({
      success: true,
      mode: 'route',
      deletedCount: deleted.deletedCount || 0,
      routeKey,
      method: method || 'ALL',
    });
  } catch (error) {
    console.error('Error deleting api error events:', error);
    return NextResponse.json({ error: 'Failed to delete api error events' }, { status: 500 });
  }
}

export const GET = withApiTelemetry('/api/admin/charts/api-traffic/error-events', __GET as any);
export const DELETE = withApiTelemetry('/api/admin/charts/api-traffic/error-events', __DELETE as any);
