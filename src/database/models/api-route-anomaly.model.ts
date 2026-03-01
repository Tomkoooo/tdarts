import mongoose, { Document, Schema } from 'mongoose';

export type ApiRouteAnomalySignal = 'calls' | 'traffic' | 'latency';

export interface IApiRouteAnomaly extends Document {
  routeKey: string;
  method: string;
  signal: ApiRouteAnomalySignal;
  currentValue: number;
  baselineValue: number;
  ratio: number;
  isActive: boolean;
  firstDetectedAt: Date;
  lastDetectedAt: Date;
  lastObservedAt: Date;
  lastRealtimeEmailAt?: Date;
  lastDigestEmailAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApiRouteAnomalySchema = new Schema<IApiRouteAnomaly>(
  {
    routeKey: { type: String, required: true, index: true },
    method: { type: String, required: true, index: true },
    signal: { type: String, enum: ['calls', 'traffic', 'latency'], required: true, index: true },
    currentValue: { type: Number, required: true, default: 0 },
    baselineValue: { type: Number, required: true, default: 0 },
    ratio: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, required: true, default: true, index: true },
    firstDetectedAt: { type: Date, required: true, default: Date.now },
    lastDetectedAt: { type: Date, required: true, default: Date.now },
    lastObservedAt: { type: Date, required: true, default: Date.now, index: true },
    lastRealtimeEmailAt: { type: Date },
    lastDigestEmailAt: { type: Date },
  },
  {
    collection: 'api_route_anomalies',
    timestamps: true,
  }
);

ApiRouteAnomalySchema.index({ routeKey: 1, method: 1, signal: 1 }, { unique: true });
ApiRouteAnomalySchema.index({ isActive: 1, ratio: -1, lastObservedAt: -1 });

export const ApiRouteAnomalyModel =
  mongoose.models.ApiRouteAnomaly ||
  mongoose.model<IApiRouteAnomaly>('ApiRouteAnomaly', ApiRouteAnomalySchema);
