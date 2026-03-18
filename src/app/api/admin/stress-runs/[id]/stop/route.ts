import { NextRequest, NextResponse } from 'next/server';
import { withApiTelemetry } from '@/lib/api-telemetry';
import { ensureAdmin } from '@/lib/admin-auth';
import { StressLoadRunner } from '@/lib/stress-load-runner';
import { StressRunService } from '@/database/services/stress-run.service';
import { ErrorService } from '@/database/services/error.service';

async function __POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await ensureAdmin(request);
  if ('response' in admin) return admin.response;

  const { id } = await params;
  const stopped = await StressLoadRunner.stop(id);
  if (!stopped) {
    const run = await StressRunService.getRun(id);
    if (!run) {
      return NextResponse.json({ error: 'Stress run not found' }, { status: 404 });
    }
    if ((run as any).status === 'running' || (run as any).status === 'queued') {
      await StressRunService.setStatus(id, 'stopped');
    }
  }

  await ErrorService.logInfo('Stress run stop requested', 'api', {
    operation: 'stress_run_stop',
    endpoint: '/api/admin/stress-runs/[id]/stop',
    userId: admin.userId,
    metadata: { runId: id, stoppedInMemoryRunner: stopped },
  });

  return NextResponse.json({ success: true, stopped });
}

export const POST = withApiTelemetry('/api/admin/stress-runs/[id]/stop', __POST as any);
