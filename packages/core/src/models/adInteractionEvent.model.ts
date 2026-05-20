import mongoose, { Document, Schema } from 'mongoose';

export type AdInteractionType = 'click' | 'hover' | 'mouseenter' | 'dismiss' | 'viewability';

export interface AdInteractionEventDocument extends Document {
  campaignId: mongoose.Types.ObjectId;
  creativeId: mongoose.Types.ObjectId;
  eventType: AdInteractionType;
  actorType: 'user' | 'session';
  actorIdHash: string;
  sessionId: string;
  pagePath: string;
  eventAt: Date;
  metadata?: Record<string, unknown>;
}

const adInteractionEventSchema = new Schema<AdInteractionEventDocument>(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: 'AdCampaign', required: true, index: true },
    creativeId: { type: Schema.Types.ObjectId, ref: 'AdCreative', required: true, index: true },
    eventType: {
      type: String,
      required: true,
      enum: ['click', 'hover', 'mouseenter', 'dismiss', 'viewability'],
      index: true,
    },
    actorType: { type: String, required: true, enum: ['user', 'session'], index: true },
    actorIdHash: { type: String, required: true, index: true },
    sessionId: { type: String, required: true, index: true },
    pagePath: { type: String, required: true, index: true },
    eventAt: { type: Date, required: true, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

adInteractionEventSchema.index({ creativeId: 1, eventType: 1, eventAt: -1 });

export const AdInteractionEventModel =
  mongoose.models.AdInteractionEvent ||
  mongoose.model<AdInteractionEventDocument>('AdInteractionEvent', adInteractionEventSchema);
