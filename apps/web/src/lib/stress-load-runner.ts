import os from 'os';
import { monitorEventLoopDelay } from 'perf_hooks';
import {
  ErrorService,
  ResolvedStressRunConfig,
  StressRunService,
  StressSampleInput,
} from '@tdarts/services';

type EndpointKey =
  | 'tournament_get'
  | 'avatar_get'
  | 'match_get'
  | 'knockout_get'
  | 'tournament_page_get'
  | 'match_finish_leg_post'
  | 'match_finish_post'
  | 'match_undo_leg_post'
  | 'match_update_player_post'
  | 'match_update_board_status_post'
  | 'match_update_settings_post'
  | 'tournament_generate_groups_post'
  | 'tournament_generate_knockout_post'
  | 'tournament_finish_post';

type EndpointPlan = {
  key: EndpointKey;
  method: 'GET' | 'POST';
  weight: number;
};

type RunnerStartArgs = {
  runId: string;
  config: ResolvedStressRunConfig;
  sandboxes: Array<{
    tournamentCode: string;
    matchIds: string[];
    playerIds: string[];
  }>;
  authToken?: string;
};

type MutableBucket = {
  calls: number;
  successes: number;
  errors: number;
  drops: number;
  timedOut: number;
  retried: number;
  requestBytes: number;
  responseBytes: number;
  latencies: number[];
  endpoint: Record<EndpointKey, {
    calls: number;
    errors: number;
    drops: number;
    latencySumMs: number;
    latencyMaxMs: number;
  }>;
};

type ActiveRunner = {
  runId: string;
  stopRequested: boolean;
  finished: boolean;
  startedAtMs: number;
  endsAtMs: number;
  bucket: MutableBucket;
  usersTarget: number;
  activeUsers: number;
  userPromises: Promise<void>[];
  sampleTimer?: NodeJS.Timeout;
  eventLoop: ReturnType<typeof monitorEventLoopDelay>;
  lastCpuUsage: NodeJS.CpuUsage;
  lastCpuTsNs: bigint;
  failureStreak: number;
  config: ResolvedStressRunConfig;
  sandboxes: RunnerStartArgs['sandboxes'];
  authToken?: string;
};

const ACTIVE_RUNNERS = new Map<string, ActiveRunner>();
const ENDPOINT_KEYS: EndpointKey[] = [
  'tournament_get',
  'avatar_get',
  'match_get',
  'knockout_get',
  'tournament_page_get',
  'match_finish_leg_post',
  'match_finish_post',
  'match_undo_leg_post',
  'match_update_player_post',
  'match_update_board_status_post',
  'match_update_settings_post',
  'tournament_generate_groups_post',
  'tournament_generate_knockout_post',
  'tournament_finish_post',
];

function emptyBucket(): MutableBucket {
  const endpoint = Object.fromEntries(
    ENDPOINT_KEYS.map((key) => [
      key,
      { calls: 0, errors: 0, drops: 0, latencySumMs: 0, latencyMaxMs: 0 },
    ])
  ) as MutableBucket['endpoint'];
  return {
    calls: 0,
    successes: 0,
    errors: 0,
    drops: 0,
    timedOut: 0,
    retried: 0,
    requestBytes: 0,
    responseBytes: 0,
    latencies: [],
    endpoint,
  };
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx] ?? 0;
}

function randomItem<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)] as T;
}

function weightedPick(plans: EndpointPlan[]): EndpointPlan {
  const total = plans.reduce((acc, p) => acc + p.weight, 0);
  if (total <= 0) return plans[0] as EndpointPlan;
  const target = Math.random() * total;
  let cursor = 0;
  for (const plan of plans) {
    cursor += plan.weight;
    if (target <= cursor) return plan;
  }
  return plans[plans.length - 1] as EndpointPlan;
}

function buildEndpointPlans(config: ResolvedStressRunConfig): EndpointPlan[] {
  const basePlans: EndpointPlan[] = [
    { key: 'tournament_get', method: 'GET', weight: config.weights.tournamentGet },
    { key: 'avatar_get', method: 'GET', weight: config.weights.avatarGet },
    { key: 'match_get', method: 'GET', weight: config.weights.matchGet },
    { key: 'knockout_get', method: 'GET', weight: config.weights.knockoutGet },
    { key: 'tournament_page_get', method: 'GET', weight: config.weights.tournamentPageGet },
    { key: 'match_finish_leg_post', method: 'POST', weight: config.weights.matchFinishLegPost },
    { key: 'match_finish_post', method: 'POST', weight: config.weights.matchFinishPost },
    { key: 'match_undo_leg_post', method: 'POST', weight: config.weights.matchUndoLegPost },
    { key: 'match_update_player_post', method: 'POST', weight: config.weights.matchUpdatePlayerPost },
    { key: 'match_update_board_status_post', method: 'POST', weight: config.weights.matchUpdateBoardStatusPost },
    { key: 'match_update_settings_post', method: 'POST', weight: config.weights.matchUpdateSettingsPost },
    { key: 'tournament_generate_groups_post', method: 'POST', weight: config.weights.tournamentGenerateGroupsPost },
    { key: 'tournament_generate_knockout_post', method: 'POST', weight: config.weights.tournamentGenerateKnockoutPost },
    { key: 'tournament_finish_post', method: 'POST', weight: config.weights.tournamentFinishPost },
  ];

  const safeMatchOnly: EndpointKey[] = [
    'tournament_get',
    'avatar_get',
    'match_get',
    'knockout_get',
    'tournament_page_get',
    'match_update_board_status_post',
    'match_update_settings_post',
  ];

  const endpointProfilePlans = config.endpointProfile === 'session_safe_match'
    ? basePlans.filter((plan) => safeMatchOnly.includes(plan.key))
    : basePlans;

  const plans = config.parallelTournamentTest
    ? endpointProfilePlans
    : endpointProfilePlans.filter((plan) => !String(plan.key).startsWith('tournament_generate_') && plan.key !== 'tournament_finish_post');

  return plans.filter((plan) => plan.weight > 0);
}

function isTournamentPlan(plan: EndpointPlan): boolean {
  return (
    plan.key === 'tournament_get' ||
    plan.key === 'knockout_get' ||
    plan.key === 'tournament_page_get' ||
    plan.key === 'tournament_generate_groups_post' ||
    plan.key === 'tournament_generate_knockout_post' ||
    plan.key === 'tournament_finish_post'
  );
}

function buildEndpointRequest(
  plan: EndpointPlan,
  config: ResolvedStressRunConfig,
  sandbox: RunnerStartArgs['sandboxes'][number]
): { url: string; body?: string } {
  const matchId = randomItem(sandbox.matchIds);
  const playerId = randomItem(sandbox.playerIds);
  const alternatePlayerId = randomItem(sandbox.playerIds);
  const code = sandbox.tournamentCode;
  const locale = config.locale || 'hu';
  const winner = Math.random() > 0.5 ? 1 : 2;
  const playerPosition = Math.random() > 0.5 ? 'player1' : 'player2';
  const throwVisit = [{ score: 60, darts: 3 }, { score: 45, darts: 3 }, { score: 36, darts: 3 }];

  switch (plan.key) {
    case 'tournament_get':
      return { url: `${config.baseUrl}/api/tournaments/${code}?include=viewer` };
    case 'avatar_get':
      return { url: `${config.baseUrl}/api/players/${playerId}/avatar` };
    case 'match_get':
      return { url: `${config.baseUrl}/api/matches/${matchId}` };
    case 'knockout_get':
      return { url: `${config.baseUrl}/api/tournaments/${code}/knockout` };
    case 'tournament_page_get':
      return { url: `${config.baseUrl}/${locale}/tournaments/${code}` };
    case 'match_update_board_status_post':
      return { url: `${config.baseUrl}/api/matches/${matchId}/updateBoardStatus` };
    case 'match_finish_leg_post':
      return {
        url: `${config.baseUrl}/api/matches/${matchId}/finish-leg`,
        body: JSON.stringify({
          winner,
          player1Throws: throwVisit,
          player2Throws: throwVisit,
          winnerArrowCount: 3,
        }),
      };
    case 'match_finish_post':
      return {
        url: `${config.baseUrl}/api/matches/${matchId}/finish`,
        body: JSON.stringify({
          player1LegsWon: winner === 1 ? 2 : 1,
          player2LegsWon: winner === 2 ? 2 : 1,
          allowManualFinish: true,
          isManual: true,
        }),
      };
    case 'match_undo_leg_post':
      return { url: `${config.baseUrl}/api/matches/${matchId}/undo-leg` };
    case 'match_update_player_post':
      return {
        url: `${config.baseUrl}/api/matches/${matchId}/updatePlayer`,
        body: JSON.stringify({
          tournamentId: code,
          playerPosition,
          playerId: playerPosition === 'player1' ? playerId : alternatePlayerId,
        }),
      };
    case 'match_update_settings_post':
      return {
        url: `${config.baseUrl}/api/matches/${matchId}/update-settings`,
        body: JSON.stringify({ boardNumber: 1 }),
      };
    case 'tournament_generate_groups_post':
      return { url: `${config.baseUrl}/api/tournaments/${code}/generateGroups` };
    case 'tournament_generate_knockout_post':
      return {
        url: `${config.baseUrl}/api/tournaments/${code}/generateKnockout`,
        body: JSON.stringify({ qualifiersPerGroup: 2 }),
      };
    case 'tournament_finish_post':
      return {
        url: `${config.baseUrl}/api/tournaments/${code}/finish`,
        body: JSON.stringify({}),
      };
    default:
      return { url: `${config.baseUrl}/api/tournaments/${code}` };
  }
}

async function executeSingleRequest(
  runner: ActiveRunner,
  endpoint: EndpointPlan,
  sandbox: RunnerStartArgs['sandboxes'][number]
): Promise<void> {
  const req = buildEndpointRequest(endpoint, runner.config, sandbox);
  const baseHeaders: Record<string, string> = {
    'x-stress-run-id': runner.runId,
    'x-stress-endpoint-key': endpoint.key,
  };
  if (req.body) {
    baseHeaders['content-type'] = 'application/json';
  }
  if (runner.authToken) {
    baseHeaders.cookie = `token=${runner.authToken}`;
  }

  const requestBytes = Buffer.byteLength(req.url) + (req.body ? Buffer.byteLength(req.body) : 0);

  let attempt = 0;
  while (attempt <= runner.config.retryCount) {
    const attemptStart = performance.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), runner.config.requestTimeoutMs);
    try {
      const response = await fetch(req.url, {
        method: endpoint.method,
        headers: baseHeaders,
        body: req.body,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const elapsed = Math.max(0, performance.now() - attemptStart);
      const responseLengthHeader = response.headers.get('content-length');
      let responseBytes = responseLengthHeader ? Number(responseLengthHeader) : 0;
      if (!Number.isFinite(responseBytes) || responseBytes < 0) responseBytes = 0;

      const isError = response.status >= 400;
      const endpointBucket = runner.bucket.endpoint[endpoint.key];

      runner.bucket.calls += 1;
      runner.bucket.requestBytes += requestBytes;
      runner.bucket.responseBytes += responseBytes;
      runner.bucket.latencies.push(elapsed);
      endpointBucket.calls += 1;
      endpointBucket.latencySumMs += elapsed;
      endpointBucket.latencyMaxMs = Math.max(endpointBucket.latencyMaxMs, elapsed);

      if (isError) {
        runner.bucket.errors += 1;
        endpointBucket.errors += 1;
      } else {
        runner.bucket.successes += 1;
      }
      return;
    } catch (error: any) {
      clearTimeout(timeout);
      const timedOut = error?.name === 'AbortError';
      const canRetry = attempt < runner.config.retryCount;
      if (canRetry) {
        runner.bucket.retried += 1;
        attempt += 1;
        continue;
      }

      const endpointBucket = runner.bucket.endpoint[endpoint.key];
      runner.bucket.calls += 1;
      runner.bucket.drops += 1;
      if (timedOut) runner.bucket.timedOut += 1;
      runner.bucket.requestBytes += requestBytes;
      endpointBucket.calls += 1;
      endpointBucket.drops += 1;
      return;
    }
  }
}

async function runUserLoop(runner: ActiveRunner, userIndex: number, plans: EndpointPlan[]): Promise<void> {
  const rampMsPerUser = runner.config.rampUpSeconds > 0
    ? (runner.config.rampUpSeconds * 1000) / Math.max(1, runner.usersTarget)
    : 0;
  const delayMs = Math.round(userIndex * rampMsPerUser);
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  runner.activeUsers += 1;

  try {
    const tournamentPlans = plans.filter(isTournamentPlan);
    const lifecyclePlans = plans.filter((plan) => !isTournamentPlan(plan));

    while (!runner.stopRequested && Date.now() < runner.endsAtMs) {
      const sandbox = randomItem(runner.sandboxes);
      if (runner.config.parallelTournamentTest && tournamentPlans.length > 0 && lifecyclePlans.length > 0) {
        const tournamentEndpoint = weightedPick(tournamentPlans);
        const lifecycleEndpoint = weightedPick(lifecyclePlans);
        await Promise.all([
          executeSingleRequest(runner, tournamentEndpoint, sandbox),
          executeSingleRequest(runner, lifecycleEndpoint, sandbox),
        ]);
      } else {
        const endpoint = weightedPick(plans);
        await executeSingleRequest(runner, endpoint, sandbox);
      }
    }
  } finally {
    runner.activeUsers = Math.max(0, runner.activeUsers - 1);
  }
}

function buildSamplePayload(runner: ActiveRunner): StressSampleInput {
  const elapsedNs = process.hrtime.bigint() - runner.lastCpuTsNs;
  const elapsedMicros = Number(elapsedNs / BigInt(1000));
  const cpuUsageNow = process.cpuUsage();
  const cpuDeltaUser = cpuUsageNow.user - runner.lastCpuUsage.user;
  const cpuDeltaSystem = cpuUsageNow.system - runner.lastCpuUsage.system;
  const cpuDeltaMicros = Math.max(0, cpuDeltaUser + cpuDeltaSystem);
  const cores = Math.max(1, os.cpus().length || 1);
  const cpuPercent = elapsedMicros > 0 ? (cpuDeltaMicros / elapsedMicros) * (100 / cores) : 0;

  runner.lastCpuUsage = cpuUsageNow;
  runner.lastCpuTsNs = process.hrtime.bigint();

  const mem = process.memoryUsage();
  const lagMs = runner.eventLoop.mean / 1_000_000;
  runner.eventLoop.reset();

  const latencies = runner.bucket.latencies;
  const calls = runner.bucket.calls;
  const avgMs = calls > 0 ? latencies.reduce((sum, value) => sum + value, 0) / calls : 0;
  const maxMs = latencies.length ? Math.max(...latencies) : 0;
  const p50Ms = percentile(latencies, 50);
  const p95Ms = percentile(latencies, 95);
  const p99Ms = percentile(latencies, 99);

  const endpointBreakdown = Object.fromEntries(
    Object.entries(runner.bucket.endpoint).map(([key, value]) => [
      key,
      {
        calls: value.calls,
        errors: value.errors,
        drops: value.drops,
        avgLatencyMs: value.calls > 0 ? value.latencySumMs / value.calls : 0,
        maxLatencyMs: value.latencyMaxMs,
      },
    ])
  ) as StressSampleInput['endpointBreakdown'];

  const out: StressSampleInput = {
    secondFromStart: Math.max(0, Math.floor((Date.now() - runner.startedAtMs) / 1000)),
    activeUsers: runner.activeUsers,
    calls,
    successes: runner.bucket.successes,
    errors: runner.bucket.errors,
    drops: runner.bucket.drops,
    timedOut: runner.bucket.timedOut,
    retried: runner.bucket.retried,
    requestBytes: runner.bucket.requestBytes,
    responseBytes: runner.bucket.responseBytes,
    latency: { avgMs, maxMs, p50Ms, p95Ms, p99Ms },
    process: {
      cpuPercent,
      rssMb: mem.rss / 1024 / 1024,
      heapUsedMb: mem.heapUsed / 1024 / 1024,
      heapTotalMb: mem.heapTotal / 1024 / 1024,
      eventLoopLagMs: lagMs,
    },
    endpointBreakdown,
  };

  runner.bucket = emptyBucket();
  return out;
}

async function runLifecycle(runner: ActiveRunner): Promise<void> {
  const plans = buildEndpointPlans(runner.config);
  if (!plans.length) {
    throw new Error('No endpoints selected to execute.');
  }

  await StressRunService.setStatus(runner.runId, 'running');

  runner.userPromises = Array.from({ length: runner.usersTarget }).map((_, index) =>
    runUserLoop(runner, index, plans)
  );

  runner.sampleTimer = setInterval(async () => {
    try {
      const sample = buildSamplePayload(runner);
      await StressRunService.addSample(runner.runId, sample);

      const total = sample.calls || 0;
      const bad = sample.errors + sample.drops;
      const badRate = total > 0 ? (bad / total) * 100 : 0;
      if (total >= 20 && badRate >= runner.config.circuitBreakerErrorRatePercent) {
        runner.failureStreak += 1;
      } else {
        runner.failureStreak = 0;
      }
      if (runner.failureStreak >= 3) {
        runner.stopRequested = true;
        await StressRunService.setStatus(runner.runId, 'failed', {
          errorMessage: `Circuit breaker triggered: error+drop rate >= ${runner.config.circuitBreakerErrorRatePercent}%`,
        });
      }
    } catch (error) {
      console.error('Failed to write stress sample', error);
    }
  }, 1000);

  await Promise.all(runner.userPromises);

  if (runner.sampleTimer) {
    clearInterval(runner.sampleTimer);
    runner.sampleTimer = undefined;
  }

  // Flush remaining metrics from current second.
  const finalSample = buildSamplePayload(runner);
  if (finalSample.calls > 0 || finalSample.errors > 0 || finalSample.drops > 0) {
    await StressRunService.addSample(runner.runId, finalSample);
  }

  if (runner.finished) return;
  runner.finished = true;

  const existing = await StressRunService.getRun(runner.runId);
  if ((existing as any)?.status === 'failed') {
    return;
  }

  await StressRunService.setStatus(runner.runId, runner.stopRequested ? 'stopped' : 'completed');
}

export class StressLoadRunner {
  static hasActiveRun(): boolean {
    for (const runner of ACTIVE_RUNNERS.values()) {
      if (!runner.finished) return true;
    }
    return false;
  }

  static async start(args: RunnerStartArgs): Promise<void> {
    if (ACTIVE_RUNNERS.has(args.runId)) return;
    if (!args.sandboxes.length) {
      throw new Error('At least one sandbox is required to start stress runner.');
    }

    const eventLoop = monitorEventLoopDelay({ resolution: 20 });
    eventLoop.enable();
    const runner: ActiveRunner = {
      runId: args.runId,
      stopRequested: false,
      finished: false,
      startedAtMs: Date.now(),
      endsAtMs: Date.now() + args.config.durationSeconds * 1000,
      bucket: emptyBucket(),
      usersTarget: args.config.users,
      activeUsers: 0,
      userPromises: [],
      eventLoop,
      lastCpuUsage: process.cpuUsage(),
      lastCpuTsNs: process.hrtime.bigint(),
      failureStreak: 0,
      config: args.config,
      sandboxes: args.sandboxes,
      authToken: args.authToken,
    };

    ACTIVE_RUNNERS.set(args.runId, runner);

    void runLifecycle(runner)
      .catch(async (error: any) => {
        const message = error?.message || 'Stress runner failed unexpectedly';
        await StressRunService.setStatus(args.runId, 'failed', { errorMessage: message });
        await ErrorService.logError('Stress runner execution failed', error, 'api', {
          operation: 'stress_runner_execution',
          endpoint: '/api/admin/stress-runs/start',
          metadata: { runId: args.runId, message },
        });
      })
      .finally(() => {
        runner.eventLoop.disable();
        runner.finished = true;
        if (runner.sampleTimer) clearInterval(runner.sampleTimer);
        ACTIVE_RUNNERS.delete(args.runId);
      });
  }

  static async stop(runId: string): Promise<boolean> {
    const runner = ACTIVE_RUNNERS.get(runId);
    if (!runner) return false;
    runner.stopRequested = true;
    return true;
  }
}

export const __stressRunnerTestUtils = {
  percentile,
  buildEndpointPlans,
};
