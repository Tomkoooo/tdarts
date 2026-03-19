import mongoose, { Document, Schema } from 'mongoose';

export type TelemetrySource = 'api' | 'action' | 'page';
export type TelemetryOperationClass = 'read' | 'write' | 'other';

export interface IApiRequestMetric extends Document {
  bucket: Date;
  routeKey: string;
  method: string;
  source: TelemetrySource;
  operationClass: TelemetryOperationClass;
  count: number;
  errorCount: number;
  timeoutCount: number;
  totalDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  durationHistogram: number[];
  totalRequestBytes: number;
  minRequestBytes: number;
  maxRequestBytes: number;
  totalResponseBytes: number;
  minResponseBytes: number;
  maxResponseBytes: number;
  pageLoadMetrics: {
    ttfbTotalMs: number;
    ttfbMinMs: number;
    ttfbMaxMs: number;
    fcpTotalMs: number;
    fcpMinMs: number;
    fcpMaxMs: number;
    lcpTotalMs: number;
    lcpMinMs: number;
    lcpMaxMs: number;
    inpTotalMs: number;
    inpMinMs: number;
    inpMaxMs: number;
    sampleCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ApiRequestMetricSchema = new Schema<IApiRequestMetric>(
  {
    bucket: { type: Date, required: true },
    routeKey: { type: String, required: true, index: true },
    method: { type: String, required: true, index: true },
    source: {
      type: String,
      enum: ['api', 'action', 'page'],
      required: true,
      default: 'api',
      index: true,
    },
    operationClass: {
      type: String,
      enum: ['read', 'write', 'other'],
      required: true,
      default: 'other',
      index: true,
    },
    count: { type: Number, required: true, default: 0 },
    errorCount: { type: Number, required: true, default: 0 },
    timeoutCount: { type: Number, required: true, default: 0 },
    totalDurationMs: { type: Number, required: true, default: 0 },
    minDurationMs: { type: Number, required: true, default: Number.MAX_SAFE_INTEGER },
    maxDurationMs: { type: Number, required: true, default: 0 },
    durationHistogram: {
      type: [Number],
      required: true,
      default: () => Array.from({ length: 10 }, () => 0),
    },
    totalRequestBytes: { type: Number, required: true, default: 0 },
    minRequestBytes: { type: Number, required: true, default: Number.MAX_SAFE_INTEGER },
    maxRequestBytes: { type: Number, required: true, default: 0 },
    totalResponseBytes: { type: Number, required: true, default: 0 },
    minResponseBytes: { type: Number, required: true, default: Number.MAX_SAFE_INTEGER },
    maxResponseBytes: { type: Number, required: true, default: 0 },
    pageLoadMetrics: {
      ttfbTotalMs: { type: Number, required: true, default: 0 },
      ttfbMinMs: { type: Number, required: true, default: Number.MAX_SAFE_INTEGER },
      ttfbMaxMs: { type: Number, required: true, default: 0 },
      fcpTotalMs: { type: Number, required: true, default: 0 },
      fcpMinMs: { type: Number, required: true, default: Number.MAX_SAFE_INTEGER },
      fcpMaxMs: { type: Number, required: true, default: 0 },
      lcpTotalMs: { type: Number, required: true, default: 0 },
      lcpMinMs: { type: Number, required: true, default: Number.MAX_SAFE_INTEGER },
      lcpMaxMs: { type: Number, required: true, default: 0 },
      inpTotalMs: { type: Number, required: true, default: 0 },
      inpMinMs: { type: Number, required: true, default: Number.MAX_SAFE_INTEGER },
      inpMaxMs: { type: Number, required: true, default: 0 },
      sampleCount: { type: Number, required: true, default: 0 },
    },
  },
  {
    collection: 'api_request_metrics',
    timestamps: true,
  }
);

ApiRequestMetricSchema.index({ bucket: 1, routeKey: 1, method: 1, source: 1, operationClass: 1 }, { unique: true });
ApiRequestMetricSchema.index({ bucket: -1, source: 1, routeKey: 1 });
ApiRequestMetricSchema.index({ bucket: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export const ApiRequestMetricModel =
  mongoose.models.ApiRequestMetric ||
  mongoose.model<IApiRequestMetric>('ApiRequestMetric', ApiRequestMetricSchema);
