type EndpointCounter = {
  calls?: number;
  errors?: number;
  drops?: number;
  latencySumMs?: number;
  latencyMaxMs?: number;
};

type StressRunDoc = {
  _id?: string;
  name?: string;
  status?: string;
  createdAt?: string | Date;
  startedAt?: string | Date;
  endedAt?: string | Date;
  target?: Record<string, unknown>;
  config?: Record<string, unknown>;
  safeguards?: Record<string, unknown>;
  counters?: {
    totalCalls?: number;
    errorCalls?: number;
    droppedCalls?: number;
    timedOutCalls?: number;
    retriedCalls?: number;
    p50Ms?: number;
    p95Ms?: number;
    p99Ms?: number;
    totalRequestBytes?: number;
    totalResponseBytes?: number;
  };
  endpointCounters?: Record<string, EndpointCounter>;
  errorMessage?: string;
};

type StressSampleDoc = {
  secondFromStart?: number;
  calls?: number;
  errorCount?: number;
  drops?: number;
  timedOut?: number;
  latency?: {
    avgMs?: number;
    maxMs?: number;
    p95Ms?: number;
    p99Ms?: number;
  };
  process?: {
    cpuPercent?: number;
    rssMb?: number;
    heapUsedMb?: number;
    eventLoopLagMs?: number;
  };
  host?: {
    cpuPercent?: number;
    memoryPercent?: number;
  };
};

type AgentPromptTask = {
  id: string;
  title: string;
  objective: string;
  prompt: string;
};

type BuildExportArgs = {
  run: StressRunDoc;
  samples: StressSampleDoc[];
  mode: 'full' | 'ai_prompt';
};

function safeNumber(value: unknown): number {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildStressRunAiExport(args: BuildExportArgs) {
  const nowIso = new Date().toISOString();
  const runId = String(args.run?._id || '');
  const counters = args.run.counters || {};
  const endpointCounters = args.run.endpointCounters || {};
  const samples = Array.isArray(args.samples) ? args.samples : [];

  const totalCalls = safeNumber(counters.totalCalls);
  const totalErrors = safeNumber(counters.errorCalls);
  const totalDrops = safeNumber(counters.droppedCalls);
  const totalTimedOut = safeNumber(counters.timedOutCalls);
  const totalBad = totalErrors + totalDrops;
  const badRatePercent = totalCalls > 0 ? (totalBad / totalCalls) * 100 : 0;

  const observedDurationSec = samples.length
    ? Math.max(...samples.map((sample) => safeNumber(sample.secondFromStart)))
    : 0;
  const peakRps = samples.length
    ? Math.max(...samples.map((sample) => safeNumber(sample.calls)))
    : 0;
  const avgRps = observedDurationSec > 0 ? totalCalls / observedDurationSec : 0;

  const avgCpu = average(samples.map((sample) => safeNumber(sample.process?.cpuPercent)));
  const avgEventLoopLagMs = average(samples.map((sample) => safeNumber(sample.process?.eventLoopLagMs)));
  const maxRssMb = samples.length
    ? Math.max(...samples.map((sample) => safeNumber(sample.process?.rssMb)))
    : 0;

  const endpointRows = Object.entries(endpointCounters).map(([endpointKey, value]) => {
    const calls = safeNumber(value.calls);
    const errors = safeNumber(value.errors);
    const drops = safeNumber(value.drops);
    const avgLatencyMs = calls > 0 ? safeNumber(value.latencySumMs) / calls : 0;
    const errorDropRatePercent = calls > 0 ? ((errors + drops) / calls) * 100 : 0;
    return {
      endpointKey,
      calls,
      errors,
      drops,
      avgLatencyMs,
      maxLatencyMs: safeNumber(value.latencyMaxMs),
      errorDropRatePercent,
    };
  });

  const topFailingEndpoints = endpointRows
    .slice()
    .sort((a, b) => (b.errors + b.drops) - (a.errors + a.drops))
    .slice(0, 8);
  const topLatencyEndpoints = endpointRows
    .slice()
    .sort((a, b) => b.avgLatencyMs - a.avgLatencyMs)
    .slice(0, 8);

  const worstSample = samples
    .slice()
    .sort((a, b) => (safeNumber(b.errorCount) + safeNumber(b.drops)) - (safeNumber(a.errorCount) + safeNumber(a.drops)))[0];

  const globalSummaryLine =
    `Run ${args.run.name || runId} ended with ${totalCalls} calls, ` +
    `${totalErrors} errors, ${totalDrops} drops, and ${badRatePercent.toFixed(2)}% error+drop rate.`;
  const topFailingLine = topFailingEndpoints.length
    ? topFailingEndpoints
        .slice(0, 3)
        .map((entry) => `${entry.endpointKey}(${entry.errors + entry.drops}/${entry.calls})`)
        .join(', ')
    : 'no endpoint failures recorded';
  const topLatencyLine = topLatencyEndpoints.length
    ? topLatencyEndpoints
        .slice(0, 3)
        .map((entry) => `${entry.endpointKey}(${entry.avgLatencyMs.toFixed(1)}ms avg)`)
        .join(', ')
    : 'no endpoint latency data recorded';

  const commonRunContext = {
    runId,
    runName: args.run.name || '',
    status: args.run.status || '',
    createdAt: args.run.createdAt || null,
    startedAt: args.run.startedAt || null,
    endedAt: args.run.endedAt || null,
    target: args.run.target || {},
    config: args.run.config || {},
    safeguards: args.run.safeguards || {},
    counters: counters || {},
    errorMessage: args.run.errorMessage || null,
  };

  const tasks: AgentPromptTask[] = [
    {
      id: 'latency-root-cause',
      title: 'Latency Root Cause Deep Dive',
      objective: 'Identify concrete latency bottlenecks and optimization opportunities.',
      prompt:
        `${globalSummaryLine}\n` +
        `Top latency endpoints: ${topLatencyLine}.\n` +
        `Analyze likely code-path, DB, cache, and serialization bottlenecks. ` +
        `Propose prioritized fixes with expected latency impact and risk notes.`,
    },
    {
      id: 'error-drop-analysis',
      title: 'Error and Drop Stability Analysis',
      objective: 'Separate expected failures from reliability defects under load.',
      prompt:
        `${globalSummaryLine}\n` +
        `Top failing endpoints: ${topFailingLine}.\n` +
        `Classify failures by probable cause (authz, validation, state transitions, timeouts, infra saturation). ` +
        `Propose remediations and required regression/load tests.`,
    },
    {
      id: 'capacity-planning',
      title: 'Capacity and Scaling Plan',
      objective: 'Estimate safe throughput envelope and scaling strategy.',
      prompt:
        `Observed duration=${observedDurationSec}s, peakRps=${peakRps}, avgRps=${avgRps.toFixed(2)}, ` +
        `avgCpu=${avgCpu.toFixed(2)}%, maxRssMb=${maxRssMb.toFixed(2)}MB, avgEventLoopLagMs=${avgEventLoopLagMs.toFixed(2)}.\n` +
        `Create a capacity plan for next target load with infra + app-level optimizations.`,
    },
    {
      id: 'endpoint-optimization',
      title: 'Endpoint-by-Endpoint Optimization Backlog',
      objective: 'Produce a concrete optimization backlog tied to endpoint metrics.',
      prompt:
        `Using endpoint-level metrics, generate a ranked backlog (P0/P1/P2) with code-level hypotheses, ` +
        `owners, validation criteria, and expected gains.\n` +
        `Focus first on: ${topFailingLine}; and latency hotspots: ${topLatencyLine}.`,
    },
  ];

  const derived = {
    observedDurationSec,
    peakRps,
    avgRps,
    totalCalls,
    totalErrors,
    totalDrops,
    totalTimedOut,
    errorDropRatePercent: badRatePercent,
    maxRssMb,
    avgCpuPercent: avgCpu,
    avgEventLoopLagMs,
    worstSecond:
      worstSample
        ? {
            secondFromStart: safeNumber(worstSample.secondFromStart),
            errors: safeNumber(worstSample.errorCount),
            drops: safeNumber(worstSample.drops),
            calls: safeNumber(worstSample.calls),
          }
        : null,
    topFailingEndpoints,
    topLatencyEndpoints,
  };

  const payload = {
    meta: {
      type: 'stress_run_ai_export',
      version: 'v1',
      mode: args.mode,
      generatedAt: nowIso,
    },
    run: commonRunContext,
    derived,
    prompts: {
      systemPrompt:
        'You are a senior performance engineer. Use the provided stress run telemetry to identify root causes, ' +
        'propose concrete code and infra optimizations, and define verification tests.',
      tasks,
      responseSchema: {
        format: 'json',
        requiredTopLevelKeys: ['summary', 'findings', 'optimizations', 'testPlan'],
      },
    },
    samples: args.mode === 'full' ? samples : undefined,
  };

  return payload;
}
