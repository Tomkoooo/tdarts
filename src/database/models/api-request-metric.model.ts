import mongoose, { Document, Schema } from 'mongoose';

export interface IApiRequestMetric extends Document {
  bucket: Date;
  routeKey: string;
  method: string;
  count: number;
  errorCount: number;
  totalDurationMs: number;
  maxDurationMs: number;
  totalRequestBytes: number;
  maxRequestBytes: number;
  totalResponseBytes: number;
  maxResponseBytes: number;
  createdAt: Date;
  updatedAt: Date;
}

const ApiRequestMetricSchema = new Schema<IApiRequestMetric>(
  {
    bucket: { type: Date, required: true, index: true },
    routeKey: { type: String, required: true, index: true },
    method: { type: String, required: true, index: true },
    count: { type: Number, required: true, default: 0 },
    errorCount: { type: Number, required: true, default: 0 },
    totalDurationMs: { type: Number, required: true, default: 0 },
    maxDurationMs: { type: Number, required: true, default: 0 },
    totalRequestBytes: { type: Number, required: true, default: 0 },
    maxRequestBytes: { type: Number, required: true, default: 0 },
    totalResponseBytes: { type: Number, required: true, default: 0 },
    maxResponseBytes: { type: Number, required: true, default: 0 },
  },
  {
    collection: 'api_request_metrics',
    timestamps: true,
  }
);

ApiRequestMetricSchema.index({ bucket: 1, routeKey: 1, method: 1 }, { unique: true });
ApiRequestMetricSchema.index({ bucket: -1, routeKey: 1 });

export const ApiRequestMetricModel =
  mongoose.models.ApiRequestMetric ||
  mongoose.model<IApiRequestMetric>('ApiRequestMetric', ApiRequestMetricSchema);
