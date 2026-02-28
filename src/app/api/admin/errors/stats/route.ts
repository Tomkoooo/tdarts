import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { LogModel } from '@/database/models/log.model';
import { UserModel } from '@/database/models/user.model';
import jwt from 'jsonwebtoken';
import { withApiTelemetry } from '@/lib/api-telemetry';

type SchemaVersion = 'all' | 'new' | 'legacy';

function resolveSchemaVersion(searchParams: URLSearchParams): SchemaVersion {
  const raw = (searchParams.get('schemaVersion') || 'all').toLowerCase();
  if (raw === 'new' || raw === 'legacy') return raw;
  return 'all';
}

function buildStructuredMatcher() {
  return [
    { errorCode: { $exists: true, $nin: [null, ''] } },
    { operation: { $exists: true, $nin: [null, ''] } },
    { requestId: { $exists: true, $nin: [null, ''] } },
    { errorType: { $exists: true, $nin: [null, ''] } },
    { expected: { $exists: true } },
  ];
}

function applySchemaVersionFilter(matchCriteria: Record<string, any>, schemaVersion: SchemaVersion) {
  const structuredMatcher = buildStructuredMatcher();
  if (schemaVersion === 'new') {
    matchCriteria.$or = structuredMatcher;
  } else if (schemaVersion === 'legacy') {
    matchCriteria.$nor = structuredMatcher;
  }
}

export const GET = withApiTelemetry('/api/admin/errors/stats', async (request: NextRequest) => {
  try {
    await connectMongo();
    
    // Verify admin access
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const adminUser = await UserModel.findById(decoded.id).select('isAdmin');
    
    if (!adminUser?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const category = searchParams.get('category') || 'all';
    const level = searchParams.get('level') || 'all';
    const showAuthErrors = searchParams.get('showAuthErrors') === 'true';
    const showExpectedErrors = searchParams.get('showExpectedErrors') === 'true';
    const schemaVersion = resolveSchemaVersion(searchParams);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Build base match criteria (without schema-version split).
    const baseMatchCriteria: any = {
      level: 'error',
      timestamp: { $gte: startDate, $lte: endDate }
    };

    // Keep old showAuthErrors switch for backward compatibility.
    if (!showAuthErrors) {
      baseMatchCriteria.category = { $ne: 'auth' };
    }

    // Structured expected_user_error filtering.
    if (!showExpectedErrors) {
      baseMatchCriteria.expected = { $ne: true };
    }

    // Add category filter
    if (category !== 'all') {
      baseMatchCriteria.category = category;
    }

    // Add level filter
    if (level !== 'all') {
      baseMatchCriteria.level = level;
    }

    const matchCriteria: Record<string, any> = { ...baseMatchCriteria };
    applySchemaVersionFilter(matchCriteria, schemaVersion);
    const structuredMatcher = buildStructuredMatcher();

    // Get error statistics
    const [totalErrors, errorsByCategory, errorsByLevel, recentErrors, structuredNewCount, structuredLegacyCount] = await Promise.all([
      LogModel.countDocuments(matchCriteria),
      LogModel.aggregate([
        { $match: matchCriteria },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      LogModel.aggregate([
        { $match: matchCriteria },
        { $group: { _id: '$level', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      LogModel.find(matchCriteria)
        .sort({ timestamp: -1 })
        .limit(50)
        .lean(),
      LogModel.countDocuments({ ...baseMatchCriteria, $or: structuredMatcher }),
      LogModel.countDocuments({ ...baseMatchCriteria, $nor: structuredMatcher }),
    ]);

    const structuredCounts = {
      all: structuredNewCount + structuredLegacyCount,
      new: structuredNewCount,
      legacy: structuredLegacyCount,
    };

    const stats = {
      totalErrors,
      errorsByCategory: errorsByCategory.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>),
      errorsByLevel: errorsByLevel.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>),
      recentErrors,
      structuredCounts,
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching error stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch error statistics' },
      { status: 500 }
    );
  }
});
