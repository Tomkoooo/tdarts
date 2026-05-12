import mongoose, { Document, Schema } from 'mongoose';

export interface AdMetricsAggHourlyDocument extends Document {
  hourBucket: Date;
  campaignId?: mongoose.Types.ObjectId;
  creativeId?: mongoose.Types.ObjectId;
  slotId: string;
  eventType: string;
  impressions: number;
  uniqueActors: number;
  clicks: number;
  interactions: number;
  avgDecisionLatencyMs: number;
  avgRenderMs: number;
}

const adMetricsAggHourlySchema = new Schema<AdMetricsAggHourlyDocument>(
  {
    hourBucket: { type: Date, required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'AdCampaign', default: null, index: true },
    creativeId: { type: Schema.Types.ObjectId, ref: 'AdCreative', default: null, index: true },
    slotId: { type: String, required: true, index: true },
    eventType: { type: String, required: true, index: true },
    impressions: { type: Number, default: 0, min: 0 },
    uniqueActors: { type: Number, default: 0, min: 0 },
    clicks: { type: Number, default: 0, min: 0 },
    interactions: { type: Number, default: 0, min: 0 },
    avgDecisionLatencyMs: { type: Number, default: 0, min: 0 },
    avgRenderMs: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

adMetricsAggHourlySchema.index(
  { hourBucket: 1, campaignId: 1, creativeId: 1, slotId: 1, eventType: 1 },
  { unique: true, name: 'uniq_ad_hourly_dimension' }
);

export const AdMetricsAggHourlyModel =
  mongoose.models.AdMetricsAggHourly ||
  mongoose.model<AdMetricsAggHourlyDocument>('AdMetricsAggHourly', adMetricsAggHourlySchema);
