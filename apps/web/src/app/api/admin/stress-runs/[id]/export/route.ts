import { NextRequest, NextResponse } from 'next/server';
import { withApiTelemetry } from '@/lib/api-telemetry';
import { ensureAdmin } from '@/lib/admin-auth';
import { StressRunService } from '@/database/services/stress-run.service';
import { buildStressRunAiExport } from '@/lib/stress-run-ai-export';

function toFilenameSafePart(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
}

async function __GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await ensureAdmin(request);
  if ('response' in admin) return admin.response;

  const { id } = await params;
  const modeParam = (request.nextUrl.searchParams.get('mode') || '').toLowerCase();
  const mode = modeParam === 'ai_prompt' ? 'ai_prompt' : 'full';
  const limit = Number(request.nextUrl.searchParams.get('limit') || (mode === 'ai_prompt' ? '1200' : '6000'));

  const run = await StressRunService.getRun(id);
  if (!run) {
    return NextResponse.json({ error: 'Stress run not found' }, { status: 404 });
  }

  const samples = await StressRunService.getRunSamples(id, limit);
  const payload = buildStressRunAiExport({
    run,
    samples,
    mode,
  });

  const now = new Date().toISOString().replace(/[:.]/g, '-');
  const runName = toFilenameSafePart(String((run as any)?.name || 'stress-run'));
  const filename =
    mode === 'ai_prompt'
      ? `stress-run-ai-prompt-${runName}-${now}.json`
      : `stress-run-ai-export-${runName}-${now}.json`;

  return NextResponse.json(payload, {
    headers: {
      'content-disposition': `attachment; filename="${filename}"`,
    },
  });
}

export const GET = withApiTelemetry('/api/admin/stress-runs/[id]/export', __GET as any);
