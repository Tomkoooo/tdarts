import { NextRequest, NextResponse } from 'next/server';
import { withApiTelemetry } from '@/lib/api-telemetry';
import { ensureAdmin } from '@/lib/admin-auth';
import { StressRunService } from '@/database/services/stress-run.service';

type HostMetricsBody = {
  secondFromStart: number;
  cpuPercent?: number;
  memoryPercent?: number;
  rxBytesPerSec?: number;
  txBytesPerSec?: number;
};

async function __POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await ensureAdmin(request);
  if ('response' in admin) return admin.response;

  const body = (await request.json()) as HostMetricsBody;
  const { id } = await params;

  if (!Number.isFinite(body.secondFromStart) || body.secondFromStart < 0) {
    return NextResponse.json({ error: 'secondFromStart must be a non-negative number' }, { status: 400 });
  }

  await StressRunService.addHostMetrics(id, Math.floor(body.secondFromStart), {
    cpuPercent: body.cpuPercent,
    memoryPercent: body.memoryPercent,
    rxBytesPerSec: body.rxBytesPerSec,
    txBytesPerSec: body.txBytesPerSec,
  });

  return NextResponse.json({ success: true });
}

export const POST = withApiTelemetry('/api/admin/stress-runs/[id]/host-metrics', __POST as any);
