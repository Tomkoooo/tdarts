import { buildStressRunAiExport } from '@/lib/stress-run-ai-export';

describe('stress-run-ai-export helper', () => {
  it('builds derived metrics and prompts for full mode', () => {
    const payload = buildStressRunAiExport({
      mode: 'full',
      run: {
        _id: 'run_1',
        name: 'Load test',
        status: 'completed',
        counters: {
          totalCalls: 1000,
          errorCalls: 25,
          droppedCalls: 15,
          timedOutCalls: 10,
        },
        endpointCounters: {
          match_get: { calls: 400, errors: 10, drops: 5, latencySumMs: 12_000, latencyMaxMs: 190 },
          tournament_get: { calls: 300, errors: 5, drops: 3, latencySumMs: 8_000, latencyMaxMs: 160 },
        },
      },
      samples: [
        { secondFromStart: 1, calls: 80, errorCount: 2, drops: 1, process: { cpuPercent: 35, rssMb: 450, eventLoopLagMs: 8 } },
        { secondFromStart: 2, calls: 95, errorCount: 3, drops: 1, process: { cpuPercent: 40, rssMb: 480, eventLoopLagMs: 10 } },
      ],
    });

    expect(payload.meta.type).toBe('stress_run_ai_export');
    expect(payload.derived.totalCalls).toBe(1000);
    expect(payload.derived.totalErrors).toBe(25);
    expect(payload.derived.totalDrops).toBe(15);
    expect(payload.derived.topFailingEndpoints.length).toBeGreaterThan(0);
    expect(payload.prompts.tasks.length).toBeGreaterThan(0);
    expect(Array.isArray(payload.samples)).toBe(true);
  });

  it('omits samples in ai_prompt mode', () => {
    const payload = buildStressRunAiExport({
      mode: 'ai_prompt',
      run: {
        _id: 'run_2',
        name: 'Prompt mode run',
        status: 'completed',
        counters: { totalCalls: 10, errorCalls: 0, droppedCalls: 0 },
      },
      samples: [{ secondFromStart: 1, calls: 10 }],
    });

    expect(payload.meta.mode).toBe('ai_prompt');
    expect(payload.samples).toBeUndefined();
    expect(payload.prompts.systemPrompt).toContain('performance engineer');
  });
});
