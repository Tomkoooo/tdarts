import { NextRequest, NextResponse } from 'next/server';
import { withApiTelemetry } from '@/lib/api-telemetry';
import { ensureAdmin } from '@/lib/admin-auth';
import { StressRunService } from '@tdarts/services';

async function __GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await ensureAdmin(request);
  if ('response' in admin) return admin.response;

  const { id } = await params;
  const run = await StressRunService.getRun(id);
  if (!run) {
    return NextResponse.json({ error: 'Stress run not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: run });
}

export const GET = withApiTelemetry('/api/admin/stress-runs/[id]', __GET as any);
