import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { UserModel } from '@tdarts/core';
import { resolveGranularity, resolveRouteFilters, resolveTimeRange } from '@/lib/admin-telemetry';

export async function ensureAdmin(request: NextRequest): Promise<NextResponse | null> {
  const token = request.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
  const adminUser = await UserModel.findById(decoded.id).select('isAdmin');
  if (!adminUser?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

export function parseTelemetryFilters(searchParams: URLSearchParams) {
  const { startDate, endDate } = resolveTimeRange(searchParams);
  const { routeKey, method } = resolveRouteFilters(searchParams);
  const routeSearch = (searchParams.get('search') || searchParams.get('routeSearch') || '').trim();
  const granularity = resolveGranularity(searchParams);
  const timeZone = searchParams.get('tz') || 'UTC';

  return {
    startDate,
    endDate,
    routeKey,
    routeSearch,
    method,
    granularity,
    timeZone,
  };
}

export function buildRouteSearchRegex(routeSearch: string): string | null {
  if (!routeSearch.trim()) return null;
  return routeSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
