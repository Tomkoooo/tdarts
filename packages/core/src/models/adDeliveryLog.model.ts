import mongoose, { Document, Schema } from 'mongoose';

export interface AdDeliveryLogDocument extends Document {
  campaignId?: mongoose.Types.ObjectId;
  creativeId?: mongoose.Types.ObjectId;
  slotId: string;
  placementKey: string;
  actorType: 'user' | 'session';
  actorIdHash: string;
  sessionId: string;
  served: boolean;
  noFillReason?: string;
  decisionLatencyMs: number;
  impressionAt: Date;
  decisionId: string;
}

const adDeliveryLogSchema = new Schema<AdDeliveryLogDocument>(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: 'AdCampaign', default: null, index: true },
    creativeId: { type: Schema.Types.ObjectId, ref: 'AdCreative', default: null, index: true },
    slotId: { type: String, required: true, index: true },
    placementKey: { type: String, required: true, index: true },
    actorType: { type: String, required: true, enum: ['user', 'session'], index: true },
    actorIdHash: { type: String, required: true, index: true },
    sessionId: { type: String, required: true, index: true },
    served: { type: Boolean, required: true, index: true },
    noFillReason: { type: String, default: '' },
    decisionLatencyMs: { type: Number, required: true, min: 0, max: 60000 },
    impressionAt: { type: Date, required: true, index: true },
    decisionId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

adDeliveryLogSchema.index({ actorIdHash: 1, campaignId: 1, impressionAt: -1 });
adDeliveryLogSchema.index({ campaignId: 1, creativeId: 1, impressionAt: -1 });

export const AdDeliveryLogModel =
  mongoose.models.AdDeliveryLog || mongoose.model<AdDeliveryLogDocument>('AdDeliveryLog', adDeliveryLogSchema);
