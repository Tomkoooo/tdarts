import { NextRequest, NextResponse } from 'next/server';
import { withApiTelemetry } from '@/lib/api-telemetry';
import { ensureAdmin } from '@/lib/admin-auth';
import { StressRunService } from '@tdarts/services';

async function __GET(request: NextRequest) {
  const admin = await ensureAdmin(request);
  if ('response' in admin) return admin.response;

  const limit = Number(request.nextUrl.searchParams.get('limit') || '20');
  const runs = await StressRunService.listRuns(limit);
  return NextResponse.json({ success: true, data: runs });
}

export const GET = withApiTelemetry('/api/admin/stress-runs', __GET as any);
