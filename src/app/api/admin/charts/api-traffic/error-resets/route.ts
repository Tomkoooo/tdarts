import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectMongo } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';
import { withApiTelemetry } from '@/lib/api-telemetry';
import { ApiRequestErrorResetModel } from '@/database/models/api-request-error-reset.model';
import { ApiRequestErrorEventModel } from '@/database/models/api-request-error-event.model';

async function ensureAdmin(request: NextRequest): Promise<NextResponse | null> {
  const token = request.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
  const adminUser = await UserModel.findById(decoded.id).select('isAdmin');
  if (!adminUser?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

async function __POST(request: NextRequest) {
  try {
    await connectMongo();
    const authError = await ensureAdmin(request);
    if (authError) return authError;

    const body = await request.json().catch(() => ({}));
    const routeKey = typeof body.routeKey === 'string' ? body.routeKey.trim() : '';
    const methodRaw = typeof body.method === 'string' ? body.method.trim().toUpperCase() : 'ALL';
    const method = methodRaw || 'ALL';

    if (!routeKey) {
      return NextResponse.json({ error: 'routeKey is required' }, { status: 400 });
    }

    const resetAt = new Date();
    await ApiRequestErrorResetModel.updateOne(
      { routeKey, method },
      { $set: { routeKey, method, resetAt } },
      { upsert: true }
    );

    const resolvedFilter: Record<string, any> = {
      routeKey,
      occurredAt: { $lte: resetAt },
      isResolved: { $ne: true },
    };
    if (method !== 'ALL') {
      resolvedFilter.method = method;
    }

    const resolvedResult = await ApiRequestErrorEventModel.updateMany(resolvedFilter, {
      $set: { isResolved: true, resolvedAt: resetAt },
    });

    return NextResponse.json({
      success: true,
      data: {
        routeKey,
        method,
        resetAt: resetAt.toISOString(),
        resolvedCount: resolvedResult.modifiedCount || 0,
      },
    });
  } catch (error) {
    console.error('Error marking api errors fixed:', error);
    return NextResponse.json({ error: 'Failed to mark api errors fixed' }, { status: 500 });
  }
}

async function __GET(request: NextRequest) {
  try {
    await connectMongo();
    const authError = await ensureAdmin(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const routeKey = searchParams.get('routeKey') || undefined;
    const method = (searchParams.get('method') || '').toUpperCase() || undefined;

    const filter: Record<string, any> = {};
    if (routeKey) filter.routeKey = routeKey;
    if (method) filter.method = method;

    const rows = await ApiRequestErrorResetModel.find(filter).sort({ resetAt: -1 }).limit(200).lean();
    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching api error resets:', error);
    return NextResponse.json({ error: 'Failed to fetch api error resets' }, { status: 500 });
  }
}

export const POST = withApiTelemetry('/api/admin/charts/api-traffic/error-resets', __POST as any);
export const GET = withApiTelemetry('/api/admin/charts/api-traffic/error-resets', __GET as any);
