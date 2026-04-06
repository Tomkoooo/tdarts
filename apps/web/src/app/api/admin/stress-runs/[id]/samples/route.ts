import { NextRequest, NextResponse } from 'next/server';
import { withApiTelemetry } from '@/lib/api-telemetry';
import { ensureAdmin } from '@/lib/admin-auth';
import { StressRunService } from '@/database/services/stress-run.service';

async function __GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await ensureAdmin(request);
  if ('response' in admin) return admin.response;

  const { id } = await params;
  const limit = Number(request.nextUrl.searchParams.get('limit') || '2000');
  const samples = await StressRunService.getRunSamples(id, limit);
  return NextResponse.json({ success: true, data: samples });
}

export const GET = withApiTelemetry('/api/admin/stress-runs/[id]/samples', __GET as any);
