import { NextRequest } from 'next/server';

jest.mock('@/lib/api-telemetry', () => ({
  withApiTelemetry: (_route: string, handler: any) => handler,
}));

jest.mock('@/lib/admin-auth', () => ({
  ensureAdmin: jest.fn(),
}));

jest.mock('@/database/services/stress-run.service', () => ({
  StressRunService: {
    getRun: jest.fn(),
    getRunSamples: jest.fn(),
  },
}));

import { GET as exportRun } from '@/app/api/admin/stress-runs/[id]/export/route';
import { ensureAdmin } from '@/lib/admin-auth';
import { StressRunService } from '@/database/services/stress-run.service';

describe('GET /api/admin/stress-runs/[id]/export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns downloadable export payload for an existing run', async () => {
    (ensureAdmin as jest.Mock).mockResolvedValue({ userId: 'admin_1', isAdmin: true });
    (StressRunService.getRun as jest.Mock).mockResolvedValue({
      _id: 'run_123',
      name: 'Run 123',
      status: 'completed',
      counters: { totalCalls: 50, errorCalls: 2, droppedCalls: 1 },
      endpointCounters: {},
    });
    (StressRunService.getRunSamples as jest.Mock).mockResolvedValue([
      { secondFromStart: 1, calls: 10, errorCount: 0, drops: 0 },
    ]);

    const request = new NextRequest('http://localhost:3000/api/admin/stress-runs/run_123/export?mode=ai_prompt&limit=10');
    const response = await exportRun(request, { params: Promise.resolve({ id: 'run_123' }) } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-disposition')).toContain('attachment; filename=');
    expect(body.meta.type).toBe('stress_run_ai_export');
    expect(body.meta.mode).toBe('ai_prompt');
    expect(body.prompts.tasks.length).toBeGreaterThan(0);
  });

  it('returns 404 if run does not exist', async () => {
    (ensureAdmin as jest.Mock).mockResolvedValue({ userId: 'admin_1', isAdmin: true });
    (StressRunService.getRun as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/admin/stress-runs/missing/export');
    const response = await exportRun(request, { params: Promise.resolve({ id: 'missing' }) } as any);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('Stress run not found');
  });
});
