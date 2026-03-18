import mongoose, { Schema } from 'mongoose';

export interface IStressRunSample {
  runId: mongoose.Types.ObjectId;
  timestamp: Date;
  secondFromStart: number;
  activeUsers: number;
  rps: number;
  calls: number;
  successes: number;
  errorCount: number;
  drops: number;
  timedOut: number;
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
  host?: {
    cpuPercent?: number;
    memoryPercent?: number;
    rxBytesPerSec?: number;
    txBytesPerSec?: number;
  };
  endpointBreakdown: Record<string, {
    calls: number;
    errors: number;
    drops: number;
    avgLatencyMs: number;
    maxLatencyMs: number;
  }>;
}

const StressRunSampleSchema = new Schema<IStressRunSample>(
  {
    runId: { type: Schema.Types.ObjectId, ref: 'StressRun', required: true, index: true },
    timestamp: { type: Date, required: true, index: true },
    secondFromStart: { type: Number, required: true, min: 0, index: true },
    activeUsers: { type: Number, required: true, min: 0, default: 0 },
    rps: { type: Number, required: true, min: 0, default: 0 },
    calls: { type: Number, required: true, min: 0, default: 0 },
    successes: { type: Number, required: true, min: 0, default: 0 },
    errorCount: { type: Number, required: true, min: 0, default: 0 },
    drops: { type: Number, required: true, min: 0, default: 0 },
    timedOut: { type: Number, required: true, min: 0, default: 0 },
    requestBytes: { type: Number, required: true, min: 0, default: 0 },
    responseBytes: { type: Number, required: true, min: 0, default: 0 },
    latency: {
      avgMs: { type: Number, required: true, default: 0 },
      maxMs: { type: Number, required: true, default: 0 },
      p50Ms: { type: Number, required: true, default: 0 },
      p95Ms: { type: Number, required: true, default: 0 },
      p99Ms: { type: Number, required: true, default: 0 },
    },
    process: {
      cpuPercent: { type: Number, required: true, default: 0 },
      rssMb: { type: Number, required: true, default: 0 },
      heapUsedMb: { type: Number, required: true, default: 0 },
      heapTotalMb: { type: Number, required: true, default: 0 },
      eventLoopLagMs: { type: Number, required: true, default: 0 },
    },
    host: {
      cpuPercent: { type: Number },
      memoryPercent: { type: Number },
      rxBytesPerSec: { type: Number },
      txBytesPerSec: { type: Number },
    },
    endpointBreakdown: { type: Schema.Types.Mixed, default: {} },
  },
  {
    collection: 'stress_run_samples',
    timestamps: true,
  }
);

StressRunSampleSchema.index({ runId: 1, secondFromStart: 1 }, { unique: true });
StressRunSampleSchema.index({ runId: 1, timestamp: 1 });
StressRunSampleSchema.index({ createdAt: -1 });

export const StressRunSampleModel =
  mongoose.models.StressRunSample ||
  mongoose.model<IStressRunSample>('StressRunSample', StressRunSampleSchema);
