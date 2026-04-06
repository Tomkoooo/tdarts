import mongoose from 'mongoose';
import { connectMongo } from '@tdarts/core';
import { StressRunModel, StressRunStatus } from '@tdarts/core';
import { StressRunSampleModel } from '@tdarts/core';
import { TournamentModel } from '@tdarts/core';
import { MatchModel } from '@tdarts/core';
import { ClubModel } from '@tdarts/core';
import { PlayerModel } from '@tdarts/core';
import { TournamentService } from './tournament.service';

export type StressTargetEnvironment = 'production' | 'staging' | 'custom';
export type StressEndpointProfile = 'session_full_match' | 'session_safe_match';

export type StressRunRequestConfig = {
  name?: string;
  users: number;
  durationSeconds: number;
  rampUpSeconds?: number;
  requestTimeoutMs?: number;
  retryCount?: number;
  locale?: string;
  targetEnvironment: StressTargetEnvironment;
  baseUrl: string;
  tournamentCode: string;
  productionConfirmed?: boolean;
  dangerModeConfirmation?: string;
  autoProvisionLifecycle?: boolean;
  provisionPlayerCount?: number;
  parallelTournamentTest?: boolean;
  parallelTournamentCount?: number;
  clubId?: string;
  endpointProfile?: StressEndpointProfile;
  circuitBreakerErrorRatePercent?: number;
  weights?: Partial<{
    tournamentGet: number;
    avatarGet: number;
    matchGet: number;
    knockoutGet: number;
    tournamentPageGet: number;
    matchFinishLegPost: number;
    matchFinishPost: number;
    matchUndoLegPost: number;
    matchUpdatePlayerPost: number;
    matchUpdateBoardStatusPost: number;
    matchUpdateSettingsPost: number;
    tournamentGenerateGroupsPost: number;
    tournamentGenerateKnockoutPost: number;
    tournamentFinishPost: number;
  }>;
};

export type ResolvedStressRunConfig = {
  name: string;
  users: number;
  durationSeconds: number;
  rampUpSeconds: number;
  requestTimeoutMs: number;
  retryCount: number;
  locale: string;
  targetEnvironment: StressTargetEnvironment;
  baseUrl: string;
  tournamentCode: string;
  productionConfirmed: boolean;
  autoProvisionLifecycle: boolean;
  provisionPlayerCount: number;
  parallelTournamentTest: boolean;
  parallelTournamentCount: number;
  clubId: string;
  endpointProfile: StressEndpointProfile;
  circuitBreakerErrorRatePercent: number;
  weights: {
    tournamentGet: number;
    avatarGet: number;
    matchGet: number;
    knockoutGet: number;
    tournamentPageGet: number;
    matchFinishLegPost: number;
    matchFinishPost: number;
    matchUndoLegPost: number;
    matchUpdatePlayerPost: number;
    matchUpdateBoardStatusPost: number;
    matchUpdateSettingsPost: number;
    tournamentGenerateGroupsPost: number;
    tournamentGenerateKnockoutPost: number;
    tournamentFinishPost: number;
  };
};

type SandboxContext = {
  tournamentObjectId: mongoose.Types.ObjectId;
  tournamentCode: string;
  matchIds: mongoose.Types.ObjectId[];
  playerIds: mongoose.Types.ObjectId[];
};

type SandboxResolution = {
  primarySandbox: SandboxContext;
  sandboxes: SandboxContext[];
};

export type SampleEndpoint = {
  calls: number;
  errors: number;
  drops: number;
  avgLatencyMs: number;
  maxLatencyMs: number;
};

export type StressSampleInput = {
  secondFromStart: number;
  activeUsers: number;
  calls: number;
  successes: number;
  errors: number;
  drops: number;
  timedOut: number;
  retried: number;
  requestBytes: number;
  responseBytes: number;
  latency: {
    avgMs: number;
    maxMs: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
  };
  process: {
    cpuPercent: number;
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
    eventLoopLagMs: number;
  };
  endpointBreakdown: Record<string, SampleEndpoint>;
};

const MAX_USERS = 1000;
const MAX_DURATION_SECONDS = 10 * 60;
const MAX_CONCURRENT_RUNS = 1;

const DEFAULT_WEIGHTS = {
  tournamentGet: 25,
  avatarGet: 15,
  matchGet: 20,
  knockoutGet: 15,
  tournamentPageGet: 20,
  matchFinishLegPost: 4,
  matchFinishPost: 3,
  matchUndoLegPost: 2,
  matchUpdatePlayerPost: 2,
  matchUpdateBoardStatusPost: 3,
  matchUpdateSettingsPost: 2,
  tournamentGenerateGroupsPost: 2,
  tournamentGenerateKnockoutPost: 2,
  tournamentFinishPost: 1,
};

export class StressRunService {
  static readonly MAX_USERS = MAX_USERS;
  static readonly MAX_DURATION_SECONDS = MAX_DURATION_SECONDS;
  static readonly MAX_CONCURRENT_RUNS = MAX_CONCURRENT_RUNS;

  static resolveConfig(input: StressRunRequestConfig): ResolvedStressRunConfig {
    const users = Math.max(1, Math.min(MAX_USERS, Number(input.users || 0)));
    const durationSeconds = Math.max(10, Math.min(MAX_DURATION_SECONDS, Number(input.durationSeconds || 0)));
    const rampUpSeconds = Math.max(0, Math.min(600, Number(input.rampUpSeconds ?? 30)));
    const requestTimeoutMs = Math.max(250, Math.min(120_000, Number(input.requestTimeoutMs ?? 10_000)));
    const retryCount = Math.max(0, Math.min(5, Number(input.retryCount ?? 0)));
    const locale = (input.locale || 'hu').trim() || 'hu';
    const targetEnvironment = input.targetEnvironment;
    const baseUrl = (input.baseUrl || '').trim().replace(/\/+$/, '');
    const tournamentCode = (input.tournamentCode || '').trim().toUpperCase();
    const productionConfirmed = Boolean(input.productionConfirmed && input.dangerModeConfirmation === 'I_UNDERSTAND_THE_RISK');
    const autoProvisionLifecycle = Boolean(input.autoProvisionLifecycle);
    const provisionPlayerCount = Math.max(4, Math.min(128, Number(input.provisionPlayerCount ?? 32)));
    const parallelTournamentTest = Boolean(input.parallelTournamentTest);
    const parallelTournamentCount = Math.max(1, Math.min(20, Number(input.parallelTournamentCount ?? 1)));
    const clubId = (input.clubId || '').trim();
    const endpointProfile: StressEndpointProfile = input.endpointProfile === 'session_safe_match'
      ? 'session_safe_match'
      : 'session_full_match';
    const circuitBreakerErrorRatePercent = Math.max(5, Math.min(95, Number(input.circuitBreakerErrorRatePercent ?? 45)));
    const mergedWeights = {
      ...DEFAULT_WEIGHTS,
      ...(input.weights || {}),
    };

    return {
      name: (input.name || `Stress run ${new Date().toISOString()}`).trim(),
      users,
      durationSeconds,
      rampUpSeconds,
      requestTimeoutMs,
      retryCount,
      locale,
      targetEnvironment,
      baseUrl,
      tournamentCode,
      productionConfirmed,
      autoProvisionLifecycle,
      provisionPlayerCount,
      parallelTournamentTest,
      parallelTournamentCount,
      clubId,
      endpointProfile,
      circuitBreakerErrorRatePercent,
      weights: mergedWeights,
    };
  }

  private static getNearestPowerOfTwo(value: number): number {
    if (value <= 2) return 2;
    const p = Math.floor(Math.log2(value));
    return Math.max(2, 2 ** p);
  }

  private static async getAdminClubId(adminUserId: string): Promise<string> {
    await connectMongo();
    const club = (await ClubModel.findOne({
      $or: [{ admin: adminUserId }, { moderators: adminUserId }],
    })
      .select('_id')
      .lean()) as any;

    if (!club?._id) {
      throw new Error('No club found for auto-provisioning. Provide an existing sandbox tournament code instead.');
    }
    return String(club._id);
  }

  private static async resolveProvisionClubId(adminUserId: string, requestedClubId: string): Promise<string> {
    if (!requestedClubId) {
      return this.getAdminClubId(adminUserId);
    }

    if (!mongoose.Types.ObjectId.isValid(requestedClubId)) {
      throw new Error('Provided clubId is not a valid ObjectId.');
    }

    await connectMongo();
    const club = (await ClubModel.findOne({
      _id: new mongoose.Types.ObjectId(requestedClubId),
      $or: [{ admin: adminUserId }, { moderators: adminUserId }],
    })
      .select('_id')
      .lean()) as any;

    if (!club?._id) {
      throw new Error('You do not have permission to create sandbox tournaments for the provided clubId.');
    }

    return String(club._id);
  }

  private static async ensureSandboxTournamentForAutoProvision(
    adminUserId: string,
    config: ResolvedStressRunConfig
  ): Promise<string> {
    await connectMongo();

    if (config.tournamentCode) {
      const existing = (await TournamentModel.findOne({
        tournamentId: config.tournamentCode,
        isDeleted: false,
        isArchived: false,
      })
        .select('_id isSandbox')
        .lean()) as any;

      if (existing?._id) {
        if (!existing.isSandbox) {
          throw new Error('Auto-provisioning requires a sandbox tournament. Provided tournament is not sandbox.');
        }
        return config.tournamentCode;
      }
    }

    const clubId = await this.resolveProvisionClubId(adminUserId, config.clubId);
    const created = await TournamentService.createTournament({
      tournamentId: config.tournamentCode || undefined,
      clubId: new mongoose.Types.ObjectId(clubId),
      isSandbox: true,
      boards: [
        { boardNumber: 1, name: 'Board 1', status: 'idle', isActive: true },
        { boardNumber: 2, name: 'Board 2', status: 'idle', isActive: true },
      ] as any,
      tournamentSettings: {
        status: 'pending',
        name: `Stress Sandbox ${new Date().toISOString().slice(0, 16)}`,
        description: 'Auto-provisioned stress sandbox tournament',
        startDate: new Date(),
        maxPlayers: Math.max(8, config.provisionPlayerCount),
        format: 'group_knockout',
        startingScore: 501,
        tournamentPassword: 'stress',
        knockoutMethod: 'automatic',
        boardCount: 2,
        type: 'amateur',
        participationMode: 'individual',
      } as any,
    } as any);

    return String((created as any).tournamentId);
  }

  private static async autoProvisionLifecycle(
    adminUserId: string,
    config: ResolvedStressRunConfig
  ): Promise<SandboxContext> {
    const tournamentCode = await this.ensureSandboxTournamentForAutoProvision(adminUserId, config);

    await connectMongo();
    const tournament = await TournamentModel.findOne({
      tournamentId: tournamentCode,
      isDeleted: false,
      isArchived: false,
      isSandbox: true,
    });
    if (!tournament) {
      throw new Error('Auto-provisioning failed: sandbox tournament not found after creation.');
    }

    const existingPlayers = (tournament.tournamentPlayers || []).length;
    const missingPlayers = Math.max(0, config.provisionPlayerCount - existingPlayers);
    if (missingPlayers > 0) {
      const suffix = Date.now().toString(36).slice(-6);
      const docs = Array.from({ length: missingPlayers }).map((_, index) => ({
        name: `Stress Player ${index + 1} ${suffix}`,
      }));
      const createdPlayers = await PlayerModel.insertMany(docs);
      for (const player of createdPlayers) {
        await TournamentService.addTournamentPlayer(tournamentCode, String(player._id));
      }
    }

    const refreshed = await TournamentModel.findOne({
      tournamentId: tournamentCode,
      isDeleted: false,
      isArchived: false,
      isSandbox: true,
    });
    if (!refreshed) {
      throw new Error('Auto-provisioning failed while refreshing sandbox tournament.');
    }

    for (const entry of refreshed.tournamentPlayers || []) {
      const playerId = String(entry.playerReference);
      if (entry.status !== 'checked-in') {
        await TournamentService.updateTournamentPlayerStatus(tournamentCode, playerId, 'checked-in');
      }
    }

    try {
      if (!refreshed.groups || refreshed.groups.length === 0) {
        await TournamentService.generateGroups(tournamentCode, adminUserId);
      }
    } catch {
      // If groups already exist or generation is not allowed in current status, continue.
    }

    const afterGroups = (await TournamentModel.findOne({
      tournamentId: tournamentCode,
      isDeleted: false,
      isArchived: false,
      isSandbox: true,
    })
      .select('knockout tournamentPlayers')
      .lean()) as any;

    const hasKnockout = Boolean(afterGroups?.knockout && afterGroups.knockout.length > 0);
    if (!hasKnockout) {
      const checkedInCount = (afterGroups?.tournamentPlayers || []).filter((p: any) => p.status === 'checked-in').length;
      const playersCount = this.getNearestPowerOfTwo(checkedInCount);
      try {
        await TournamentService.generateKnockout(tournamentCode, adminUserId, { playersCount });
      } catch {
        // Knockout generation can fail depending on tournament state; it's optional for stress runs.
      }
    }

    return this.validateAndResolveSandbox(tournamentCode);
  }

  static async validateAndResolveSandbox(tournamentCode: string): Promise<SandboxContext> {
    await connectMongo();
    const tournament = (await TournamentModel.findOne({
      tournamentId: tournamentCode,
      isDeleted: false,
      isArchived: false,
      isSandbox: true,
    })
      .select('_id tournamentId tournamentPlayers.playerReference')
      .lean()) as any;

    if (!tournament?._id) {
      throw new Error('Sandbox tournament not found. Use an existing sandbox tournament code.');
    }

    const matchRows = (await MatchModel.find({ tournamentRef: tournament._id })
      .sort({ createdAt: -1 })
      .limit(200)
      .select('_id')
      .lean()) as any[];

    if (!matchRows.length) {
      throw new Error('Sandbox tournament has no matches. Generate matches before starting stress runs.');
    }

    const playerIds = (tournament.tournamentPlayers || [])
      .map((row: any) => row?.playerReference)
      .filter(Boolean)
      .slice(0, 400);

    if (!playerIds.length) {
      throw new Error('Sandbox tournament has no players. Add players before starting stress runs.');
    }

    return {
      tournamentObjectId: tournament._id,
      tournamentCode: tournament.tournamentId,
      matchIds: matchRows.map((m) => m._id),
      playerIds,
    };
  }

  static async resolveSandboxesForRun(
    adminUserId: string,
    config: ResolvedStressRunConfig
  ): Promise<SandboxResolution> {
    if (config.autoProvisionLifecycle) {
      const targetCount = config.parallelTournamentTest ? config.parallelTournamentCount : 1;
      if (targetCount > 1 && config.tournamentCode) {
        throw new Error('parallelTournamentCount > 1 requires empty tournamentCode so unique sandbox tournaments can be created.');
      }

      const sandboxes: SandboxContext[] = [];
      for (let i = 0; i < targetCount; i += 1) {
        const perSandboxConfig: ResolvedStressRunConfig = {
          ...config,
          tournamentCode: i === 0 ? config.tournamentCode : '',
        };
        const sandbox = await this.autoProvisionLifecycle(adminUserId, perSandboxConfig);
        sandboxes.push(sandbox);
      }

      return {
        primarySandbox: sandboxes[0] as SandboxContext,
        sandboxes,
      };
    }
    if (!config.tournamentCode) {
      throw new Error('tournamentCode is required unless auto-provision lifecycle is enabled.');
    }
    const sandbox = await this.validateAndResolveSandbox(config.tournamentCode);
    return {
      primarySandbox: sandbox,
      sandboxes: [sandbox],
    };
  }

  static async assertCanStartRun(): Promise<void> {
    await connectMongo();
    const runningCount = await StressRunModel.countDocuments({ status: { $in: ['queued', 'running'] } });
    if (runningCount >= MAX_CONCURRENT_RUNS) {
      throw new Error('Another stress run is already active. Stop it before starting a new one.');
    }
  }

  static async createRun(adminUserId: string, config: ResolvedStressRunConfig, sandboxes: SandboxContext[]) {
    await connectMongo();
    const primarySandbox = sandboxes[0];
    if (!primarySandbox) {
      throw new Error('No sandbox contexts resolved for stress run.');
    }

    const mergedMatchIds = Array.from(
      new Set(sandboxes.flatMap((sandbox) => sandbox.matchIds.map((id) => String(id))))
    ).map((id) => new mongoose.Types.ObjectId(id));
    const mergedPlayerIds = Array.from(
      new Set(sandboxes.flatMap((sandbox) => sandbox.playerIds.map((id) => String(id))))
    ).map((id) => new mongoose.Types.ObjectId(id));

    const run = await StressRunModel.create({
      name: config.name,
      status: 'queued',
      requestedByUserId: adminUserId,
      target: {
        environment: config.targetEnvironment,
        baseUrl: config.baseUrl,
        locale: config.locale,
        tournamentCode: config.tournamentCode,
        sandboxOnly: true,
      },
      config: {
        users: config.users,
        durationSeconds: config.durationSeconds,
        rampUpSeconds: config.rampUpSeconds,
        requestTimeoutMs: config.requestTimeoutMs,
        retryCount: config.retryCount,
        parallelTournamentTest: config.parallelTournamentTest,
        parallelTournamentCount: config.parallelTournamentCount,
        clubId: config.clubId,
        endpointProfile: config.endpointProfile,
        weights: config.weights,
      },
      sandbox: {
        tournamentId: primarySandbox.tournamentObjectId,
        matchIds: mergedMatchIds,
        playerIds: mergedPlayerIds,
      },
      safeguards: {
        productionConfirmed: config.productionConfirmed,
        maxUsersApplied: MAX_USERS,
        maxDurationAppliedSeconds: MAX_DURATION_SECONDS,
        circuitBreakerErrorRatePercent: config.circuitBreakerErrorRatePercent,
      },
      counters: {
        totalCalls: 0,
        successCalls: 0,
        errorCalls: 0,
        droppedCalls: 0,
        timedOutCalls: 0,
        retriedCalls: 0,
        totalRequestBytes: 0,
        totalResponseBytes: 0,
        latencySumMs: 0,
        latencyMaxMs: 0,
        p50Ms: 0,
        p95Ms: 0,
        p99Ms: 0,
      },
      endpointCounters: {},
    });

    return run;
  }

  static async setStatus(runId: string, status: StressRunStatus, extra?: Partial<{ errorMessage: string; notes: string }>) {
    await connectMongo();
    const update: Record<string, unknown> = { status };
    if (status === 'running') {
      update.startedAt = new Date();
    }
    if (status === 'completed' || status === 'stopped' || status === 'failed') {
      update.endedAt = new Date();
    }
    if (extra?.errorMessage) update.errorMessage = extra.errorMessage;
    if (extra?.notes) update.notes = extra.notes;
    await StressRunModel.updateOne({ _id: runId }, { $set: update });
  }

  static async addSample(runId: string, sample: StressSampleInput): Promise<void> {
    await connectMongo();
    const timestamp = new Date();
    const safeCalls = Math.max(0, sample.calls);
    const avgLatency = Number.isFinite(sample.latency.avgMs) ? sample.latency.avgMs : 0;

    await StressRunSampleModel.updateOne(
      { runId, secondFromStart: sample.secondFromStart },
      {
        $set: {
          runId,
          timestamp,
          secondFromStart: sample.secondFromStart,
          activeUsers: sample.activeUsers,
          rps: safeCalls,
          calls: safeCalls,
          successes: sample.successes,
          errorCount: sample.errors,
          drops: sample.drops,
          timedOut: sample.timedOut,
          requestBytes: sample.requestBytes,
          responseBytes: sample.responseBytes,
          latency: sample.latency,
          process: sample.process,
          endpointBreakdown: sample.endpointBreakdown,
        },
      },
      { upsert: true }
    );

    const endpointCounterInc: Record<string, number> = {};
    const endpointCounterMax: Record<string, number> = {};
    for (const [endpoint, value] of Object.entries(sample.endpointBreakdown || {})) {
      const keyBase = `endpointCounters.${endpoint}`;
      endpointCounterInc[`${keyBase}.calls`] = value.calls;
      endpointCounterInc[`${keyBase}.successes`] = Math.max(0, value.calls - value.errors - value.drops);
      endpointCounterInc[`${keyBase}.errors`] = value.errors;
      endpointCounterInc[`${keyBase}.drops`] = value.drops;
      endpointCounterInc[`${keyBase}.latencySumMs`] = value.avgLatencyMs * value.calls;
      endpointCounterMax[`${keyBase}.latencyMaxMs`] = value.maxLatencyMs;
    }

    const update: Record<string, unknown> = {
      $inc: {
        'counters.totalCalls': safeCalls,
        'counters.successCalls': sample.successes,
        'counters.errorCalls': sample.errors,
        'counters.droppedCalls': sample.drops,
        'counters.timedOutCalls': sample.timedOut,
        'counters.retriedCalls': sample.retried,
        'counters.totalRequestBytes': sample.requestBytes,
        'counters.totalResponseBytes': sample.responseBytes,
        'counters.latencySumMs': avgLatency * safeCalls,
        ...endpointCounterInc,
      },
      $max: {
        'counters.latencyMaxMs': sample.latency.maxMs,
        ...endpointCounterMax,
      },
      $set: {
        'counters.p50Ms': sample.latency.p50Ms,
        'counters.p95Ms': sample.latency.p95Ms,
        'counters.p99Ms': sample.latency.p99Ms,
      },
    };

    await StressRunModel.updateOne({ _id: runId }, update);
  }

  static async addHostMetrics(
    runId: string,
    secondFromStart: number,
    host: { cpuPercent?: number; memoryPercent?: number; rxBytesPerSec?: number; txBytesPerSec?: number }
  ): Promise<void> {
    await connectMongo();
    await StressRunSampleModel.updateOne(
      { runId, secondFromStart },
      {
        $set: {
          'host.cpuPercent': host.cpuPercent,
          'host.memoryPercent': host.memoryPercent,
          'host.rxBytesPerSec': host.rxBytesPerSec,
          'host.txBytesPerSec': host.txBytesPerSec,
        },
      }
    );
  }

  static async getRun(runId: string) {
    await connectMongo();
    return (await StressRunModel.findById(runId).lean()) as any;
  }

  static async listRuns(limit = 20) {
    await connectMongo();
    return (await StressRunModel.find({})
      .sort({ createdAt: -1 })
      .limit(Math.max(1, Math.min(100, limit)))
      .lean()) as any[];
  }

  static async getRunSamples(runId: string, limit = 2000) {
    await connectMongo();
    return (await StressRunSampleModel.find({ runId })
      .sort({ secondFromStart: 1 })
      .limit(Math.max(1, Math.min(20_000, limit)))
      .lean()) as any[];
  }
}
