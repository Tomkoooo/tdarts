import mongoose, { Document, Schema } from 'mongoose';

export type StressRunStatus = 'queued' | 'running' | 'completed' | 'stopped' | 'failed';
export type StressTargetEnvironment = 'production' | 'staging' | 'custom';
export type StressEndpointProfile = 'session_full_match' | 'session_safe_match';

export interface IStressRun extends Document {
  name: string;
  status: StressRunStatus;
  startedAt?: Date;
  endedAt?: Date;
  requestedByUserId: string;
  target: {
    environment: StressTargetEnvironment;
    baseUrl: string;
    locale: string;
    tournamentCode: string;
    sandboxOnly: boolean;
  };
  config: {
    users: number;
    durationSeconds: number;
    rampUpSeconds: number;
    requestTimeoutMs: number;
    retryCount: number;
    parallelTournamentTest?: boolean;
    parallelTournamentCount?: number;
    clubId?: string;
    endpointProfile: StressEndpointProfile;
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
  sandbox: {
    tournamentId: mongoose.Types.ObjectId;
    matchIds: mongoose.Types.ObjectId[];
    playerIds: mongoose.Types.ObjectId[];
  };
  safeguards: {
    productionConfirmed: boolean;
    maxUsersApplied: number;
    maxDurationAppliedSeconds: number;
    circuitBreakerErrorRatePercent: number;
  };
  counters: {
    totalCalls: number;
    successCalls: number;
    errorCalls: number;
    droppedCalls: number;
    timedOutCalls: number;
    retriedCalls: number;
    totalRequestBytes: number;
    totalResponseBytes: number;
    latencySumMs: number;
    latencyMaxMs: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
  };
  endpointCounters: Record<string, {
    calls: number;
    successes: number;
    errors: number;
    drops: number;
    latencySumMs: number;
    latencyMaxMs: number;
  }>;
  notes?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StressRunSchema = new Schema<IStressRun>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    status: {
      type: String,
      required: true,
      enum: ['queued', 'running', 'completed', 'stopped', 'failed'],
      default: 'queued',
      index: true,
    },
    startedAt: { type: Date, index: true },
    endedAt: { type: Date, index: true },
    requestedByUserId: { type: String, required: true, index: true },
    target: {
      environment: {
        type: String,
        required: true,
        enum: ['production', 'staging', 'custom'],
      },
      baseUrl: { type: String, required: true },
      locale: { type: String, required: true, default: 'hu' },
      tournamentCode: { type: String, required: true, uppercase: true, trim: true, index: true },
      sandboxOnly: { type: Boolean, required: true, default: true },
    },
    config: {
      users: { type: Number, required: true, min: 1, max: 1000 },
      durationSeconds: { type: Number, required: true, min: 10, max: 3600 },
      rampUpSeconds: { type: Number, required: true, min: 0, max: 600, default: 0 },
      requestTimeoutMs: { type: Number, required: true, min: 250, max: 120_000, default: 10_000 },
      retryCount: { type: Number, required: true, min: 0, max: 5, default: 0 },
      parallelTournamentTest: { type: Boolean, default: false },
      parallelTournamentCount: { type: Number, min: 1, max: 20, default: 1 },
      clubId: { type: String, trim: true, default: '' },
      endpointProfile: {
        type: String,
        required: true,
        enum: ['session_full_match', 'session_safe_match'],
        default: 'session_full_match',
      },
      weights: {
        tournamentGet: { type: Number, required: true, default: 25 },
        avatarGet: { type: Number, required: true, default: 15 },
        matchGet: { type: Number, required: true, default: 20 },
        knockoutGet: { type: Number, required: true, default: 15 },
        tournamentPageGet: { type: Number, required: true, default: 20 },
        matchFinishLegPost: { type: Number, required: true, default: 4 },
        matchFinishPost: { type: Number, required: true, default: 3 },
        matchUndoLegPost: { type: Number, required: true, default: 2 },
        matchUpdatePlayerPost: { type: Number, required: true, default: 2 },
        matchUpdateBoardStatusPost: { type: Number, required: true, default: 3 },
        matchUpdateSettingsPost: { type: Number, required: true, default: 2 },
        tournamentGenerateGroupsPost: { type: Number, required: true, default: 2 },
        tournamentGenerateKnockoutPost: { type: Number, required: true, default: 2 },
        tournamentFinishPost: { type: Number, required: true, default: 1 },
      },
    },
    sandbox: {
      tournamentId: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true, index: true },
      matchIds: [{ type: Schema.Types.ObjectId, ref: 'Match', required: true }],
      playerIds: [{ type: Schema.Types.ObjectId, ref: 'Player', required: true }],
    },
    safeguards: {
      productionConfirmed: { type: Boolean, required: true, default: false },
      maxUsersApplied: { type: Number, required: true, default: 1000 },
      maxDurationAppliedSeconds: { type: Number, required: true, default: 600 },
      circuitBreakerErrorRatePercent: { type: Number, required: true, default: 45 },
    },
    counters: {
      totalCalls: { type: Number, required: true, default: 0 },
      successCalls: { type: Number, required: true, default: 0 },
      errorCalls: { type: Number, required: true, default: 0 },
      droppedCalls: { type: Number, required: true, default: 0 },
      timedOutCalls: { type: Number, required: true, default: 0 },
      retriedCalls: { type: Number, required: true, default: 0 },
      totalRequestBytes: { type: Number, required: true, default: 0 },
      totalResponseBytes: { type: Number, required: true, default: 0 },
      latencySumMs: { type: Number, required: true, default: 0 },
      latencyMaxMs: { type: Number, required: true, default: 0 },
      p50Ms: { type: Number, required: true, default: 0 },
      p95Ms: { type: Number, required: true, default: 0 },
      p99Ms: { type: Number, required: true, default: 0 },
    },
    endpointCounters: { type: Schema.Types.Mixed, default: {} },
    notes: { type: String },
    errorMessage: { type: String },
  },
  {
    collection: 'stress_runs',
    timestamps: true,
  }
);

StressRunSchema.index({ createdAt: -1 });
StressRunSchema.index({ status: 1, createdAt: -1 });
StressRunSchema.index({ requestedByUserId: 1, createdAt: -1 });
StressRunSchema.index({ 'target.tournamentCode': 1, createdAt: -1 });

export const StressRunModel =
  mongoose.models.StressRun ||
  mongoose.model<IStressRun>('StressRun', StressRunSchema);
